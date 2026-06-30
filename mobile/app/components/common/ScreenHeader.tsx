import ProfileAvatar from "@/app/components/common/ProfileAvatar";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { selectUser } from "@/app/stores/selectors/authSelectors";
import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";

interface ScreenHeaderProps {
  /** Large display title — e.g. "Nutrition", "Weights". */
  title: string;
  /** Small uppercase gold tagline shown below the title. */
  eyebrow: string;
  /** Optional custom right slot. Overrides the default avatar entirely. */
  right?: ReactNode;
}

/**
 * Top-of-screen header used across the home tabs (Nutrition, Weights, Progress).
 * The default avatar circle shows the user's first initial and navigates to Profile on tap.
 * Pass `right` to override the avatar entirely.
 */
const ScreenHeader = ({ title, eyebrow, right }: ScreenHeaderProps) => {
  const { t } = useTranslation();
  const user = useSelector(selectUser);
  const displayName = user?.name || user?.email?.split("@")[0] || t("profile.fallbackName");
  const avatarInitial = displayName.charAt(0).toUpperCase();

  return (
    <View style={styles.root}>
      <View style={styles.leftCol}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
      </View>
      {right ?? <ProfileAvatar initial={avatarInitial} marginBottom={20} />}
    </View>
  );
};

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
