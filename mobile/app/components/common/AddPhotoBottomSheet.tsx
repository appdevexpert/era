import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { AddPhotoCamera, AddPhotoGallery } from "@/assets/icons";
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

export interface AddPhotoBottomSheetRef {
  show: () => void;
  close: () => void;
}

interface AddPhotoBottomSheetProps {
  /** Date displayed under the title, e.g. "25 April, 2026" */
  dateLabel?: string;
  onTakePhoto?: () => void;
  onPickFromGallery?: () => void;
}

const formatToday = () => {
  const d = new Date();
  const day = d.getDate();
  const month = d.toLocaleString("en-US", { month: "long" });
  const year = d.getFullYear();
  return `${day} ${month}, ${year}`;
};

const AddPhotoBottomSheet = forwardRef<
  AddPhotoBottomSheetRef,
  AddPhotoBottomSheetProps
>(function AddPhotoBottomSheet(
  { dateLabel, onTakePhoto, onPickFromGallery },
  ref,
) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const { t } = useTranslation();
  const resolvedDate = useMemo(() => dateLabel ?? formatToday(), [dateLabel]);

  useImperativeHandle(ref, () => ({
    show: () => sheetRef.current?.present(),
    close: () => sheetRef.current?.dismiss(),
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

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetView style={styles.content}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>{t("progress.addPhoto.title")}</Text>
          <Text style={styles.dateText}>{resolvedDate}</Text>
        </View>

        <View style={styles.cardsRow}>
          <Pressable
            onPress={() => {
              onTakePhoto?.();
              sheetRef.current?.dismiss();
            }}
            style={styles.choiceCard}
          >
            <View style={styles.iconCircle}>
              <AddPhotoCamera width={36} height={36} />
            </View>
            <Text style={styles.choiceLabel}>
              {t("progress.addPhoto.clickPhoto")}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              onPickFromGallery?.();
              sheetRef.current?.dismiss();
            }}
            style={styles.choiceCard}
          >
            <View style={styles.iconCircle}>
              <AddPhotoGallery width={36} height={36} />
            </View>
            <Text style={styles.choiceLabel}>
              {t("progress.addPhoto.uploadGallery")}
            </Text>
          </Pressable>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

AddPhotoBottomSheet.displayName = "AddPhotoBottomSheet";

export default AddPhotoBottomSheet;

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: "#111111",
    borderTopLeftRadius: 38,
    borderTopRightRadius: 38,
    borderWidth: 1,
    borderColor: COLORS.neutral.charcoal,
  },
  handle: {
    backgroundColor: "rgba(255,255,255,0.2)",
    width: 54,
    height: 4,
    borderRadius: 12345,
  },
  content: {
    gap: 24,
    paddingBottom: 60,
  },
  titleSection: {
    paddingTop: 8,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.charcoal,
    gap: 6,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 22,
    fontWeight: "500",
    color: COLORS.neutral.white,
    lineHeight: 26.4,
  },
  dateText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(240, 240, 240, 0.5)",
    lineHeight: 16.8,
  },
  cardsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
  },
  choiceCard: {
    flex: 1,
    height: 151,
    backgroundColor: COLORS.neutral.black2,
    borderWidth: 1,
    borderColor: COLORS.neutral.charcoal,
    borderRadius: 16,
    borderStyle: "dashed",
    paddingVertical: 18,
    paddingHorizontal: 16,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  choiceLabel: {
    fontFamily: FONTS.display,
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.neutral.white,
    lineHeight: 22.4,
    textAlign: "center",
  },
});
