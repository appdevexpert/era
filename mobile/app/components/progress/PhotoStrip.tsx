import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { CameraIcon } from "@/assets/icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

export interface ProgressPhoto {
  id: string;
  date: string;
}

interface PhotoStripProps {
  photos: ProgressPhoto[];
  onAddPhoto: () => void;
}

const PhotoStrip = ({ photos, onAddPhoto }: PhotoStripProps) => {
  const { t } = useTranslation();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
    >
      <Pressable style={styles.addCard} onPress={onAddPhoto}>
        <View style={styles.addIcon}>
          <CameraIcon width={24} height={24} />
        </View>
        <Text style={styles.addText}>{t("progress.addNewPhoto")}</Text>
      </Pressable>
      {photos.map((p) => (
        <View key={p.id} style={styles.col}>
          <View style={styles.thumb} />
          <Text style={styles.date}>{p.date}</Text>
        </View>
      ))}
    </ScrollView>
  );
};

export default PhotoStrip;

const styles = StyleSheet.create({
  // Edge-to-edge: negative margin cancels the screen's 16px horizontal padding;
  // contentContainer puts it back so the first card aligns with the section header.
  scroll: { marginHorizontal: -16 },
  scrollContent: { flexDirection: "row", gap: 16, paddingHorizontal: 16 },
  addCard: {
    width: 100,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1E1E1E",
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
