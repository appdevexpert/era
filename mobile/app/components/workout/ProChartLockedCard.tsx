import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { PasswordLockIcon } from "@/assets/icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import PressableScale from "@/app/components/common/PressableScale";
import GlassFill from "@/app/components/common/GlassFill";
import type { HomeStackParamList } from "@/app/navigation/types";

type Nav = NativeStackNavigationProp<HomeStackParamList>;

interface ProChartLockedCardProps {
  /** Which tier unlocks this chart. Defaults to `"pro"` (12-week exercise
   *  progression). Use `"standard"` for the weight-trend chart on the
   *  Progress screen. */
  requiredTier?: "standard" | "pro";
}

// Absolute-positioned overlay that sits ON TOP of the real chart. The chart
// still renders underneath so it bleeds through the blur (matches Figma).
const ProChartLockedCard = ({ requiredTier = "pro" }: ProChartLockedCardProps) => {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();

  return (
    <View style={styles.overlay}>
      <BlurView
        intensity={24}
        tint="dark"
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
      {/* Android's experimental blur is Android 12+ only and can be janky.
          A near-opaque tint on Android guarantees the chart stays hidden on
          every version. iOS keeps the softer 0.24 dim + real backdrop blur. */}
      <View
        style={[
          styles.dim,
          Platform.OS === "android" && { backgroundColor: "rgba(10,10,10,0.88)" },
        ]}
      />

      <View style={styles.copyBlock}>
        <View style={styles.iconBadge}>
          <LinearGradient
            colors={["rgba(10,10,10,0.12)", "rgba(201,168,76,0.12)"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <PasswordLockIcon width={32} height={32} />
        </View>
        <Text style={styles.title}>
          {t(`history.chartLocked.${requiredTier}.title`)}
        </Text>
        <Text style={styles.body}>
          {t(`history.chartLocked.${requiredTier}.body`)}
        </Text>
      </View>

      <PressableScale
        style={styles.cta}
        onPress={() => navigation.navigate("Paywall")}
      >
        <LinearGradient
          colors={[
            "rgba(201,168,76,0.6)",
            "rgba(247,224,111,0.6)",
            "rgba(252,243,192,0.6)",
          ]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <GlassFill />
        <Text style={styles.ctaText}>
          {t(`history.chartLocked.${requiredTier}.cta`)}
        </Text>
      </PressableScale>
    </View>
  );
};

export default ProChartLockedCard;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#1E1E1E",
    overflow: "hidden",
    paddingHorizontal: 20,
    paddingTop: 31,
    paddingBottom: 20,
    justifyContent: "space-between",
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,10,10,0.24)",
  },
  copyBlock: {
    alignItems: "center",
    gap: 16,
  },
  iconBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: "#1E1E1E",
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  title: {
    fontFamily: FONTS.display,
    fontWeight: "500",
    fontSize: 20,
    lineHeight: 24,
    color: COLORS.neutral.white,
    textAlign: "center",
  },
  body: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    lineHeight: 22.4,
    color: "rgba(240,240,240,0.6)",
    textAlign: "center",
    width: 290,
  },
  cta: {
    height: 48,
    borderRadius: 138,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  ctaText: {
    fontFamily: FONTS.semiBold,
    fontWeight: "600",
    fontSize: 16,
    color: "#F0F0F0",
    letterSpacing: 0.32,
  },
});
