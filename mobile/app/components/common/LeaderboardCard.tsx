import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { LeaderboardAward, LeaderboardChevron } from "@/assets/icons";
import { GlassView } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface LeaderboardCardProps {
  title: string;
  subtitle: string;
  onPress?: () => void;
}

const LeaderboardCard = ({ title, subtitle, onPress }: LeaderboardCardProps) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
  >
    <GlassView
      pointerEvents="none"
      glassEffectStyle="regular"
      colorScheme="dark"
      style={styles.glass}
    />
    <LinearGradient
      pointerEvents="none"
      colors={["rgba(201, 168, 76, 0.25)", "rgba(241, 203, 48, 0.25)"]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.gradient}
    />

    <View style={styles.row}>
      <View style={styles.textCol}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle.toUpperCase()}
        </Text>
      </View>
      <LeaderboardChevron width={14.667} height={22} />
    </View>

    <View pointerEvents="none" style={styles.awardWrap}>
      <LeaderboardAward width={54} height={71} />
    </View>
  </Pressable>
);

export default LeaderboardCard;

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    overflow: "hidden",
    backgroundColor: COLORS.neutral.black2,
    minHeight: 78,
    justifyContent: "center",
  },
  glass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  textCol: {
    flex: 1,
    gap: 8,
  },
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
    color: COLORS.primary.dark,
  },
  awardWrap: {
    position: "absolute",
    top: "50%",
    right: 48,
    marginTop: -35,
  },
});
