import IconButton from "@/app/components/common/IconButton";
import PrimaryButton from "@/app/components/common/PrimaryButton";
import { FONTS } from "@/app/constants/fonts";
import { ChevronBack, MicLargeIcon, TablerPlus } from "@/assets/icons";
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

export interface AddLogMealBottomSheetRef {
  show: () => void;
  hide: () => void;
}

type MealTag = "breakfast" | "lunch" | "eveningSnack" | "dinner";

const TAGS: MealTag[] = ["breakfast", "lunch", "eveningSnack", "dinner"];

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
  onSave?: (payload: { tag: MealTag | null; itemName: string; servingSize: string; units: string; comments: string }) => void;
}

const AddLogMealBottomSheet = forwardRef<AddLogMealBottomSheetRef, AddLogMealBottomSheetProps>(
  function AddLogMealBottomSheet({ onSave }, ref) {
    const { t } = useTranslation();
    const sheetRef = useRef<BottomSheetModal>(null);

    const [selectedTag, setSelectedTag] = useState<MealTag | null>(null);
    const [itemName, setItemName] = useState("");
    const [servingSize, setServingSize] = useState("");
    const [units, setUnits] = useState("");
    const [unitsOpen, setUnitsOpen] = useState(false);
    const [comments, setComments] = useState("");

    useImperativeHandle(ref, () => ({
      show: () => sheetRef.current?.present(),
      hide: () => sheetRef.current?.dismiss(),
    }));

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

    const handleSave = () => {
      onSave?.({ tag: selectedTag, itemName, servingSize, units, comments });
      sheetRef.current?.dismiss();
    };

    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={["92%"]}
        enablePanDownToClose
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.handle}
      >
        <BottomSheetScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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
                    <Pressable
                      key={tag}
                      onPress={() => setSelectedTag(active ? null : tag)}
                      style={[styles.tagChip, active && styles.tagChipActive]}
                    >
                      <Text style={styles.tagText}>{t(`nutrition.${tag}`)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Items in this meal */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t("nutrition.logMealSheet.itemsInMeal")}</Text>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>{t("nutrition.logMealSheet.itemName")}</Text>
                <BottomSheetTextInput
                  value={itemName}
                  onChangeText={setItemName}
                  placeholder={t("nutrition.logMealSheet.itemNamePlaceholder")}
                  placeholderTextColor="rgba(240,240,240,0.5)"
                  style={styles.input}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.field, styles.flex1]}>
                  <Text style={styles.fieldLabel}>{t("nutrition.logMealSheet.servingSize")}</Text>
                  <BottomSheetTextInput
                    value={servingSize}
                    onChangeText={setServingSize}
                    placeholder={t("nutrition.logMealSheet.servingSizePlaceholder")}
                    placeholderTextColor="rgba(240,240,240,0.5)"
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </View>
                <View style={[styles.field, styles.flex1]}>
                  <Text style={styles.fieldLabel}>{t("nutrition.logMealSheet.units")}</Text>
                  <Pressable
                    onPress={() => setUnitsOpen((open) => !open)}
                    style={[styles.input, styles.dropdownInput, unitsOpen && styles.dropdownInputOpen]}
                  >
                    <Text style={[styles.dropdownText, !units && styles.placeholderText]}>
                      {units || t("nutrition.logMealSheet.unitsPlaceholder")}
                    </Text>
                    <View style={[styles.chevron, unitsOpen ? styles.chevronUp : styles.chevronDown]}>
                      <ChevronBack width={20} height={20} color="rgba(240,240,240,0.5)" />
                    </View>
                  </Pressable>
                </View>
              </View>

              {/* Units dropdown — inline expanded list */}
              {unitsOpen ? (
                <View style={styles.unitsList}>
                  {UNIT_OPTIONS.map((option) => {
                    const active = option.value === units;
                    return (
                      <Pressable
                        key={option.value}
                        onPress={() => {
                          setUnits(option.value);
                          setUnitsOpen(false);
                        }}
                        style={({ pressed }) => [
                          styles.unitOption,
                          active && styles.unitOptionActive,
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <Text style={[styles.unitOptionText, active && styles.unitOptionTextActive]}>
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}

              <Pressable style={styles.addItemButton}>
                <TablerPlus width={14} height={14} color="#F0F0F0" />
                <Text style={styles.addItemText}>{t("nutrition.logMealSheet.addItem")}</Text>
              </Pressable>
            </View>

            {/* Comments */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t("nutrition.logMealSheet.addComments")}</Text>
              <View style={styles.commentsBox}>
                <BottomSheetTextInput
                  value={comments}
                  onChangeText={setComments}
                  placeholder={t("nutrition.logMealSheet.commentsPlaceholder")}
                  placeholderTextColor="rgba(240,240,240,0.5)"
                  multiline
                  style={styles.commentsInput}
                />
                <View style={styles.micButtonWrap}>
                  <IconButton size={40} tint="none">
                    <MicLargeIcon width={24} height={24} />
                  </IconButton>
                </View>
              </View>
            </View>
          </View>

          {/* Save button */}
          <View style={styles.saveButtonWrap}>
            <PrimaryButton label={t("nutrition.logMealSheet.saveMeal")} onPress={handleSave} />
          </View>
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

  // Tags
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tagChip: {
    backgroundColor: "rgba(201,168,76,0.10)",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tagChipActive: {
    backgroundColor: "rgba(201,168,76,0.25)",
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
  addItemText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    fontWeight: "500",
    color: "#F0F0F0",
    lineHeight: 16.8,
  },

  // Comments
  commentsBox: {
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#1E1E1E",
    borderRadius: 16,
    minHeight: 100,
    padding: 16,
    gap: 16,
    justifyContent: "space-between",
  },
  commentsInput: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 18.2,
    color: "#F0F0F0",
    textAlignVertical: "top",
    minHeight: 24,
    padding: 0,
  },
  micButtonWrap: {
    alignSelf: "flex-end",
  },

  // Save button
  saveButtonWrap: {
    paddingHorizontal: 20,
    paddingTop: 36,
  },
});
