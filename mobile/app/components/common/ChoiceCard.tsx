import GlassFill from "@/app/components/common/GlassFill";
import PressableScale from "@/app/components/common/PressableScale";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const Radio = ({ selected }: { selected: boolean }) => {
  const progress = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(selected ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [selected, progress]);

  const ringStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      progress.value,
      [0, 1],
      [COLORS.alpha.white50, COLORS.primary.dark],
    ),
  }));

  const dotStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: progress.value }],
  }));

  return (
    <Animated.View style={[styles.radio, ringStyle]}>
      <Animated.View style={[styles.radioDot, dotStyle]} />
    </Animated.View>
  );
};

const Bullet = ({ children }: { children: string }) => (
  <View style={styles.bulletRow}>
    <View style={styles.bulletDot} />
    <Text style={styles.bulletText}>{children}</Text>
  </View>
);

interface ChoiceCardProps {
  title: string;
  badge: string;
  bullets: string[];
  selected: boolean;
  onSelect: () => void;
}

const ChoiceCard = ({ title, badge, bullets, selected, onSelect }: ChoiceCardProps) => (
  <PressableScale style={styles.card} onPress={onSelect}>
    <View style={styles.cardHeader}>
      <View style={styles.cardHeaderLeft}>
        <Radio selected={selected} />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <View style={styles.badge}>
        <LinearGradient
          colors={[
            "rgba(252,243,192,0.24)",
            "rgba(247,224,111,0.24)",
            "rgba(201,168,76,0.24)",
          ]}
          start={{ x: 1, y: 0.5 }}
          end={{ x: 0, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
        <GlassFill style={styles.badgeGlass} />
        <Text style={styles.badgeText}>{badge.toUpperCase()}</Text>
      </View>
    </View>
    <View style={styles.divider} />
    <View style={styles.bullets}>
      {bullets.map((b, i) => (
        <Bullet key={i}>{b}</Bullet>
      ))}
    </View>
  </PressableScale>
);

export default ChoiceCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.neutral.black3,
    borderWidth: 1,
    borderColor: COLORS.neutral.charcoal,
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  radio: {
    width: 21,
    height: 21,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: {
    width: 11,
    height: 11,
    borderRadius: 999,
    backgroundColor: COLORS.primary.dark,
  },
  cardTitle: {
    fontFamily: FONTS.display,
    fontSize: 20,
    fontWeight: "500",
    color: COLORS.neutral.white,
    lineHeight: 24,
    flexShrink: 1,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeGlass: {
    borderRadius: 999,
  },
  badgeText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: "400",
    color: COLORS.neutral.white,
    letterSpacing: 0.48,
    lineHeight: 14.4,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.neutral.charcoal,
  },
  bullets: {
    gap: 12,
  },
  bulletRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  bulletDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: COLORS.primary.dark,
    marginTop: 9,
  },
  bulletText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 16,
    fontWeight: "400",
    color: COLORS.alpha.white72,
    lineHeight: 22.4,
  },
});
