import { FONTS } from "@/app/constants/fonts";
import type { HomeStackParamList } from "@/app/navigation/types";
import { selectLifetimeVolumeKg } from "@/app/stores/selectors/rewardSelectors";
import type { RootState } from "@/app/stores/store";
import { ArrowBack } from "@/assets/icons";
import { TrophyGold } from "@/assets/images";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import * as Sharing from "expo-sharing";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Dimensions,
  Image,
  Platform,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient as SvgGradient,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { useSelector } from "react-redux";
import GlassFill from "@/app/components/common/GlassFill";
import PressableScale from "@/app/components/common/PressableScale";

const SCREEN_WIDTH = Dimensions.get("window").width;
// Same "wide cut" hero as the Session Complete screen: the medal is wider than
// the screen and pulled up so the ribbon bleeds past the status bar.
const TROPHY_SIZE = Math.round(SCREEN_WIDTH * 1.075);
const TROPHY_TOP_OFFSET = -90;

// Fun "that's equivalent to" reference weights (kg). Tuned to roughly match the
// Figma sample (132,450 kg ≈ 22 elephants, 88 cars, 1,760 people).
const ELEPHANT_KG = 6000;
const CAR_KG = 1500;
const PERSON_KG = 75;

// Translucent gold gradient for the Share CTA (Figma 7134:35878 — the base
// gold at 60% opacity). Hoisted so expo-linear-gradient keeps a stable ref.
const SHARE_GRADIENT = [
  "rgba(252,243,192,0.6)",
  "rgba(247,224,111,0.6)",
  "rgba(201,168,76,0.6)",
] as const;
const GRADIENT_START = { x: 1, y: 0.5 };
const GRADIENT_END = { x: 0, y: 0.5 };
const TOP_GLOW = ["rgba(201,168,76,0.4)", "rgba(201,168,76,0)"] as const;

/** Rounds and adds thousands separators — e.g. 58240 → "58,240". */
const formatThousands = (n: number) =>
  Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** Classic three-node share glyph, tinted to match the button text. */
const ShareIcon = ({ color }: { color: string }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Line x1={8.6} y1={10.8} x2={15.4} y2={6.4} stroke={color} strokeWidth={1.8} />
    <Line x1={8.6} y1={13.2} x2={15.4} y2={17.6} stroke={color} strokeWidth={1.8} />
    <Circle cx={18} cy={5} r={3} fill={color} />
    <Circle cx={6} cy={12} r={3} fill={color} />
    <Circle cx={18} cy={19} r={3} fill={color} />
  </Svg>
);

const LifetimeVolumeScreen = () => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<HomeStackParamList>>();

  const lifetimeVolumeKg = useSelector(selectLifetimeVolumeKg);
  const program = useSelector((s: RootState) => s.workout.overview?.program);

  // The card region that gets snapshotted for image sharing (excludes the
  // status bar, back button, and Share button).
  const cardRef = useRef<View>(null);

  const formattedVolume = formatThousands(lifetimeVolumeKg);

  // Eyebrow — "MALE ADVANCED PLAN" — from the assigned program's gender/level.
  const gender = program?.gender;
  const level = program?.level;
  const planEyebrow =
    gender && level
      ? t("progress.lifetimeVolume.planEyebrow", {
          gender: t(`profile.gender.${gender}`),
          level: t(`profile.level.${level}`),
        })
      : null;

  const equivalent = t("progress.lifetimeVolume.equivalentValue", {
    elephants: formatThousands(lifetimeVolumeKg / ELEPHANT_KG),
    cars: formatThousands(lifetimeVolumeKg / CAR_KG),
    people: formatThousands(lifetimeVolumeKg / PERSON_KG),
  });

  const onShare = async () => {
    const message = t("progress.lifetimeVolume.shareMessage", {
      volume: formattedVolume,
    });
    try {
      // Snapshot the card region to a PNG file.
      const uri = await captureRef(cardRef, { format: "png", quality: 1 });

      if (Platform.OS === "ios") {
        // iOS share sheet carries both the image and the caption.
        await Share.share({ url: uri, message });
      } else if (await Sharing.isAvailableAsync()) {
        // Android file-share (image only — the OS chooser doesn't take a caption).
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: message,
        });
      } else {
        await Share.share({ message });
      }
    } catch {
      // Capture failed or the user dismissed the sheet — fall back to text.
      Share.share({ message }).catch(() => {});
    }
  };

  return (
    <View style={styles.root}>
      {/* Capture region for image sharing — dark bg + glow + medal + content */}
      <View
        ref={cardRef}
        collapsable={false}
        style={[
          styles.captureRegion,
          { marginTop: insets.top + TROPHY_TOP_OFFSET },
        ]}
      >
        <LinearGradient
          colors={TOP_GLOW}
          style={[styles.topGlow, { height: 237 + insets.top }]}
          pointerEvents="none"
        />

        {/* Medal — wide cut, ribbon bleeds past the status bar */}
        <View style={styles.trophyWrap} pointerEvents="none">
          <Image
            source={TrophyGold}
            style={{ width: TROPHY_SIZE, height: TROPHY_SIZE }}
            resizeMode="contain"
          />
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{t("progress.lifetimeVolume.title")}</Text>
          {planEyebrow ? (
            <Text style={styles.eyebrow}>{planEyebrow}</Text>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.cardLabel}>
              {t("progress.lifetimeVolume.totalWeightLifted")}
            </Text>
            <Svg height={72} width="100%">
              <Defs>
                <SvgGradient id="volGrad" x1="1" y1="0" x2="0" y2="0">
                  <Stop offset="0" stopColor="#FCF3C0" />
                  <Stop offset="0.196" stopColor="#F7E06F" />
                  <Stop offset="0.835" stopColor="#C9A84C" />
                </SvgGradient>
              </Defs>
              <SvgText
                fill="url(#volGrad)"
                fontSize={56}
                fontWeight="500"
                fontFamily={FONTS.display}
                x="50%"
                y={56}
                textAnchor="middle"
              >
                {formattedVolume}
              </SvgText>
            </Svg>
            <Text style={styles.cardUnit}>
              {t("progress.lifetimeVolume.kilograms")}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.equivalentBlock}>
            <Text style={styles.equivalentLabel}>
              {t("progress.lifetimeVolume.equivalentTo")}
            </Text>
            <Text style={styles.equivalentValue}>{equivalent}</Text>
          </View>
        </View>
      </View>

      {/* Flexible gap pushes the Share button to the bottom */}
      <View style={styles.spacer} />

      {/* Share CTA pinned to the bottom */}
      <View
        style={[styles.shareContainer, { paddingBottom: insets.bottom + 16 }]}
      >
        <PressableScale onPress={onShare} style={styles.shareButton}>
          <LinearGradient
            pointerEvents="none"
            colors={SHARE_GRADIENT}
            start={GRADIENT_START}
            end={GRADIENT_END}
            style={styles.shareFill}
          />
          <GlassFill style={styles.shareFill} />
          <View style={styles.shareRow}>
            <ShareIcon color="#F0F0F0" />
            <Text style={styles.shareLabel}>
              {t("progress.lifetimeVolume.shareButton")}
            </Text>
          </View>
        </PressableScale>
      </View>

      {/* Back button */}
      <PressableScale
        onPress={() => navigation.goBack()}
        hitSlop={12}
        style={[styles.backButton, { top: insets.top + 8 }]}
      >
        <ArrowBack width={24} height={24} />
      </PressableScale>
    </View>
  );
};

export default LifetimeVolumeScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  captureRegion: {
    backgroundColor: "#0A0A0A",
    paddingBottom: 24,
  },
  spacer: {
    flex: 1,
  },
  topGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  trophyWrap: {
    alignItems: "center",
    // Pulls the title up under the medal's transparent bottom padding.
    marginBottom: -24,
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 32,
    fontWeight: "500",
    color: "#F0F0F0",
    textAlign: "center",
  },
  eyebrow: {
    marginTop: 8,
    fontFamily: FONTS.regular,
    fontSize: 14,
    letterSpacing: 0.56,
    textTransform: "uppercase",
    color: "#C9A84C",
    textAlign: "center",
  },
  card: {
    marginTop: 28,
    width: "100%",
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#1E1E1E",
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  cardLabel: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
  },
  cardUnit: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    letterSpacing: 0.56,
    textTransform: "uppercase",
    color: "rgba(240,240,240,0.5)",
    textAlign: "center",
  },
  divider: {
    marginTop: 28,
    height: 1,
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  equivalentBlock: {
    marginTop: 28,
    width: "100%",
    paddingHorizontal: 24,
    gap: 12,
  },
  equivalentLabel: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    letterSpacing: 0.56,
    textTransform: "uppercase",
    color: "rgba(240,240,240,0.5)",
    textAlign: "center",
  },
  equivalentValue: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    lineHeight: 22.4,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
  },
  shareContainer: {
    paddingHorizontal: 20,
  },
  shareButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 138,
    overflow: "hidden",
  },
  shareFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 138,
  },
  shareRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  shareLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0.36,
    color: "#F0F0F0",
  },
  backButton: {
    position: "absolute",
    left: 20,
  },
});
