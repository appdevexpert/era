import GlassFill from "@/app/components/common/GlassFill";
import { FONTS } from "@/app/constants/fonts";
import { DownloadGallery, SettingTrashBin } from "@/assets/icons";
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Image,
  ImageSourcePropType,
  StyleSheet,
  Text,
  View,
} from "react-native";
import PressableScale from "@/app/components/common/PressableScale";
import { useTranslation } from "react-i18next";

export interface PhotoPreviewBottomSheetShowArgs {
  source?: ImageSourcePropType;
  dateLabel: string;
  /** Required to enable the Delete button. */
  photoId?: string;
  /** Required to enable the Delete button (used to remove the storage object). */
  storagePath?: string;
}

export interface PhotoPreviewBottomSheetRef {
  /** Open the sheet with the photo + upload date. */
  show: (args: PhotoPreviewBottomSheetShowArgs) => void;
  close: () => void;
}

interface PhotoPreviewBottomSheetProps {
  onDownload?: (dateLabel: string) => void;
  onDelete?: (args: {
    photoId: string;
    storagePath: string;
    dateLabel: string;
  }) => void;
}

const PhotoPreviewBottomSheet = forwardRef<
  PhotoPreviewBottomSheetRef,
  PhotoPreviewBottomSheetProps
>(function PhotoPreviewBottomSheet({ onDownload, onDelete }, ref) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const { t } = useTranslation();
  const [source, setSource] = useState<ImageSourcePropType | undefined>();
  const [dateLabel, setDateLabel] = useState("");
  const [photoId, setPhotoId] = useState<string | undefined>();
  const [storagePath, setStoragePath] = useState<string | undefined>();

  useImperativeHandle(ref, () => ({
    show: ({ source: src, dateLabel: date, photoId: id, storagePath: path }) => {
      setSource(src);
      setDateLabel(date);
      setPhotoId(id);
      setStoragePath(path);
      sheetRef.current?.present();
    },
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

  const handleDownload = () => {
    onDownload?.(dateLabel);
    sheetRef.current?.dismiss();
  };

  const canDelete = Boolean(onDelete && photoId && storagePath);

  const handleDelete = () => {
    if (!photoId || !storagePath) return;
    onDelete?.({ photoId, storagePath, dateLabel });
    sheetRef.current?.dismiss();
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundComponent={null}
      handleComponent={null}
    >
      <BottomSheetView style={styles.content}>
        {/* Photo — sits above the drawer's rounded top edge */}
        <View style={styles.photoFrame}>
          {source ? (
            <Image source={source} style={styles.photo} resizeMode="cover" />
          ) : (
            <View style={[styles.photo, styles.photoPlaceholder]} />
          )}
        </View>

        {/* Drawer body — pulled up so the photo's lower half overlaps the rounded top */}
        <View style={styles.drawerBody}>
          {/* Gold ambient halo at the top of the drawer */}
          <LinearGradient
            pointerEvents="none"
            colors={["rgba(201,168,76,0.28)", "rgba(10,10,10,0)"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.glow}
          />

          {/* Drag handle */}
          <View style={styles.handle} />

          {/* Spacer reserves room for the photo's lower half overlapping in */}
          <View style={styles.photoOverlapSpacer} />

          {/* Uploaded {date} */}
          <Text style={styles.dateText}>
            {t("progress.photoPreview.uploaded")}
            <Text style={styles.dateValue}>{dateLabel}</Text>
          </Text>

          {/* Action row — Delete + Download */}
          <View style={styles.actionRow}>
            {/* Delete CTA — translucent red pill. Hidden when no photo
                identity was passed (Delete needs id + storagePath). */}
            {canDelete ? (
              <PressableScale onPress={handleDelete} style={styles.deleteBtn}>
                <GlassFill style={styles.deleteGlass} />
                <View style={styles.deleteTint} pointerEvents="none" />
                <SettingTrashBin width={24} height={24} />
                <Text style={styles.actionText}>
                  {t("progress.photoPreview.delete")}
                </Text>
              </PressableScale>
            ) : null}

            {/* Download CTA — glass pill tinted with gold gradient */}
            <PressableScale onPress={handleDownload} style={styles.downloadBtn}>
              <GlassFill style={styles.downloadGlass} />
              <LinearGradient
                pointerEvents="none"
                colors={["rgba(201,168,76,0.25)", "rgba(241,203,48,0.25)"]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={[StyleSheet.absoluteFill, styles.downloadGlass]}
              />
              <DownloadGallery width={24} height={24} />
              <Text style={styles.actionText}>
                {t("progress.photoPreview.download")}
              </Text>
            </PressableScale>
          </View>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

PhotoPreviewBottomSheet.displayName = "PhotoPreviewBottomSheet";

export default PhotoPreviewBottomSheet;

const PHOTO_SIZE = 256;
/** How much of the photo overlaps the drawer (the lower portion). */
const PHOTO_OVERLAP = 128;

const styles = StyleSheet.create({
  // The sheet itself is transparent — drawerBody draws the real rounded panel.
  content: {
    width: "100%",
    alignItems: "stretch",
    paddingBottom: 48,
  },
  // Photo
  photoFrame: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    alignSelf: "center",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
    overflow: "hidden",
    zIndex: 2,
    // Gold ambient shadow — matches Figma drop shadow
    shadowColor: "#C9A84C",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 42,
    elevation: 12,
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  photoPlaceholder: {
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  // Drawer body — overlaps the photo's lower half
  drawerBody: {
    width: "100%",
    backgroundColor: "#0A0A0A",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    marginTop: -PHOTO_OVERLAP,
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 24,
    alignItems: "center",
    overflow: "hidden",
  },
  // Soft gold halo at the top of the drawer body
  glow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  // Drag handle
  handle: {
    backgroundColor: "#18192B",
    width: 48,
    height: 8,
    borderRadius: 100,
  },
  // Reserves space inside the drawer for the photo's lower half (which is
  // visually overlapping but rendered outside of drawerBody).
  photoOverlapSpacer: {
    height: PHOTO_OVERLAP - 16,
  },
  // Uploaded date row
  dateText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 14.4,
    color: "#A2A1A6",
    textAlign: "center",
  },
  dateValue: {
    color: "#DEDEDE",
  },
  // Action row
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  // Delete CTA — translucent red pill, fixed 145×52
  deleteBtn: {
    width: 145,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 138,
    overflow: "hidden",
  },
  deleteGlass: {
    borderRadius: 138,
  },
  deleteTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(230,119,119,0.36)",
    borderRadius: 138,
  },
  // Download CTA — content-sized glass pill with gold gradient
  downloadBtn: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 30,
    overflow: "hidden",
  },
  downloadGlass: {
    borderRadius: 30,
  },
  // Shared button label
  actionText: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
  },
});
