import { COLORS, GRADIENTS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { AltArrowLeft, FluentPremium, ProfileUserCircle } from "@/assets/icons";
import { GlassView } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import { Platform, StyleSheet, Text, View } from "react-native";
import PressableScale from "@/app/components/common/PressableScale";
import { getGlassFallbackStyle } from "@/app/components/common/GlassFill";

export interface ProfileCardProps {
  name: string;
  uid: string;
  metaLine: string;
  subscriptionLabel: string;
  manageLabel: string;
  daysLeftLabel: string;
  progress?: number;
  onManagePress?: () => void;
  /**
   * Toggles the subscription/progress footer. Set to false in builds where
   * paywall/subscription flows are disabled (see FEATURE_FLAGS.ENABLE_PAYWALL).
   * Defaults to true so existing callers stay unchanged.
   */
  showSubscription?: boolean;
}

const
ProfileCard = ({
  name,
  uid,
  metaLine,
  subscriptionLabel,
  manageLabel,
  daysLeftLabel,
  progress = 0.78,
  onManagePress,
  showSubscription = true,
}: ProfileCardProps) => (
  <View style={styles.card}>
    {Platform.OS === "ios" ? (
      <GlassView
        pointerEvents="none"
        glassEffectStyle="regular"
        colorScheme="dark"
        style={styles.glass}
      />
    ) : (
      <View pointerEvents="none" style={[styles.glass, getGlassFallbackStyle("regular", "dark")]} />
    )}
    <LinearGradient
      pointerEvents="none"
      colors={[
        "rgba(252, 243, 192, 0.28)",
        "rgba(247, 224, 111, 0.16)",
        "rgba(201, 168, 76, 0.28)",
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradientOverlay}
    />

    <View style={[styles.top, !showSubscription && styles.topNoBorder]}>
      <View style={styles.avatar}>
        <ProfileUserCircle width={54} height={54} />
      </View>
      <View style={styles.meta}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.uid} numberOfLines={1}>
          {uid}
        </Text>
        <Text style={styles.metaLine} numberOfLines={1}>
          {metaLine}
        </Text>
      </View>
    </View>

    {showSubscription && <View style={styles.bottom}>
      <View style={styles.subscriptionRow}>
        <View style={styles.subscriptionLeft}>
          <FluentPremium width={24} height={24} />
          <Text style={styles.freeTrialText} numberOfLines={1}>
            {subscriptionLabel}
          </Text>
        </View>
        <PressableScale
          onPress={onManagePress}
          hitSlop={8}
          style={styles.subscriptionRight}
        >
          <Text style={styles.manageText}>{manageLabel}</Text>
          <View style={styles.chevronWrap}>
            <AltArrowLeft width={18} height={18} />
          </View>
        </PressableScale>
      </View>

      <View style={styles.progressRow}>
        <View style={styles.progressTrack}>
          <LinearGradient
            colors={GRADIENTS.primary}
            start={{ x: 1, y: 0.5 }}
            end={{ x: 0, y: 0.5 }}
            style={[
              styles.progressFill,
              { width: `${Math.min(Math.max(progress, 0), 1) * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.daysLeftText}>{daysLeftLabel}</Text>
      </View>
    </View>}
  </View>
);

export default ProfileCard;

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: COLORS.neutral.black2,
  },
  glass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.16)",
  },
  topNoBorder: {
    borderBottomWidth: 0,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 90,
    backgroundColor: "rgba(201, 168, 76, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  meta: {
    flex: 1,
    gap: 8,
  },
  name: {
    fontFamily: FONTS.display,
    fontSize: 24,
    fontWeight: "500",
    color: COLORS.neutral.white,
    lineHeight: 28,
  },
  uid: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: "rgba(240, 240, 240, 0.6)",
    lineHeight: 17,
  },
  metaLine: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.neutral.white,
    lineHeight: 17,
  },
  bottom: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  subscriptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  subscriptionLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  subscriptionRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  freeTrialText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary.base,
  },
  manageText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.neutral.white,
  },
  chevronWrap: {
    transform: [{ rotate: "180deg" }],
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 24,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 100,
    backgroundColor: "rgba(240, 240, 240, 0.08)",
    overflow: "hidden",
  },
  progressFill: {
    height: 6,
    borderRadius: 100,
  },
  daysLeftText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.neutral.white,
  },
});
