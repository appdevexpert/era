import PrimaryButton from "@/app/components/common/PrimaryButton";
import WeightRuler from "@/app/components/workout/WeightRuler";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

export type HeightUnit = "cm" | "ft";

export interface LogHeightBottomSheetRef {
  show: () => void;
  close: () => void;
}

interface LogHeightBottomSheetProps {
  /** Initial height in centimeters. */
  initialCm?: number;
  onLog?: (value: number, unit: HeightUnit) => void;
}

const CM_PER_INCH = 2.54;

const formatToday = () => {
  const d = new Date();
  const day = d.getDate();
  const month = d.toLocaleString("en-US", { month: "long" }).toUpperCase();
  const year = d.getFullYear();
  return `${day} ${month}, ${year}`;
};

const TRACK_WIDTH = 125;
const PILL_WIDTH = TRACK_WIDTH / 2;
const PILL_RIGHT_OFFSET = TRACK_WIDTH - PILL_WIDTH;

const TOGGLE_SPRING = {
  damping: 26,
  stiffness: 180,
  mass: 1.1,
  overshootClamping: true,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01,
} as const;

const formatFt = (totalInches: number) => {
  const ft = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches - ft * 12);
  return `${ft}ft ${inches}in`;
};

const LogHeightBottomSheet = forwardRef<
  LogHeightBottomSheetRef,
  LogHeightBottomSheetProps
>(function LogHeightBottomSheet({ initialCm = 180, onLog }, ref) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const { t } = useTranslation();
  const dateLabel = useMemo(formatToday, []);

  const [unit, setUnit] = useState<HeightUnit>("cm");
  // Value is stored in the active unit (cm or total inches).
  const [value, setValue] = useState<number>(initialCm);

  const togglePos = useSharedValue<number>(0);
  useEffect(() => {
    togglePos.value = withSpring(
      unit === "cm" ? 0 : PILL_RIGHT_OFFSET,
      TOGGLE_SPRING,
    );
  }, [unit, togglePos]);

  const pillAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: togglePos.value }],
  }));

  useImperativeHandle(ref, () => ({
    show: () => sheetRef.current?.present(),
    close: () => sheetRef.current?.dismiss(),
  }));

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.6}
        pressBehavior="close"
      />
    ),
    [],
  );

  const handleUnitToggle = (next: HeightUnit) => {
    if (next === unit) return;
    setUnit(next);
    if (next === "ft") setValue((v) => Math.round(v / CM_PER_INCH));
    else setValue((v) => Math.round(v * CM_PER_INCH));
  };

  const handleLog = () => {
    onLog?.(value, unit);
    sheetRef.current?.dismiss();
  };

  const range = unit === "cm" ? { min: 120, max: 220 } : { min: 47, max: 87 };

  const display =
    unit === "cm"
      ? { number: String(value), label: t("progress.logHeightSheet.unitCm") }
      : { number: formatFt(value), label: t("progress.logHeightSheet.unitFt") };

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={["64%"]}
      index={0}
      enableDynamicSizing={false}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
    >
      {/* Decorative gold glow blobs */}
      <View pointerEvents="none" style={styles.glowTopLeft}>
        <LinearGradient
          colors={[
            "rgba(201, 168, 76, 0.18)",
            "rgba(201, 168, 76, 0.06)",
            "rgba(201, 168, 76, 0)",
          ]}
          locations={[0, 0.5, 1]}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
          style={styles.glowFill}
        />
      </View>
      <View pointerEvents="none" style={styles.glowBottomRight}>
        <LinearGradient
          colors={[
            "rgba(201, 168, 76, 0.18)",
            "rgba(201, 168, 76, 0.06)",
            "rgba(201, 168, 76, 0)",
          ]}
          locations={[0, 0.5, 1]}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 0, y: 0 }}
          style={styles.glowFill}
        />
      </View>

      <BottomSheetView style={styles.content}>
        <View style={styles.inner}>
          <View style={styles.titleSection}>
            <Text style={styles.title}>{t("progress.logHeightSheet.title")}</Text>
            <Text style={styles.dateText}>{dateLabel}</Text>
          </View>

          <View style={styles.unitToggleWrap}>
            <Pressable
              onPress={() => handleUnitToggle(unit === "cm" ? "ft" : "cm")}
              style={styles.unitTrack}
            >
              <Animated.View style={[styles.unitPill, pillAnimatedStyle]} />
              <View style={styles.unitHalf} pointerEvents="none">
                <Text style={styles.unitHalfText}>
                  {t("progress.logHeightSheet.unitCm")}
                </Text>
              </View>
              <View style={styles.unitHalf} pointerEvents="none">
                <Text style={styles.unitHalfText}>
                  {t("progress.logHeightSheet.unitFt")}
                </Text>
              </View>
            </Pressable>
          </View>

          <View style={styles.valueRulerCol}>
            <View style={styles.valueCol}>
              <Text style={styles.valueNumber}>{display.number}</Text>
              <Text style={styles.valueUnit}>{display.label}</Text>
            </View>

            <View style={styles.rulerWrap}>
              <WeightRuler
                key={`${unit}-${range.min}-${range.max}`}
                label=""
                unit=""
                value={value}
                onValueChange={setValue}
                min={range.min}
                max={range.max}
                step={1}
                headerless
              />
            </View>
          </View>
        </View>

        <View style={styles.ctaWrap}>
          <PrimaryButton
            label={t("progress.logHeightSheet.cta")}
            onPress={handleLog}
          />
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

LogHeightBottomSheet.displayName = "LogHeightBottomSheet";

export default LogHeightBottomSheet;

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: "#111111",
    borderTopLeftRadius: 38,
    borderTopRightRadius: 38,
    borderWidth: 1,
    borderColor: COLORS.neutral.charcoal,
  },
  handle: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    width: 54,
    height: 4,
    borderRadius: 12345,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 42,
    gap: 52,
  },
  inner: {
    width: "100%",
    alignItems: "center",
    gap: 24,
  },
  valueRulerCol: {
    alignItems: "center",
    gap: 52,
  },

  glowTopLeft: {
    position: "absolute",
    top: 80,
    left: -170,
    width: 280,
    height: 280,
    borderRadius: 999,
    opacity: 0.2,
  },
  glowBottomRight: {
    position: "absolute",
    bottom: 80,
    right: -170,
    width: 280,
    height: 280,
    borderRadius: 999,
    opacity: 0.2,
  },
  glowFill: {
    flex: 1,
    borderRadius: 999,
  },

  titleSection: {
    width: "100%",
    paddingTop: 8,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.charcoal,
    gap: 8,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 22,
    fontWeight: "500",
    color: COLORS.neutral.white,
    lineHeight: 26.4,
  },
  dateText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(240, 240, 240, 0.5)",
    lineHeight: 16.8,
    textTransform: "uppercase",
  },

  unitToggleWrap: {
    width: "100%",
    paddingHorizontal: 20,
    alignItems: "flex-start",
  },
  unitTrack: {
    width: TRACK_WIDTH,
    height: 32,
    flexDirection: "row",
    backgroundColor: "rgba(201, 168, 76, 0.1)",
    borderRadius: 999,
  },
  unitPill: {
    position: "absolute",
    top: 0,
    left: 0,
    width: PILL_WIDTH,
    height: 32,
    borderRadius: 999,
    backgroundColor: "rgba(201, 168, 76, 0.8)",
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  unitHalf: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  unitHalfText: {
    fontFamily: FONTS.medium,
    fontSize: 18,
    fontWeight: "500",
    lineHeight: 24,
    color: COLORS.neutral.white,
  },

  valueCol: {
    alignItems: "center",
    gap: 6,
  },
  valueNumber: {
    fontFamily: FONTS.medium,
    fontSize: 60,
    fontWeight: "500",
    color: "#FFFFFF",
    lineHeight: 60,
    textAlign: "center",
  },
  valueUnit: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: "rgba(240, 240, 240, 0.5)",
    lineHeight: 24,
    textAlign: "center",
  },

  rulerWrap: {
    width: "100%",
  },

  ctaWrap: {
    width: "100%",
    paddingHorizontal: 20,
  },
});
