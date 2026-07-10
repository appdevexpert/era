import GlassFill from "@/app/components/common/GlassFill";
import { FONTS } from "@/app/constants/fonts";
import { LeaderboardChevron } from "@/assets/icons";
import { LeaderboardTrophy } from "@/assets/images";
import { LinearGradient } from "expo-linear-gradient";
import { Image, StyleSheet, Text, View } from "react-native";
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
        <LeaderboardChevron width={14.667} height={22} />
      </View>

      <View style={styles.trophyWrap} pointerEvents="none">
        <Image source={LeaderboardTrophy} style={styles.trophy} resizeMode="contain" />
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
  },
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
  trophyWrap: {
    position: "absolute",
    right: 40,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  trophy: {
    width: 60,
    height: 60,
  },
});
