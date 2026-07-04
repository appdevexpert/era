import CalendarMonth from "@/app/components/common/CalendarMonth";
import PrimaryButton from "@/app/components/common/PrimaryButton";
import WeightRuler from "@/app/components/workout/WeightRuler";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { formatLongDate } from "@/app/utils/calendar";
import { todayIso } from "@/app/utils/programWeek";
import { EditPen } from "@/assets/icons";
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
import { StyleSheet, Text, View } from "react-native";
import PressableScale from "@/app/components/common/PressableScale";
import { useTranslation } from "react-i18next";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

export type WeightUnit = "kg" | "lb";

export interface LogWeightBottomSheetRef {
  show: () => void;
  close: () => void;
}

interface LogWeightBottomSheetProps {
  initialKg?: number;
  /** `loggedForDate` is the picked calendar day (YYYY-MM-DD), today by default. */
  onLog?: (value: number, unit: WeightUnit, loggedForDate: string) => void;
}

type SheetMode = "weight" | "date";

const KG_TO_LB = 2.2046226218;

const TRACK_WIDTH = 125;
const PILL_WIDTH = TRACK_WIDTH / 2;
const PILL_RIGHT_OFFSET = TRACK_WIDTH - PILL_WIDTH;

// Spring tuned for a smooth "groove" feel — buttery glide with a hint of
// natural easing at the end, no overshoot.
const TOGGLE_SPRING = {
  damping: 26,
  stiffness: 180,
  mass: 1.1,
  overshootClamping: true,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01,
} as const;

const LogWeightBottomSheet = forwardRef<
  LogWeightBottomSheetRef,
  LogWeightBottomSheetProps
>(function LogWeightBottomSheet({ initialKg = 65, onLog }, ref) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const { t, i18n } = useTranslation();

  const [unit, setUnit] = useState<WeightUnit>("kg");
  const [value, setValue] = useState<number>(initialKg);
  const [mode, setMode] = useState<SheetMode>("weight");
  const [selectedDate, setSelectedDate] = useState<string>(() => todayIso());

  const today = useMemo(() => todayIso(), []);
  const dateLabel = useMemo(
    () => formatLongDate(selectedDate, i18n.language),
    [selectedDate, i18n.language],
  );

  const togglePos = useSharedValue<number>(0);
  useEffect(() => {
    togglePos.value = withSpring(
      unit === "kg" ? 0 : PILL_RIGHT_OFFSET,
      TOGGLE_SPRING,
    );
  }, [unit, togglePos]);

  const pillAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: togglePos.value }],
  }));

  useImperativeHandle(ref, () => ({
    show: () => {
      // Always open fresh: weight view, dated today.
      setMode("weight");
      setSelectedDate(todayIso());
      sheetRef.current?.present();
    },
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

  const handleUnitToggle = (next: WeightUnit) => {
    if (next === unit) return;
    setUnit(next);
    if (next === "lb") setValue((v) => Math.round(v * KG_TO_LB));
    else setValue((v) => Math.round(v / KG_TO_LB));
  };

  const handleLog = () => {
    onLog?.(value, unit, selectedDate);
    sheetRef.current?.dismiss();
  };

  const handleDatePicked = (iso: string) => {
    setSelectedDate(iso);
    setMode("weight");
  };

  const range = unit === "kg" ? { min: 30, max: 200 } : { min: 66, max: 440 };
  const unitLabel = unit === "kg"
    ? t("progress.logWeightSheet.unitKg")
    : t("progress.logWeightSheet.unitLbs");

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
      {/* Decorative gold glow blobs — subtle gold tint bleeding from the edges */}
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
          {/* Header — title swaps with the mode; the date row is tappable and
              opens the calendar picker. */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>
              {mode === "date"
                ? t("progress.logWeightSheet.selectDate")
                : t("progress.logWeightSheet.title")}
            </Text>
            {mode === "weight" ? (
              <PressableScale
                onPress={() => setMode("date")}
                hitSlop={8}
                style={styles.dateRow}
              >
                <Text style={styles.dateText}>{dateLabel}</Text>
                <EditPen width={16} height={16} />
              </PressableScale>
            ) : null}
          </View>

          {mode === "date" ? (
            /* Date picker */
            <View style={styles.calendarWrap}>
              <CalendarMonth
                selectedDate={selectedDate}
                today={today}
                maxDate={today}
                onSelect={handleDatePicked}
              />
            </View>
          ) : (
            <>
              {/* Unit toggle — left-aligned */}
              <View style={styles.unitToggleWrap}>
                <PressableScale
                  onPress={() => handleUnitToggle(unit === "kg" ? "lb" : "kg")}
                  style={styles.unitTrack}
                >
                  <Animated.View style={[styles.unitPill, pillAnimatedStyle]} />
                  <View style={styles.unitHalf} pointerEvents="none">
                    <Text style={styles.unitHalfText}>
                      {t("progress.logWeightSheet.unitKg")}
                    </Text>
                  </View>
                  <View style={styles.unitHalf} pointerEvents="none">
                    <Text style={styles.unitHalfText}>
                      {t("progress.logWeightSheet.unitLbs")}
                    </Text>
                  </View>
                </PressableScale>
              </View>

              {/* Value + ruler (gap 52) */}
              <View style={styles.valueRulerCol}>
                <View style={styles.valueCol}>
                  <Text style={styles.valueNumber}>{value}</Text>
                  <Text style={styles.valueUnit}>{unitLabel}</Text>
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
            </>
          )}
        </View>

        {/* CTA — only in weight mode; picking a date auto-returns here. */}
        {mode === "weight" ? (
          <View style={styles.ctaWrap}>
            <PrimaryButton
              label={t("progress.logWeightSheet.cta")}
              onPress={handleLog}
            />
          </View>
        ) : null}
      </BottomSheetView>
    </BottomSheetModal>
  );
});

LogWeightBottomSheet.displayName = "LogWeightBottomSheet";

export default LogWeightBottomSheet;

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
    gap: 52
  },
  inner: {
    width: "100%",
    alignItems: "center",
    gap: 24,
  },
  valueRulerCol: {
    // Explicit width so the ruler's horizontal ScrollView gets a definite
    // width to measure. Without it the ScrollView sizes to its own (padded)
    // content, which feeds back into onLayout → infinite setState loop.
    width: "100%",
    alignItems: "center",
    gap: 52,
  },

  // Decorative glows — subtle gold tint bleeding from the corners
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

  // Header
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
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(240, 240, 240, 0.5)",
    lineHeight: 16.8,
    textTransform: "uppercase",
  },
  calendarWrap: {
    width: "100%",
    paddingHorizontal: 20,
    paddingTop: 4,
  },

  // Unit toggle — left-aligned, full-width parent
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

  // Value
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

  // Ruler
  rulerWrap: {
    width: "100%",
  },

  // CTA
  ctaWrap: {
    width: "100%",
    paddingHorizontal: 20,
  },
});
