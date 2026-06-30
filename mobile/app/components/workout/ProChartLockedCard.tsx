import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { PasswordLockIcon } from "@/assets/icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import PressableScale from "@/app/components/common/PressableScale";
import GlassFill from "@/app/components/common/GlassFill";
import type { HomeStackParamList } from "@/app/navigation/types";

const FIGMA_W = 353;
const FIGMA_H = 200;

type Nav = NativeStackNavigationProp<HomeStackParamList>;

interface ProChartLockedCardProps {
  /** Which tier unlocks this chart. Defaults to `"pro"` (12-week exercise
   *  progression). Use `"standard"` for the weight-trend chart on the
   *  Progress screen. */
  requiredTier?: "standard" | "pro";
}

const ProChartLockedCard = ({ requiredTier = "pro" }: ProChartLockedCardProps) => {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();

  return (
    <View style={styles.wrap}>
      <View style={styles.iconBadge}>
        <PasswordLockIcon width={20} height={20} />
      </View>

      <View style={styles.copy}>
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
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
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
  wrap: {
    width: "100%",
    aspectRatio: FIGMA_W / FIGMA_H,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.neutral.charcoal,
    backgroundColor: COLORS.neutral.black3,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 16,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(201,168,76,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    alignItems: "center",
    gap: 4,
  },
  title: {
    fontFamily: FONTS.semiBold,
    fontWeight: "600",
    fontSize: 16,
    lineHeight: 19.2,
    color: COLORS.neutral.white,
    textAlign: "center",
  },
  body: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 16,
    color: "rgba(240,240,240,0.6)",
    textAlign: "center",
  },
  cta: {
    height: 36,
    paddingHorizontal: 20,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  ctaText: {
    fontFamily: FONTS.semiBold,
    fontWeight: "600",
    fontSize: 13,
    color: COLORS.neutral.white,
    letterSpacing: 0.26,
  },
});
