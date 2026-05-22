import GlassFill from "@/app/components/common/GlassFill";
import { FONTS } from "@/app/constants/fonts";
import { ChevronRight, LeaderboardBadge } from "@/assets/icons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

const GOLD = "#C9A84C";

interface LeaderboardCardProps {
  onPress?: () => void;
}

const LeaderboardCard = ({ onPress }: LeaderboardCardProps) => {
  const { t } = useTranslation();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <GlassFill effect="clear" scheme="dark" style={styles.glass} />
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(201,168,76,0.25)", "rgba(241,203,48,0.25)"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[StyleSheet.absoluteFill, styles.glass]}
      />

      <View style={styles.row}>
        <View style={styles.textCol}>
          <Text style={styles.title}>{t("progress.leaderboard")}</Text>
          <Text style={styles.eyebrow}>{t("progress.leaderboardEyebrow")}</Text>
        </View>
        <ChevronRight width={15} height={22} color="#F0F0F0" />
      </View>

      <View style={styles.badge} pointerEvents="none">
        <LeaderboardBadge width={48} height={61} />
      </View>
    </Pressable>
  );
};

export default LeaderboardCard;

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    overflow: "hidden",
    minHeight: 78,
    justifyContent: "center",
  },
  pressed: { opacity: 0.9 },
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
  badge: {
    position: "absolute",
    top: "50%",
    right: 48,
    marginTop: -12.5,
    width: 48,
    height: 61,
    alignItems: "center",
    justifyContent: "center",
  },
});
