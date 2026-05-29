import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { CameraIcon } from "@/assets/icons";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import PressableScale from "@/app/components/common/PressableScale";
import { useTranslation } from "react-i18next";

export interface ProgressPhoto {
  id: string;
  date: string;
  /** Signed URL or remote https URL. Falls back to a placeholder when null. */
  imageUri?: string | null;
}

interface PhotoStripProps {
  photos: ProgressPhoto[];
  onAddPhoto: () => void;
  onPhotoPress?: (photo: ProgressPhoto) => void;
}

/**
 * Empty state — Figma 6008:3239. Single full-width dashed card with a gold
 * gradient wash and the "Add your First Photo" CTA. Renders when the user
 * hasn't uploaded any progress photos yet.
 */
const EmptyState = ({ onAddPhoto, label }: { onAddPhoto: () => void; label: string }) => (
  <PressableScale
    onPress={onAddPhoto}
    style={styles.emptyCard}
  >
    <View style={styles.emptyRow}>
      <View style={styles.emptyIconPill}>
        <CameraIcon width={24} height={24} />
      </View>
      <Text style={styles.emptyText}>{label}</Text>
    </View>
  </PressableScale>
);

const PhotoStrip = ({ photos, onAddPhoto, onPhotoPress }: PhotoStripProps) => {
  const { t } = useTranslation();

  if (photos.length === 0) {
    return (
      <EmptyState
        onAddPhoto={onAddPhoto}
        label={t("progress.addFirstPhoto")}
      />
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
    >
      <PressableScale style={styles.addCard} onPress={onAddPhoto}>
        <View style={styles.addIcon}>
          <CameraIcon width={24} height={24} />
        </View>
        <Text style={styles.addText}>{t("progress.addNewPhoto")}</Text>
      </PressableScale>
      {photos.map((p) => (
        <PressableScale
          key={p.id}
          style={styles.col}
          onPress={() => onPhotoPress?.(p)}
          disabled={!onPhotoPress}
        >
          {p.imageUri ? (
            <Image source={{ uri: p.imageUri }} style={styles.thumb} resizeMode="cover" />
          ) : (
            <View style={styles.thumb} />
          )}
          <Text style={styles.date}>{p.date}</Text>
        </PressableScale>
      ))}
    </ScrollView>
  );
};

export default PhotoStrip;

const styles = StyleSheet.create({
  // Empty-state card (Figma 6008:3239)
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1E1E1E",
    borderStyle: "dashed",
    backgroundColor: "#111",
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
    overflow: "hidden",
  },
  emptyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  emptyIconPill: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: "rgba(240,240,240,0.8)",
    textAlign: "center",
  },

  // Edge-to-edge: negative margin cancels the screen's 16px horizontal padding;
  // contentContainer puts it back so the first card aligns with the section header.
  scroll: { marginHorizontal: -16 },
  scrollContent: { flexDirection: "row", gap: 16, paddingHorizontal: 16 },
  addCard: {
    width: 100,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1E1E1E",
    borderStyle: "dashed",
    backgroundColor: "#111",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 130,
  },
  addIcon: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  addText: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: "rgba(240,240,240,0.8)",
    textAlign: "center",
    paddingHorizontal: 8,
  },
  col: { gap: 8 },
  thumb: {
    width: 100,
    height: 100,
    borderRadius: 16,
    backgroundColor: COLORS.alpha.surface08,
  },
  date: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: "rgba(240,240,240,0.5)",
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },
});
