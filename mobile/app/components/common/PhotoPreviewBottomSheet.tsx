import SheetBackHandler from "@/app/components/common/SheetBackHandler";
import GlassFill from "@/app/components/common/GlassFill";
import { FONTS } from "@/app/constants/fonts";
import { DownloadGallery, SettingTrashBin } from "@/assets/icons";
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { File, Paths } from "expo-file-system";
import { LinearGradient } from "expo-linear-gradient";
import * as Sharing from "expo-sharing";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Image,
  ImageSourcePropType,
  StyleSheet,
  Text,
  View,
} from "react-native";
import PressableScale from "@/app/components/common/PressableScale";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  onDelete?: (args: {
    photoId: string;
    storagePath: string;
    dateLabel: string;
  }) => void;
}

const PhotoPreviewBottomSheet = forwardRef<
  PhotoPreviewBottomSheetRef,
  PhotoPreviewBottomSheetProps
>(function PhotoPreviewBottomSheet({ onDelete }, ref) {
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheetModal>(null);
  const { t } = useTranslation();
  const [source, setSource] = useState<ImageSourcePropType | undefined>();
  const [dateLabel, setDateLabel] = useState("");
  const [photoId, setPhotoId] = useState<string | undefined>();
  const [storagePath, setStoragePath] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

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

  // ImageSourcePropType also covers require()'d numbers and arrays; only a
  // plain { uri } can be saved anywhere.
  const photoUri =
    source && typeof source === "object" && !Array.isArray(source)
      ? source.uri
      : undefined;

  /**
   * The sheet opens in two states and they want different actions.
   *
   * Straight after the picker there is no photoId yet — the upload is still in
   * flight (ProgressScreen dispatches it as the sheet opens) or has only just
   * landed. That photo came off the user's own camera roll, so offering to save
   * it back there is meaningless, and there is nothing to confirm either: the
   * upload does not wait on a button. All that state needs is "Done".
   *
   * Tapping a photo in the strip or the gallery passes its id + storage path.
   * That one lives in the cloud, so Delete and a real Download both apply.
   */
  const isSaved = Boolean(photoId && storagePath);
  const canDelete = Boolean(onDelete && isSaved);

  const handleDone = () => sheetRef.current?.dismiss();

  const handleDownload = async () => {
    if (!photoUri || saving) return;
    setSaving(true);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        throw new Error("sharing unavailable");
      }
      // The OS can only share a file it can reach, so a remote signed URL has
      // to land on disk first. The explicit .jpg name matters: the share sheet
      // decides whether to offer "Save Image" from the extension, and a
      // Supabase signed URL would otherwise drag its query string into the
      // filename. Timestamped so a re-save never collides with itself.
      const localUri = photoUri.startsWith("file:")
        ? photoUri
        : (
            await File.downloadFileAsync(
              photoUri,
              new File(Paths.cache, `era-photo-${Date.now()}.jpg`),
            )
          ).uri;

      await Sharing.shareAsync(localUri, {
        mimeType: "image/jpeg",
        UTI: "public.jpeg",
        dialogTitle: t("progress.photoPreview.download"),
      });
      // Deliberately staying open — the share sheet is a native modal on top,
      // and the user lands back on the preview when they dismiss it.
    } catch {
      // Alert, not Toast: the toast host renders under the sheet's portal, so
      // a toast raised while this sheet is open can be hidden behind it.
      // AddPhotoBottomSheet reports its permission errors the same way.
      Alert.alert(
        t("progress.photoPreview.saveFailedTitle"),
        t("progress.photoPreview.saveFailedMessage"),
      );
    } finally {
      setSaving(false);
    }
  };

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
      <SheetBackHandler onBack={() => sheetRef.current?.dismiss()} />
      <BottomSheetView
        style={[
          // Edge-to-edge puts the sheet's bottom edge BEHIND the system nav
          // bar, so the last row needs the inset on top of its designed
          // padding. Math.max keeps the design on devices that report none.
          styles.content,
          { paddingBottom: Math.max(48, insets.bottom + 16) },
        ]}
      >
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

          {/* Action row — Done for a just-added photo, Delete + Download for
              one that already lives in the cloud. */}
          <View style={styles.actionRow}>
            {isSaved ? (
              <>
                {/* Delete CTA — translucent red pill. Needs id + storagePath
                    to remove the storage object. */}
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
                <PressableScale
                  onPress={handleDownload}
                  disabled={saving || !photoUri}
                  style={[styles.goldBtn, saving && styles.btnBusy]}
                >
                  <GlassFill style={styles.goldGlass} />
                  <LinearGradient
                    pointerEvents="none"
                    colors={["rgba(201,168,76,0.25)", "rgba(241,203,48,0.25)"]}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={[StyleSheet.absoluteFill, styles.goldGlass]}
                  />
                  <DownloadGallery width={24} height={24} />
                  <Text style={styles.actionText}>
                    {t("progress.photoPreview.download")}
                  </Text>
                </PressableScale>
              </>
            ) : (
              /* Done CTA — the photo is already on its way up; this just
                 acknowledges and closes. */
              <PressableScale
                onPress={handleDone}
                style={[styles.goldBtn, styles.doneBtn]}
              >
                <GlassFill style={styles.goldGlass} />
                <LinearGradient
                  pointerEvents="none"
                  colors={["rgba(201,168,76,0.25)", "rgba(241,203,48,0.25)"]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={[StyleSheet.absoluteFill, styles.goldGlass]}
                />
                <Text style={styles.actionText}>
                  {t("progress.photoPreview.done")}
                </Text>
              </PressableScale>
            )}
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
  // Gold glass pill — shared by Download and Done
  goldBtn: {
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
  goldGlass: {
    borderRadius: 30,
  },
  // Done stands alone in its row, so it gets some presence rather than
  // shrinking to the width of a four-letter word.
  doneBtn: {
    minWidth: 180,
  },
  btnBusy: {
    opacity: 0.6,
  },
  // Shared button label
  actionText: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
  },
});
