import GlassFill from "@/app/components/common/GlassFill";
import { FONTS } from "@/app/constants/fonts";
import { ChevronRight, MedalPrRed } from "@/assets/icons";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";
import PressableScale from "@/app/components/common/PressableScale";
import { useTranslation } from "react-i18next";

const GOLD = "#C9A84C";

interface LeaderboardCardProps {
  onPress?: () => void;
}

const LeaderboardCard = ({ onPress }: LeaderboardCardProps) => {
  const { t } = useTranslation();

  return (
    <PressableScale
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.bgClip} pointerEvents="none">
        <GlassFill effect="clear" scheme="dark" style={styles.glass} />
        <LinearGradient
          colors={["rgba(201,168,76,0.25)", "rgba(241,203,48,0.25)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.textCol}>
          <Text style={styles.title}>{t("progress.leaderboard")}</Text>
          <Text style={styles.eyebrow}>{t("progress.leaderboardEyebrow")}</Text>
        </View>
        <ChevronRight width={15} height={22} color="#F0F0F0" />
      </View>

      <View style={styles.badge} pointerEvents="none">
        <MedalPrRed width={38} height={72} />
      </View>
    </PressableScale>
  );
};

export default LeaderboardCard;

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    minHeight: 78,
    justifyContent: "center",
    // overflow:visible so the medal ribbon can hang above the card top edge (matches Figma).
  },
  // Clips background layers (glass + gold gradient) to the card's rounded corners.
  bgClip: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    overflow: "hidden",
  },
  glass: { borderRadius: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  textCol: { flex: 1, gap: 8 },
  title: {
    fontFamily: FONTS.display,
    fontSize: 20,
    fontWeight: "500",
    color: "#F0F0F0",
    lineHeight: 24,
  },
  eyebrow: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: GOLD,
    letterSpacing: 0.48,
    textTransform: "uppercase",
    lineHeight: 14.4,
  },
  // Medal hangs from the top of the card (ribbon overflows above by 5px to match Figma).
  badge: {
    position: "absolute",
    top: -5,
    right: 48,
    width: 38,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
  },
});
