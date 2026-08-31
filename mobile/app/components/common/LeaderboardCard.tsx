import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { LeaderboardChevron } from "@/assets/icons";
import { LeaderboardTrophy } from "@/assets/images";
import { LinearGradient } from "expo-linear-gradient";
import { GlassView } from "expo-glass-effect";
import { Image, Platform, StyleSheet, Text, View } from "react-native";
import PressableScale from "@/app/components/common/PressableScale";
import { getGlassFallbackStyle } from "@/app/components/common/GlassFill";

interface LeaderboardCardProps {
  title: string;
  subtitle: string;
  onPress?: () => void;
}

const LeaderboardCard = ({ title, subtitle, onPress }: LeaderboardCardProps) => (
  <PressableScale onPress={onPress} style={styles.card}>
    <View style={styles.bgClip} pointerEvents="none">
      {Platform.OS === "ios" ? (
        <GlassView
          glassEffectStyle="regular"
          colorScheme="dark"
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, getGlassFallbackStyle("regular", "dark")]} />
      )}
      <LinearGradient
        colors={["rgba(201,168,76,0.25)", "rgba(241,203,48,0.25)"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>

    <View style={styles.row}>
      <View style={styles.textCol}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <LeaderboardChevron width={14.667} height={22} />
    </View>

    <View style={styles.trophyWrap} pointerEvents="none">
      <Image source={LeaderboardTrophy} style={styles.trophy} resizeMode="contain" />
    </View>
  </PressableScale>
);

export default LeaderboardCard;

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    minHeight: 78,
    justifyContent: "center",
    backgroundColor: COLORS.neutral.black2,
  },
  bgClip: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    overflow: "hidden",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  textCol: { flex: 1, gap: 8 },
  title: {
    fontFamily: FONTS.display,
    fontSize: 20,
    fontWeight: "500",
    lineHeight: 24,
    color: COLORS.neutral.white,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 14.4,
    letterSpacing: 0.48,
    textTransform: "uppercase",
    color: COLORS.primary.dark,
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
