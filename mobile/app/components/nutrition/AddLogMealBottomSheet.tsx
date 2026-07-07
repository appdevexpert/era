import AddComment from "@/app/components/common/AddComment";
import GlassFill from "@/app/components/common/GlassFill";
import PrimaryButton from "@/app/components/common/PrimaryButton";
import { FONTS } from "@/app/constants/fonts";
import { ChevronBack, TablerPlus } from "@/assets/icons";
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetFooter,
  BottomSheetFooterProps,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetScrollViewMethods,
} from "@gorhom/bottom-sheet";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Keyboard,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PressableScale from "@/app/components/common/PressableScale";
import Animated, {
  Easing,
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

// Gap kept between a focused field's bottom edge and the keyboard/footer when we
// scroll it into view, so the field never sits flush against them.
const REVEAL_MARGIN = 16;

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
    const insets = useSafeAreaInsets();
    const { height: windowHeight } = useWindowDimensions();
    const sheetRef = useRef<BottomSheetModal>(null);
    const scrollRef = useRef<BottomSheetScrollViewMethods>(null);

    // --- Keyboard avoidance -------------------------------------------------
    // We use plain RN TextInputs (see AddComment header for why), so gorhom's
    // built-in keyboard handling stays inert, and `useAnimatedKeyboard` reports
    // 0 inside the modal's portal on iOS — which is why earlier attempts left
    // both the footer and the scroll frozen. So we drive everything from the JS
    // `Keyboard` events (these DO fire) into a shared value, and manually:
    //   (1) a sticky Save footer that floats just above the keyboard,
    //   (2) on focus, the focused field is scrolled clear of the keyboard+footer,
    //   (3) a bottom spacer sized (keyboard + footer) so there's room to lift the
    //       bottom-most field above both.
    // Refs feed the focus→scroll math and are kept off React state to avoid a
    // re-render on every scroll frame.
    const scrollY = useRef(0); // live scroll offset
    const kbHeight = useRef(0); // current keyboard height (from OS events)
    const footerHeightRef = useRef(0); // measured Save-footer height
    const focusedFieldRef = useRef<View | null>(null); // field wrapper in focus
    const focusedIsLast = useRef(false); // is the focused field the bottom-most one
    // Field wrappers we may need to lift above the keyboard.
    const itemNameFieldRef = useRef<View>(null);
    const servingFieldRef = useRef<View>(null);
    const commentFieldRef = useRef<View>(null);
    const [footerHeight, setFooterHeight] = useState(0);

    // Two shared values, both driven by the JS keyboard events below:
    //  - kbSpacer: set INSTANTLY on show so the bottom spacer already has full
    //    height when we scroll. If it animated, scrollToEnd would fire before
    //    there was any room to scroll into and the field would stay put — that
    //    was the bug in the previous attempt.
    //  - kbTranslate: animated in lockstep with the OS keyboard so the footer
    //    glides up with it instead of snapping.
    const kbSpacer = useSharedValue(0);
    const kbTranslate = useSharedValue(0);
    const keyboardSpacerStyle = useAnimatedStyle(
      () => ({ height: kbSpacer.value + footerHeight }),
      [footerHeight],
    );
    // Footer floats up by the keyboard height so Save sits just on top of it.
    const footerStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: -kbTranslate.value }],
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

    // Mirror of the form values that Save needs, kept fresh every render. Save
    // (and the compose helper) read from this ref instead of closing over state
    // directly, so their identities stay stable across keystrokes. Without this,
    // handleSave changed on every keystroke → renderFooter changed → gorhom saw a
    // new footer component type and remounted the footer subtree (Save button's
    // LinearGradient) each keystroke, which read as a color flicker.
    const latest = useRef({
      selectedTag,
      itemName,
      servingSize,
      units,
      stagedItems,
      editingIndex,
      comments,
      onSave,
    });
    latest.current = {
      selectedTag,
      itemName,
      servingSize,
      units,
      stagedItems,
      editingIndex,
      comments,
      onSave,
    };

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
      const { itemName, servingSize, units, stagedItems, editingIndex } = latest.current;
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
    }, []);

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

    // Scroll the focused field clear of the keyboard + sticky footer.
    //  - Bottom-most field (Comments): scrollToEnd is the most reliable move — no
    //    coordinate math — and the bottom spacer (keyboard + footer tall) lands it
    //    right above the footer.
    //  - Upper fields (Item Name / Serving Size): only scroll if they actually dip
    //    into the keyboard+footer band (e.g. after staged items push them down),
    //    and only by the exact overlap so they don't jump further than needed.
    const revealFocused = useCallback(
      (keyboardHeight: number) => {
        if (keyboardHeight <= 0) return;
        if (focusedIsLast.current) {
          scrollRef.current?.scrollToEnd({ animated: true });
          return;
        }
        const node = focusedFieldRef.current;
        if (!node) return;
        node.measureInWindow((_x, y, _w, height) => {
          if (!height) return;
          const visibleBottom =
            windowHeight - keyboardHeight - footerHeightRef.current - REVEAL_MARGIN;
          const overlap = y + height - visibleBottom;
          if (overlap > 0) {
            scrollRef.current?.scrollTo({ y: scrollY.current + overlap, animated: true });
          }
        });
      },
      [windowHeight],
    );

    // Remember which field is focused. If the keyboard is already up (user moved
    // between fields) reveal it now; on a cold open the keyboard-show listener
    // below reveals it once the final height is known.
    const handleFieldFocus = useCallback(
      (node: View | null, isLast: boolean) => {
        focusedFieldRef.current = node;
        focusedIsLast.current = isLast;
        if (kbHeight.current > 0) revealFocused(kbHeight.current);
      },
      [revealFocused],
    );

    const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollY.current = e.nativeEvent.contentOffset.y;
    }, []);

    const handleFooterLayout = useCallback((e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      footerHeightRef.current = h;
      setFooterHeight(h);
    }, []);

    // When the spacer's growth lands (content gets taller as the keyboard opens),
    // re-pin the bottom-most field above the footer. This catches the case where
    // scrollToEnd fired a frame before the native content size updated. Guarded to
    // growth + keyboard-up + last-field so staged-item edits and drag-to-dismiss
    // don't fight it.
    const lastContentHeight = useRef(0);
    const handleContentSizeChange = useCallback((_w: number, height: number) => {
      const grew = height > lastContentHeight.current;
      lastContentHeight.current = height;
      if (grew && focusedIsLast.current && kbHeight.current > 0) {
        scrollRef.current?.scrollToEnd({ animated: true });
      }
    }, []);

    // JS keyboard events fire reliably (unlike useAnimatedKeyboard in this portal),
    // so they are the single source of truth: they drive the shared value that
    // moves the footer + spacer, AND trigger the focus scroll with the final
    // height. `duration` keeps the footer in sync with the OS keyboard animation.
    useEffect(() => {
      const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
      const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
      const showSub = Keyboard.addListener(showEvent, (e) => {
        const height = e.endCoordinates?.height ?? 0;
        const duration = e.duration && e.duration > 0 ? e.duration : 250;
        kbHeight.current = height;
        kbSpacer.value = height; // instant → scroll room exists right away
        kbTranslate.value = withTiming(height, { duration }); // glide footer up
        revealFocused(height);
      });
      const hideSub = Keyboard.addListener(hideEvent, (e) => {
        const duration = e?.duration && e.duration > 0 ? e.duration : 250;
        kbHeight.current = 0;
        kbSpacer.value = withTiming(0, { duration });
        kbTranslate.value = withTiming(0, { duration });
      });
      return () => {
        showSub.remove();
        hideSub.remove();
      };
    }, [revealFocused, kbSpacer, kbTranslate]);

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
      const { selectedTag, comments, onSave } = latest.current;
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
    }, [composeItemsForSave, resetForm]);

    // Save lives in gorhom's own footer slot so it's reliably pinned to the
    // bottom of the sheet (always visible, keyboard open or closed). Our inner
    // Animated.View lifts it above the keyboard via kbTranslate — gorhom doesn't
    // track plain TextInputs, so BottomSheetFooter alone stays at the bottom.
    const renderFooter = useCallback(
      (props: BottomSheetFooterProps) => (
        <BottomSheetFooter {...props}>
          <Animated.View
            style={[styles.footer, footerStyle, { paddingBottom: insets.bottom || 20 }]}
            onLayout={handleFooterLayout}
          >
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <PrimaryButton
              label={t("nutrition.logMealSheet.saveMeal")}
              onPress={handleSave}
              disabled={!canSave}
              loading={saving}
            />
          </Animated.View>
        </BottomSheetFooter>
      ),
      [footerStyle, insets.bottom, handleFooterLayout, error, canSave, saving, handleSave, t],
    );

    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={["92%"]}
        // Pin to the 92% snap point. Dynamic sizing (default on) would add a
        // content-fit detent; our keyboard spacer changes the content height,
        // which would make gorhom resize the whole sheet on focus/blur. Off = no
        // resize; the spacer + scrollToEnd handle keyboard room instead.
        enableDynamicSizing={false}
        enablePanDownToClose
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        backdropComponent={renderBackdrop}
        footerComponent={renderFooter}
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.handle}
        onDismiss={() => ExpoSpeechRecognitionModule.stop()}
      >
        <BottomSheetScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScroll={handleScroll}
          onContentSizeChange={handleContentSizeChange}
          // Pin the header (child index 0) to the top as a sticky navbar while
          // the rest of the form scrolls under it.
          stickyHeaderIndices={[0]}
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
              <View ref={itemNameFieldRef} style={styles.field}>
                <Text style={styles.fieldLabel}>{t("nutrition.logMealSheet.itemName")}</Text>
                <TextInput
                  value={itemName}
                  onChangeText={setItemName}
                  onFocus={() => {
                    setUnitsOpen(false);
                    handleFieldFocus(itemNameFieldRef.current, false);
                  }}
                  placeholder={t("nutrition.logMealSheet.itemNamePlaceholder")}
                  placeholderTextColor="rgba(240,240,240,0.5)"
                  style={styles.input}
                />
              </View>

              <View style={styles.row}>
                <View ref={servingFieldRef} style={[styles.field, styles.flex1]}>
                  <Text style={styles.fieldLabel}>{t("nutrition.logMealSheet.servingSize")}</Text>
                  <TextInput
                    value={servingSize}
                    onChangeText={setServingSize}
                    onFocus={() => {
                      setUnitsOpen(false);
                      handleFieldFocus(servingFieldRef.current, false);
                    }}
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
            <View ref={commentFieldRef}>
              <AddComment
                value={comments}
                onChangeText={setComments}
                onFocus={() => handleFieldFocus(commentFieldRef.current, true)}
              />
            </View>
          </View>

          {/* Grows with the keyboard (+ footer height) so the bottom-most field
              can be scrolled clear of the keyboard and the pinned Save footer. */}
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
    // Opaque so form content scrolls cleanly under the pinned (sticky) header.
    backgroundColor: "#111111",
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

  // Save button — content inside gorhom's pinned footer slot. It floats above
  // the keyboard via the kbTranslate transform; gorhom keeps it at the sheet
  // bottom when the keyboard is closed.
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
    backgroundColor: "#111111",
  },
  errorText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: "#F87171",
    textAlign: "center",
  },
});
