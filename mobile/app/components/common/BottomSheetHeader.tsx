import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { StyleSheet, Text, View } from "react-native";

interface BottomSheetHeaderProps {
  title: string;
  rounded?: boolean;
}

/**
 * Standard ERA bottom-sheet header: drag handle + title.
 * Matches Figma node 4769:72680 — `#090905` bg, 1px `#1E1E1E` bottom border,
 * 54×4 handle pill centered, Playfair Display 22px title.
 *
 * Designed to be passed to `BottomSheetModal.handleComponent` so the header
 * stays pinned above the scrollable content area.
 */
const BottomSheetHeader = ({ title, rounded = true }: BottomSheetHeaderProps) => (
  <View style={[styles.section, rounded && styles.sectionRounded]}>
    <View style={styles.handleWrap}>
      <View style={styles.handle} />
    </View>
    <Text style={styles.title}>{title}</Text>
  </View>
);

export default BottomSheetHeader;

const styles = StyleSheet.create({
  section: {
    backgroundColor: "#090905",
    paddingTop: 8,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.charcoal,
    gap: 16,
  },
  sectionRounded: {
    borderTopLeftRadius: 38,
    borderTopRightRadius: 38,
  },
  handleWrap: {
    width: "100%",
    height: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  handle: {
    width: 54,
    height: 4,
    borderRadius: 12345,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 22,
    fontWeight: "500",
    color: COLORS.neutral.white,
    lineHeight: 26.4,
  },
});
