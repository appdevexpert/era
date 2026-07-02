import AddComment from "@/app/components/common/AddComment";
import GlassFill from "@/app/components/common/GlassFill";
import PrimaryButton from "@/app/components/common/PrimaryButton";
import { FONTS } from "@/app/constants/fonts";
import { ChevronBack, TablerPlus } from "@/assets/icons";
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetScrollViewMethods,
} from "@gorhom/bottom-sheet";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import PressableScale from "@/app/components/common/PressableScale";
import Animated, {
  Easing,
  useAnimatedKeyboard,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";

export interface AddLogMealBottomSheetRef {
  show: () => void;
  hide: () => void;
}

export type MealTag = "breakfast" | "lunch" | "eveningSnack" | "dinner";

export interface SavedMealItem {
  name: string;
  servingSize: string;
  units: string;
}

export interface SaveMealPayload {
  tag: MealTag;
  /** All items the user added in this sheet — at least 1 by the time Save fires. */
  items: SavedMealItem[];
  comments: string;
}

const TAGS: MealTag[] = ["breakfast", "lunch", "eveningSnack", "dinner"];

const SELECT_DURATION = 220;
const SELECT_EASING = Easing.bezier(0.32, 0.72, 0.32, 1);

/**
 * Animated meal-category chip — Figma node 5818:3137.
 * Cross-fades a dark glass background and a solid gold background as the
 * selection state changes. Adds a subtle scale-down on press for tactile
 * feedback. Pure reanimated worklets — no JS-side state interpolation.
 */
const MealTagChip = ({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) => {
  const selected = useSharedValue(active ? 1 : 0);
  const pressed = useSharedValue(0);

  useEffect(() => {
    selected.value = withTiming(active ? 1 : 0, {
      duration: SELECT_DURATION,
      easing: SELECT_EASING,
    });
  }, [active, selected]);

  const goldStyle = useAnimatedStyle(() => ({
    opacity: selected.value,
  }));

  const inactiveStyle = useAnimatedStyle(() => ({
    opacity: 1 - selected.value,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.04 }],
  }));

  return (
    <Animated.View style={containerStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          pressed.value = withSpring(1, { mass: 0.4, damping: 14, stiffness: 220 });
        }}
        onPressOut={() => {
          pressed.value = withSpring(0, { mass: 0.4, damping: 14, stiffness: 220 });
        }}
        style={styles.tagChip}
      >
        {/* Inactive layer: glass + dark tint, fades out as the chip activates. */}
        <Animated.View style={[StyleSheet.absoluteFill, inactiveStyle]}>
          <GlassFill style={styles.tagGlass} />
          <View style={styles.tagInactiveTint} pointerEvents="none" />
        </Animated.View>
        {/* Active layer: solid gold, fades in. */}
        <Animated.View
          style={[styles.tagChipActive, StyleSheet.absoluteFill, goldStyle]}
          pointerEvents="none"
        />
        <Text style={styles.tagText}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
};

// Food serving units shown when "Select Units" is tapped.
const UNIT_OPTIONS: { value: string; label: string }[] = [
  { value: "g", label: "g (grams)" },
  { value: "kg", label: "kg (kilograms)" },
  { value: "ml", label: "ml (milliliters)" },
  { value: "L", label: "L (liters)" },
  { value: "oz", label: "oz (ounces)" },
  { value: "cup", label: "cup" },
  { value: "tbsp", label: "tbsp (tablespoon)" },
  { value: "tsp", label: "tsp (teaspoon)" },
  { value: "piece", label: "piece" },
  { value: "slice", label: "slice" },
  { value: "serving", label: "serving" },
];

interface AddLogMealBottomSheetProps {
  /**
   * Async save handler. The parent runs the AI estimate + Redux dispatch.
   * Throw an Error to surface a user-visible message inside the sheet.
   */
  onSave?: (payload: SaveMealPayload) => Promise<void>;
}

const AddLogMealBottomSheet = forwardRef<AddLogMealBottomSheetRef, AddLogMealBottomSheetProps>(
  function AddLogMealBottomSheet({ onSave }, ref) {
    const { t } = useTranslation();
    const sheetRef = useRef<BottomSheetModal>(null);
    const scrollRef = useRef<BottomSheetScrollViewMethods>(null);
    // Whether the Comments field (the bottom-most input) currently has focus, and
    // the last measured content height — used to keep the field pinned above the
    // keyboard while it rises (see handleContentSizeChange).
    const commentFocused = useRef(false);
    const lastContentHeight = useRef(0);
    // Keyboard height as a reanimated shared value. It tracks the real OS
    // keyboard animation and works under Android edgeToEdge (where `adjustResize`
    // is disabled). Drives a spacer at the bottom of the scroll content so the
    // bottom-most field can be scrolled clear of the keyboard.
    // Translucent bar flags → correct keyboard height under Android edgeToEdge.
    const keyboard = useAnimatedKeyboard({
      isStatusBarTranslucentAndroid: true,
      isNavigationBarTranslucentAndroid: true,
    });
    const keyboardSpacerStyle = useAnimatedStyle(() => ({
      height: keyboard.height.value,
    }));

    const [selectedTag, setSelectedTag] = useState<MealTag | null>(null);
    const [itemName, setItemName] = useState("");
    const [servingSize, setServingSize] = useState("");
    const [units, setUnits] = useState("");
    const [unitsOpen, setUnitsOpen] = useState(false);
    const [comments, setComments] = useState("");
    const [stagedItems, setStagedItems] = useState<SavedMealItem[]>([]);
    // Index of the chip currently loaded in the form for editing.
    // null = the form represents a *new* item that will append on add.
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const clearItemFields = useCallback(() => {
      setItemName("");
      setServingSize("");
      setUnits("");
      setUnitsOpen(false);
    }, []);

    const resetForm = useCallback(() => {
      setSelectedTag(null);
      clearItemFields();
      setComments("");
      setStagedItems([]);
      setEditingIndex(null);
      setError(null);
    }, [clearItemFields]);

    // Build the canonical items list to send when saving — handles three
    // cases:
    //   - editing a chip + form has content → replace that chip in-place
    //   - new draft (editing=null) + form has content → append as a final item
    //   - form empty → just the existing staged list
    const composeItemsForSave = useCallback((): SavedMealItem[] => {
      const trimmed = itemName.trim();
      if (!trimmed) return stagedItems;
      const draft: SavedMealItem = {
        name: trimmed,
        servingSize: servingSize.trim(),
        units,
      };
      if (editingIndex !== null) {
        const copy = [...stagedItems];
        copy[editingIndex] = draft;
        return copy;
      }
      return [...stagedItems, draft];
    }, [editingIndex, itemName, servingSize, stagedItems, units]);

    // "+ Add Item" when editingIndex === null, "Update Item" otherwise.
    const handleUpsertItem = useCallback(() => {
      const trimmed = itemName.trim();
      if (!trimmed) {
        setError("Add a name for the item first.");
        return;
      }
      setError(null);
      const draft: SavedMealItem = {
        name: trimmed,
        servingSize: servingSize.trim(),
        units,
      };
      if (editingIndex !== null) {
        setStagedItems((prev) => prev.map((it, i) => (i === editingIndex ? draft : it)));
      } else {
        setStagedItems((prev) => [...prev, draft]);
      }
      setEditingIndex(null);
      clearItemFields();
    }, [clearItemFields, editingIndex, itemName, servingSize, units]);

    // Tap a chip → load its values into the form. If the user was already
    // editing a different chip and had unsaved field content, stash that
    // back into its slot first so no edits are lost.
    const handleSelectChip = useCallback(
      (index: number) => {
        if (index === editingIndex) return; // already editing — no-op
        const trimmed = itemName.trim();
        let next = stagedItems;
        if (trimmed && editingIndex !== null) {
          next = stagedItems.map((it, i) =>
            i === editingIndex
              ? { name: trimmed, servingSize: servingSize.trim(), units }
              : it,
          );
          setStagedItems(next);
        }
        const target = next[index];
        if (!target) return;
        setItemName(target.name);
        setServingSize(target.servingSize);
        setUnits(target.units);
        setEditingIndex(index);
        setError(null);
      },
      [editingIndex, itemName, servingSize, stagedItems, units],
    );

    const handleRemoveStagedItem = useCallback(
      (index: number) => {
        setStagedItems((prev) => prev.filter((_, i) => i !== index));
        // If we delete the chip currently loaded for editing, clear the
        // form so the user isn't stranded mid-edit. Other indices shift
        // down by one when the deleted one was earlier in the list.
        setEditingIndex((curr) => {
          if (curr === null) return null;
          if (curr === index) {
            clearItemFields();
            return null;
          }
          return curr > index ? curr - 1 : curr;
        });
      },
      [clearItemFields],
    );

    useImperativeHandle(ref, () => ({
      show: () => sheetRef.current?.present(),
      hide: () => sheetRef.current?.dismiss(),
    }));

    // Keep the bottom of the form pinned to the keyboard while it rises. The
    // reanimated spacer grows the content height frame-by-frame as the keyboard
    // opens; each growth we snap the scroll to the end so the Comments field
    // travels up *with* the keyboard as one motion (no jump-after-delay). Guarded
    // to growth only, so an interactive drag-down to dismiss isn't fought.
    const handleContentSizeChange = useCallback((_w: number, height: number) => {
      const grew = height > lastContentHeight.current;
      lastContentHeight.current = height;
      if (commentFocused.current && grew) {
        scrollRef.current?.scrollToEnd({ animated: false });
      }
    }, []);

    // Comments is the bottom-most field. On focus, immediately scroll it into
    // view (covers the keyboard-already-open case); the content-size handler
    // above keeps it pinned as the keyboard finishes rising (cold-open case).
    const handleCommentFocus = useCallback(() => {
      commentFocused.current = true;
      scrollRef.current?.scrollToEnd({ animated: true });
    }, []);

    const handleCommentBlur = useCallback(() => {
      commentFocused.current = false;
    }, []);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.6}
          pressBehavior="close"
        />
      ),
      [],
    );

    // Save needs a tag + at least one item (staged OR currently typed).
    const canSave =
      !!selectedTag &&
      !saving &&
      (stagedItems.length > 0 || itemName.trim().length > 0);

    const handleSave = useCallback(async () => {
      if (!selectedTag) return;
      const items = composeItemsForSave();
      if (items.length === 0) return;
      setSaving(true);
      setError(null);
      try {
        await onSave?.({
          tag: selectedTag,
          items,
          comments: comments.trim(),
        });
        resetForm();
        sheetRef.current?.dismiss();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save meal.");
      } finally {
        setSaving(false);
      }
    }, [comments, composeItemsForSave, onSave, resetForm, selectedTag]);

    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={["92%"]}
        enablePanDownToClose
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.handle}
        onDismiss={() => ExpoSpeechRecognitionModule.stop()}
      >
        <BottomSheetScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={handleContentSizeChange}
        >
          {/* Header */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>{t("nutrition.logMealSheet.title")}</Text>
          </View>

          <View style={styles.body}>
            {/* Tags */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t("nutrition.logMealSheet.tags")}</Text>
              <View style={styles.tagRow}>
                {TAGS.map((tag) => {
                  const active = selectedTag === tag;
                  return (
                    <MealTagChip
                      key={tag}
                      label={t(`nutrition.${tag}`)}
                      active={active}
                      onPress={() => setSelectedTag(active ? null : tag)}
                    />
                  );
                })}
              </View>
            </View>

            {/* Items in this meal */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t("nutrition.logMealSheet.itemsInMeal")}</Text>

              {stagedItems.length > 0 ? (
                <View style={styles.stagedList}>
                  {stagedItems.map((item, index) => {
                    const portion = [item.servingSize, item.units]
                      .filter(Boolean)
                      .join(" ")
                      .trim();
                    const label = portion ? `${item.name} (${portion})` : item.name;
                    const isEditing = editingIndex === index;
                    return (
                      <PressableScale
                        key={`${item.name}-${index}`}
                        onPress={() => handleSelectChip(index)}
                        style={[
                          styles.stagedRow,
                          isEditing && styles.stagedRowEditing,
                        ]}
                      >
                        <Text style={styles.stagedText} numberOfLines={1}>
                          {label}
                        </Text>
                        <PressableScale
                          onPress={() => handleRemoveStagedItem(index)}
                          hitSlop={8}
                          style={styles.stagedRemoveBtn}
                        >
                          <Text style={styles.stagedRemoveText}>×</Text>
                        </PressableScale>
                      </PressableScale>
                    );
                  })}
                </View>
              ) : null}

              {/* Plain RN TextInput — NOT gorhom's BottomSheetTextInput — on
                  purpose. BottomSheetTextInput writes gorhom's internal
                  animatedKeyboardState shared value on focus/blur, which races
                  the sheet dismiss animation on iOS → NaN in a worklet → native
                  crash. Same reasoning as AddComment.tsx. Focusing also closes
                  the units dropdown so it can't sit open behind the keyboard. */}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{t("nutrition.logMealSheet.itemName")}</Text>
                <TextInput
                  value={itemName}
                  onChangeText={setItemName}
                  onFocus={() => setUnitsOpen(false)}
                  placeholder={t("nutrition.logMealSheet.itemNamePlaceholder")}
                  placeholderTextColor="rgba(240,240,240,0.5)"
                  style={styles.input}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.field, styles.flex1]}>
                  <Text style={styles.fieldLabel}>{t("nutrition.logMealSheet.servingSize")}</Text>
                  <TextInput
                    value={servingSize}
                    onChangeText={setServingSize}
                    onFocus={() => setUnitsOpen(false)}
                    placeholder={t("nutrition.logMealSheet.servingSizePlaceholder")}
                    placeholderTextColor="rgba(240,240,240,0.5)"
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </View>
                <View style={[styles.field, styles.flex1]}>
                  <Text style={styles.fieldLabel}>{t("nutrition.logMealSheet.units")}</Text>
                  <PressableScale
                    onPress={() => {
                      // Drop the keyboard before showing the inline list — otherwise
                      // the list opens behind the still-up keyboard when the user
                      // is coming from the Serving Size input.
                      Keyboard.dismiss();
                      setUnitsOpen((open) => !open);
                    }}
                    style={[styles.input, styles.dropdownInput, unitsOpen && styles.dropdownInputOpen]}
                  >
                    <Text style={[styles.dropdownText, !units && styles.placeholderText]}>
                      {units || t("nutrition.logMealSheet.unitsPlaceholder")}
                    </Text>
                    <View style={[styles.chevron, unitsOpen ? styles.chevronUp : styles.chevronDown]}>
                      <ChevronBack width={20} height={20} color="rgba(240,240,240,0.5)" />
                    </View>
                  </PressableScale>
                </View>
              </View>

              {/* Units dropdown — inline expanded list */}
              {unitsOpen ? (
                <View style={styles.unitsList}>
                  {UNIT_OPTIONS.map((option) => {
                    const active = option.value === units;
                    return (
                      <PressableScale
                        key={option.value}
                        onPress={() => {
                          setUnits(option.value);
                          setUnitsOpen(false);
                        }}
                        style={[
                          styles.unitOption,
                          active && styles.unitOptionActive,
                        ]}
                      >
                        <Text style={[styles.unitOptionText, active && styles.unitOptionTextActive]}>
                          {option.label}
                        </Text>
                      </PressableScale>
                    );
                  })}
                </View>
              ) : null}

              <PressableScale
                onPress={handleUpsertItem}
                disabled={saving || itemName.trim().length === 0}
                style={[
                  styles.addItemButton,
                  (saving || itemName.trim().length === 0) && styles.addItemButtonDisabled,
                ]}
              >
                <TablerPlus width={14} height={14} color="#F0F0F0" />
                <Text style={styles.addItemText}>
                  {editingIndex !== null
                    ? t("nutrition.logMealSheet.updateItem")
                    : t("nutrition.logMealSheet.addItem")}
                </Text>
              </PressableScale>
            </View>

            {/* Comments — uses shared AddComment (plain TextInput + mic).
                See AddComment.tsx header for the reason we don't use
                BottomSheetTextInput here. */}
            <AddComment
              value={comments}
              onChangeText={setComments}
              onFocus={handleCommentFocus}
              onBlur={handleCommentBlur}
            />
          </View>

          {/* Save button + error */}
          <View style={styles.saveButtonWrap}>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <PrimaryButton
              label={t("nutrition.logMealSheet.saveMeal")}
              onPress={handleSave}
              disabled={!canSave}
              loading={saving}
            />
          </View>

          {/* Grows with the keyboard so scrollToEnd can lift the comment above it. */}
          <Animated.View style={keyboardSpacerStyle} />
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);

AddLogMealBottomSheet.displayName = "AddLogMealBottomSheet";

export default AddLogMealBottomSheet;

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: "#111111",
    borderTopLeftRadius: 38,
    borderTopRightRadius: 38,
    borderWidth: 1,
    borderColor: "#1E1E1E",
  },
  handle: {
    backgroundColor: "rgba(255,255,255,0.2)",
    width: 54,
    height: 4,
    borderRadius: 12345,
  },
  scrollContent: {
    paddingBottom: 42,
  },
  titleSection: {
    paddingTop: 8,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#1E1E1E",
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 22,
    fontWeight: "500",
    color: "#F0F0F0",
    lineHeight: 26.4,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 28,
  },
  section: {
    gap: 16,
  },
  sectionLabel: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
    lineHeight: 19.2,
  },

  // Tags — Figma node 5818:3137
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tagChip: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  tagGlass: {
    borderRadius: 999,
  },
  tagInactiveTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(38,38,38,0.25)",
    borderRadius: 999,
  },
  tagChipActive: {
    backgroundColor: "rgba(201,168,76,0.6)",
  },
  tagText: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: "#F0F0F0",
    lineHeight: 19.2,
  },

  // Fields
  field: {
    gap: 8,
  },
  fieldLabel: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    lineHeight: 16.8,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: "#1E1E1E",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 18.2,
    color: "#F0F0F0",
  },
  dropdownInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  dropdownInputOpen: {
    borderColor: "rgba(201,168,76,0.5)",
  },
  dropdownText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: "#F0F0F0",
  },
  placeholderText: {
    color: "rgba(240,240,240,0.5)",
  },
  chevron: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  chevronDown: {
    transform: [{ rotate: "-90deg" }],
  },
  chevronUp: {
    transform: [{ rotate: "90deg" }],
  },

  // Units dropdown expanded list
  unitsList: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: "#1E1E1E",
    borderRadius: 12,
    paddingVertical: 4,
    overflow: "hidden",
  },
  unitOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  unitOptionActive: {
    backgroundColor: "rgba(201,168,76,0.15)",
  },
  unitOptionText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 18.2,
    color: "#F0F0F0",
  },
  unitOptionTextActive: {
    color: "#C9A84C",
    fontFamily: FONTS.medium,
    fontWeight: "500",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  flex1: {
    flex: 1,
  },

  // Staged items list
  stagedList: {
    gap: 8,
  },
  stagedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "#1E1E1E",
    borderRadius: 10,
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 4,
  },
  stagedRowEditing: {
    borderColor: "rgba(201,168,76,0.6)",
    backgroundColor: "rgba(201,168,76,0.10)",
  },
  stagedText: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: "#F0F0F0",
    lineHeight: 16,
  },
  stagedRemoveBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  stagedRemoveText: {
    fontFamily: FONTS.semiBold,
    fontSize: 20,
    color: "rgba(240,240,240,0.7)",
    lineHeight: 22,
  },

  // Add item button
  addItemButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(201,168,76,0.25)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  addItemButtonDisabled: {
    opacity: 0.4,
  },
  addItemText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    fontWeight: "500",
    color: "#F0F0F0",
    lineHeight: 16.8,
  },

  // Comments
  // Save button
  saveButtonWrap: {
    paddingHorizontal: 20,
    paddingTop: 36,
    gap: 12,
  },
  errorText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: "#F87171",
    textAlign: "center",
  },
});
