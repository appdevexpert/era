import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { AddPhotoCamera, AddPhotoGallery } from "@/assets/icons";
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import * as ImagePicker from "expo-image-picker";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import SheetBackHandler from "@/app/components/common/SheetBackHandler";
import PressableScale from "@/app/components/common/PressableScale";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface AddPhotoBottomSheetRef {
  show: () => void;
  close: () => void;
}

export interface PickedPhoto {
  uri: string;
  width: number;
  height: number;
  mimeType?: string;
  fileName?: string | null;
}

interface AddPhotoBottomSheetProps {
  /** Date displayed under the title, e.g. "25 April, 2026" */
  dateLabel?: string;
  /** Fires after the user successfully captures or picks an image. */
  onPhotoSelected?: (photo: PickedPhoto) => void;
}

const formatToday = () => {
  const d = new Date();
  const day = d.getDate();
  const month = d.toLocaleString("en-US", { month: "long" });
  const year = d.getFullYear();
  return `${day} ${month}, ${year}`;
};

const toPickedPhoto = (asset: ImagePicker.ImagePickerAsset): PickedPhoto => ({
  uri: asset.uri,
  width: asset.width,
  height: asset.height,
  mimeType: asset.mimeType,
  fileName: asset.fileName,
});

const AddPhotoBottomSheet = forwardRef<
  AddPhotoBottomSheetRef,
  AddPhotoBottomSheetProps
>(function AddPhotoBottomSheet({ dateLabel, onPhotoSelected }, ref) {
  const insets = useSafeAreaInsets();
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

  const handleTakePhoto = async () => {
    // Dismiss the sheet first so iOS doesn't refuse a second modal presentation.
    sheetRef.current?.dismiss();

    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        t("progress.addPhoto.permission.cameraTitle"),
        t("progress.addPhoto.permission.cameraMessage"),
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]) {
      onPhotoSelected?.(toPickedPhoto(result.assets[0]));
    }
  };

  const handlePickFromGallery = async () => {
    sheetRef.current?.dismiss();

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        t("progress.addPhoto.permission.galleryTitle"),
        t("progress.addPhoto.permission.galleryMessage"),
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]) {
      onPhotoSelected?.(toPickedPhoto(result.assets[0]));
    }
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
    >
      <SheetBackHandler onBack={() => sheetRef.current?.dismiss()} />
      <BottomSheetView
        style={[
          // Edge-to-edge puts the sheet's bottom edge BEHIND the system nav
          // bar, so the last row needs the inset on top of its designed
          // padding. Math.max keeps the design on devices that report none.
          styles.content,
          { paddingBottom: Math.max(60, insets.bottom + 16) },
        ]}
      >
        <View style={styles.titleSection}>
          <Text style={styles.title}>{t("progress.addPhoto.title")}</Text>
          <Text style={styles.dateText}>{resolvedDate}</Text>
        </View>

        <View style={styles.cardsRow}>
          <PressableScale onPress={handleTakePhoto} style={styles.choiceCard}>
            <View style={styles.iconCircle}>
              <AddPhotoCamera width={36} height={36} />
            </View>
            <Text style={styles.choiceLabel}>
              {t("progress.addPhoto.clickPhoto")}
            </Text>
          </PressableScale>

          <PressableScale onPress={handlePickFromGallery} style={styles.choiceCard}>
            <View style={styles.iconCircle}>
              <AddPhotoGallery width={36} height={36} />
            </View>
            <Text style={styles.choiceLabel}>
              {t("progress.addPhoto.uploadGallery")}
            </Text>
          </PressableScale>
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
