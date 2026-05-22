import ProfileAvatar from "@/app/components/common/ProfileAvatar";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

interface ScreenHeaderProps {
  /** Large display title — e.g. "Nutrition", "Weights". */
  title: string;
  /** Small uppercase gold tagline shown below the title. */
  eyebrow: string;
  /** Initial shown inside the default avatar circle (e.g. user's first letter). */
  avatarInitial?: string;
  /** Optional custom right slot. Overrides the default avatar entirely. */
  right?: ReactNode;
}

/**
 * Top-of-screen header used across the home tabs (Nutrition, Weights, Progress).
 * The default avatar circle shows the user initial and navigates to Profile on tap.
 * Pass `right` to override the avatar entirely.
 */
const ScreenHeader = ({ title, eyebrow, avatarInitial = "T", right }: ScreenHeaderProps) => (
  <View style={styles.root}>
    <View style={styles.leftCol}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
    </View>
    {right ?? <ProfileAvatar initial={avatarInitial} marginBottom={20} />}
  </View>
);

export default ScreenHeader;

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    // Locked so the avatar Y matches across all home tabs (Workout greeting row
    // is shorter than title+eyebrow — this keeps the avatar from jumping).
    minHeight: 70,
  },
  leftCol: {
    flex: 1,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 40,
    fontWeight: "500",
    color: "rgba(240, 240, 240, 0.85)",
    lineHeight: 48,
  },
  eyebrow: {
    marginTop: 8,
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 14.4,
    color: COLORS.primary.dark,
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },
});
