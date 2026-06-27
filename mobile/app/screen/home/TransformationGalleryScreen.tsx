import AddPhotoBottomSheet, {
  type AddPhotoBottomSheetRef,
} from "@/app/components/common/AddPhotoBottomSheet";
import GlassFill from "@/app/components/common/GlassFill";
import PhotoPreviewBottomSheet, {
  type PhotoPreviewBottomSheetRef,
} from "@/app/components/common/PhotoPreviewBottomSheet";
import ScreenFades from "@/app/components/common/ScreenFades";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import {
  deleteProgressPhotoThunk,
  loadProgressPhotos,
  uploadProgressPhotoThunk,
} from "@/app/stores/slice/photoSlice";
import { useAppDispatch } from "@/app/stores/store";
import type { RootState } from "@/app/stores/store";
import { TablerPlus } from "@/assets/icons";
import { useRequireEntitlement } from "@/app/hooks/useRequireEntitlement";
import { useHeaderHeight } from "@react-navigation/elements";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import PressableScale from "@/app/components/common/PressableScale";
import Toast from "react-native-toast-message";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";

interface TransformPhoto {
  id: string;
  date: string;
  imageUri: string | null;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "2-digit" });

const GRID_GAP = 20;
const GRID_PADDING = 24;
const GRID_COLUMNS = 3;

const AddNewTile = ({ onPress, label }: { onPress: () => void; label: string }) => (
  <PressableScale onPress={onPress} style={styles.tile}>
    <View style={styles.addNewThumb}>
      {/* Glass blur substrate */}
      <GlassFill effect="clear" scheme="dark" style={styles.addNewGlass} />
      {/* Diagonal gold glow — approximates Figma's bottom-anchored ellipse blob */}
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(201,168,76,0)", "rgba(201,168,76,0.45)"]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={[StyleSheet.absoluteFill, styles.addNewGlass]}
      />
      <View style={styles.addNewIcon}>
        <TablerPlus width={20} height={20} color="#F0F0F0" />
      </View>
    </View>
    <Text style={styles.addNewLabel}>{label}</Text>
  </PressableScale>
);

const PhotoTile = ({
  photo,
  onPress,
}: {
  photo: TransformPhoto;
  onPress: () => void;
}) => (
  <PressableScale
    onPress={onPress}
    style={styles.tile}
  >
    <View style={styles.photoThumb}>
      {photo.imageUri ? (
        <Image
          source={{ uri: photo.imageUri }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
      ) : null}
    </View>
    <Text style={styles.photoDate}>{photo.date}</Text>
  </PressableScale>
);

const TransformationGalleryScreen = () => {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  // Progress Photos is a Standard+ feature (locked spec, Rami 2026-06-12).
  // Free users get bounced to the paywall by useRequireEntitlement.
  const requireEntitlement = useRequireEntitlement();
  const addPhotoSheetRef = useRef<AddPhotoBottomSheetRef>(null);
  const photoPreviewSheetRef = useRef<PhotoPreviewBottomSheetRef>(null);

  const handleAddPhoto = () => {
    if (!requireEntitlement("standard")) return;
    addPhotoSheetRef.current?.show();
  };

  const photoRows = useSelector((s: RootState) => s.photo.photos);
  const photoStatus = useSelector((s: RootState) => s.photo.status);
  const userId = useSelector((s: RootState) => s.auth.user?.id ?? null);

  useEffect(() => {
    if (userId && photoStatus === "idle") {
      dispatch(loadProgressPhotos());
    }
  }, [dispatch, userId, photoStatus]);

  const photos: TransformPhoto[] = useMemo(
    () =>
      photoRows.map((p) => ({
        id: p.id,
        date: formatDate(p.createdAt),
        imageUri: p.signedUrl,
      })),
    [photoRows],
  );

  const openPhoto = (photo: TransformPhoto) => {
    const row = photoRows.find((p) => p.id === photo.id);
    photoPreviewSheetRef.current?.show({
      source: photo.imageUri ? { uri: photo.imageUri } : undefined,
      dateLabel: photo.date,
      photoId: row?.id,
      storagePath: row?.storagePath,
    });
  };

  // First cell of row 0 is the "Add New" tile, followed by the photos.
  const rows = useMemo(() => {
    const cells: ({ kind: "add" } | { kind: "photo"; photo: TransformPhoto })[] = [
      { kind: "add" },
      ...photos.map((photo) => ({ kind: "photo" as const, photo })),
    ];
    const out: typeof cells[] = [];
    for (let i = 0; i < cells.length; i += GRID_COLUMNS) {
      out.push(cells.slice(i, i + GRID_COLUMNS));
    }
    return out;
  }, [photos]);

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerHeight + 16, paddingBottom: insets.bottom + 120 },
        ]}
      >
        <View style={styles.grid}>
          {rows.map((row, rowIdx) => (
            <View key={rowIdx} style={styles.row}>
              {row.map((cell, colIdx) =>
                cell.kind === "add" ? (
                  <AddNewTile
                    key={`add-${colIdx}`}
                    onPress={handleAddPhoto}
                    label={t("progress.addNewPhoto")}
                  />
                ) : (
                  <PhotoTile
                    key={cell.photo.id}
                    photo={cell.photo}
                    onPress={() => openPhoto(cell.photo)}
                  />
                ),
              )}
              {/* Fill empty cells in the final row so spacing stays consistent */}
              {row.length < GRID_COLUMNS
                ? Array.from({ length: GRID_COLUMNS - row.length }).map((_, i) => (
                    <View key={`spacer-${i}`} style={styles.tile} />
                  ))
                : null}
            </View>
          ))}
        </View>
      </ScrollView>

      <ScreenFades hideTop />

      <AddPhotoBottomSheet
        ref={addPhotoSheetRef}
        onPhotoSelected={async (photo) => {
          const action = await dispatch(
            uploadProgressPhotoThunk({ localUri: photo.uri }),
          );
          if (uploadProgressPhotoThunk.fulfilled.match(action)) {
            const { pointsAwarded, row } = action.payload;
            Toast.show({
              type: "success",
              text2:
                pointsAwarded > 0
                  ? t("progress.addPhoto.uploadedWithPoints", { points: pointsAwarded })
                  : t("progress.addPhoto.uploadedNoPoints"),
              visibilityTime: 2500,
            });
            photoPreviewSheetRef.current?.show({
              source: row.signedUrl
                ? { uri: row.signedUrl }
                : { uri: photo.uri },
              dateLabel: formatDate(row.createdAt),
            });
          } else {
            Toast.show({
              type: "error",
              text2: t("progress.addPhoto.uploadFailed"),
              visibilityTime: 3000,
            });
          }
        }}
      />
      <PhotoPreviewBottomSheet
        ref={photoPreviewSheetRef}
        onDelete={async ({ photoId, storagePath }) => {
          const action = await dispatch(
            deleteProgressPhotoThunk({ mediaId: photoId, storagePath }),
          );
          if (deleteProgressPhotoThunk.fulfilled.match(action)) {
            Toast.show({
              type: "success",
              text2: t("progress.photoPreview.deleted"),
              visibilityTime: 2000,
            });
          } else {
            Toast.show({
              type: "error",
              text2: t("progress.photoPreview.deleteFailed"),
              visibilityTime: 3000,
            });
          }
        }}
      />
    </View>
  );
};

export default TransformationGalleryScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0A0A" },
  scrollContent: {
    paddingHorizontal: GRID_PADDING,
    gap: 24,
  },

  // Grid
  grid: { gap: 24 },
  row: {
    flexDirection: "row",
    gap: GRID_GAP,
  },
  tile: {
    flex: 1,
    gap: 8,
  },

  // Add New tile
  addNewThumb: {
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: "rgba(201,168,76,0.12)",
    borderWidth: 1,
    borderColor: COLORS.primary.dark,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  addNewGlass: {
    borderRadius: 16,
  },
  addNewIcon: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  addNewLabel: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: "#FFFFFF",
    textAlign: "center",
    fontWeight: "500",
  },

  // Photo tile
  photoThumb: {
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: COLORS.alpha.surface08,
    overflow: "hidden",
  },
  photoDate: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 14.4,
    color: "rgba(240,240,240,0.5)",
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },
});
