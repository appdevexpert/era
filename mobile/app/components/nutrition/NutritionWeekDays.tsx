import GlassFill from "@/app/components/common/GlassFill";
import PressableScale from "@/app/components/common/PressableScale";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";
import Animated, { Easing, LinearTransition } from "react-native-reanimated";

// Plain smooth slide — no bounce. 220ms with ease-out keeps the row from
// feeling rubbery while still soft enough to read as a transition.
const PILL_LAYOUT = LinearTransition.duration(220).easing(Easing.out(Easing.cubic));

export type NutritionDayStatus =
  | "before_program"
  | "past_completed"
  | "past_missed"
  | "today"
  | "future";

export interface NutritionDayItem {
  /** ISO date, e.g. "2026-06-25". Doubles as the React key. */
  key: string;
  /** Three-letter weekday label, e.g. "Mon". */
  label: string;
  /** Two-digit day-of-month, e.g. "05". */
  date: string;
  status: NutritionDayStatus;
  /** True when this pill is the currently-viewed date (scales up). */
  selected: boolean;
}

interface NutritionWeekDaysProps {
  days: NutritionDayItem[];
  onDayPress?: (day: NutritionDayItem) => void;
}

// ---------------- Tokens (mirror Figma node 6671:6788) ----------------

const COLOR_NUM = {
  past_completed: "#3dca7a",
  past_missed: "#e67777",
  today: "#c9a84c",
} as const;

const GRADIENT_BOTTOM = {
  past_completed: "rgba(61,202,122,0.12)",
  past_missed: "rgba(230,119,119,0.12)",
  today: "rgba(201,168,76,0.12)",
} as const;

const BADGE_TINT = {
  past_completed: "rgba(61,202,122,0.2)",
  past_missed: "rgba(230,119,119,0.2)",
  today: "rgba(201,168,76,0.2)",
} as const;

const SELECTED_OUTER = {
  past_completed: "rgba(61,202,122,0.24)",
  past_missed: "rgba(230,119,119,0.24)",
  today: "rgba(201,168,76,0.35)",
  future: "rgba(201,168,76,0.35)",
} as const;

const SELECTED_BADGE = {
  past_completed: "rgba(61,202,122,0.8)",
  past_missed: "#e67777",
  today: "rgba(201,168,76,0.6)",
  future: "rgba(201,168,76,0.6)",
} as const;

// ---------------- Component ------------------------------------------

const NutritionWeekDays = ({ days, onDayPress }: NutritionWeekDaysProps) => {
  // Light haptic on every pill tap — matches the rest of the app's tactile
  // feedback (BottomWorkoutTabBar, WeightStep) and is intentionally subtle
  // so rapid date browsing doesn't feel buzzy. Fire-and-forget; failures on
  // unsupported devices are silently ignored by expo-haptics.
  const handlePress = (day: NutritionDayItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onDayPress?.(day);
  };
  return (
    <View style={styles.container}>
      {days.map((day) => (
        <DayPill key={day.key} day={day} onPress={() => handlePress(day)} />
      ))}
    </View>
  );
};

const DayPill = ({
  day,
  onPress,
}: {
  day: NutritionDayItem;
  onPress?: () => void;
}) => {
  const { status, selected, label, date } = day;

  // Pre-program lives on its own render path because its visual is
  // fundamentally different (dashed border, no glass), and the user rarely
  // taps these dates. Keeping it separate doesn't cost smoothness on the
  // common past ↔ today ↔ future ↔ selected switches.
  if (status === "before_program") {
    return (
      <Animated.View layout={PILL_LAYOUT}>
        <PressableScale onPress={onPress} style={styles.pillDashed}>
          <Text style={[styles.label, styles.labelDim]}>{label}</Text>
          <View style={[styles.badge, styles.badgeDimmed]}>
            <Text style={styles.dateWhite} numberOfLines={1}>{date}</Text>
          </View>
        </PressableScale>
      </Animated.View>
    );
  }

  // Unified structure for the four common states — GlassFill, status fill
  // layer, and gradient layer are all rendered every render so React reuses
  // them across re-renders (no native blur layer remount, no LinearGradient
  // remount). Visibility is driven by `opacity` so the children stay mounted
  // and the layout transition runs without internal jank.
  const isSelected = selected;
  const showGradient =
    !isSelected &&
    (status === "past_completed" ||
      status === "past_missed" ||
      status === "today");
  const showStatusFill = isSelected;
  const showDarkBadge = status === "future" && !isSelected;

  const pillStyle = isSelected ? styles.pillSelected : styles.pillBase;
  const glassStyle = isSelected ? styles.glassFillSelected : styles.glassFill;
  const labelStyle = isSelected ? styles.labelSelected : styles.label;
  const labelColorStyle = styles.labelWhite;
  const badgeStyle = isSelected ? styles.badgeSelected : styles.badge;
  const dateStyle = isSelected ? styles.dateSelected : styles.date;

  const badgeBg = isSelected
    ? SELECTED_BADGE[status]
    : showDarkBadge
      ? "#1B1B1B"
      : status !== "future"
        ? BADGE_TINT[status]
        : "#1B1B1B";

  const dateColor = isSelected
    ? "#ffffff"
    : status === "future"
      ? "#f0f0f0"
      : COLOR_NUM[status];

  // Gradient bottom color falls back to a transparent placeholder when not
  // visible — the LinearGradient component stays mounted but invisible.
  const gradientBottom =
    status === "past_completed" || status === "past_missed" || status === "today"
      ? GRADIENT_BOTTOM[status]
      : "rgba(10,10,10,0)";
  // `status` is narrowed to the four non-pre-program states above, so the
  // SELECTED_OUTER lookup is always defined.
  const statusFillColor = SELECTED_OUTER[status];

  return (
    <Animated.View layout={PILL_LAYOUT}>
      <PressableScale onPress={onPress} style={pillStyle}>
        <GlassFill effect="clear" scheme="light" style={glassStyle} />
        {/* Status fill — kept mounted, faded in only when selected so the
            blur layer doesn't bounce in/out on every selection change. */}
        <View
          pointerEvents="none"
          style={[
            styles.fill,
            { backgroundColor: statusFillColor, opacity: showStatusFill ? 1 : 0 },
          ]}
        />
        {/* Subtle bottom-tinted gradient for past/today non-selected. */}
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(10,10,10,0.12)", gradientBottom]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[styles.gradient, { opacity: showGradient ? 1 : 0 }]}
        />
        <Text style={[labelStyle, labelColorStyle]}>{label}</Text>
        <View style={[badgeStyle, { backgroundColor: badgeBg }]}>
          <Text style={[dateStyle, { color: dateColor }]} numberOfLines={1}>
            {date}
          </Text>
        </View>
      </PressableScale>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  // No fixed widths on non-selected pills — they auto-size to their content
  // (3-letter weekday + 2-digit date both render to roughly the same width),
  // matching the existing WeekDaySelector behavior. Selected pill keeps an
  // explicit larger width so the scale-up is unambiguous.
  pillBase: {
    alignItems: "center",
    gap: 4.6,
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderRadius: 76.899,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3.076 },
    shadowOpacity: 0.25,
    shadowRadius: 3.076,
    elevation: 3,
  },
  pillSelected: {
    width: 48,
    alignItems: "center",
    gap: 5.332,
    paddingHorizontal: 9.244,
    paddingVertical: 12.867,
    borderRadius: 88.861,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3.554 },
    shadowOpacity: 0.25,
    shadowRadius: 3.554,
    elevation: 4,
  },
  pillDashed: {
    alignItems: "center",
    gap: 4.6,
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderRadius: 76.899,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: COLORS.neutral.charcoal,
    overflow: "hidden",
  },
  // Future pill — matches Figma's transparent shell (no glass, no shadow).
  pillFuture: {
    alignItems: "center",
    gap: 4.6,
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderRadius: 76.899,
    overflow: "hidden",
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 76.899,
  },
  glassFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 76.899,
  },
  glassFillSelected: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 88.861,
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 88.861,
  },
  label: {
    fontSize: 10,
    fontFamily: FONTS.medium,
    fontWeight: "500",
    textAlign: "center",
  },
  labelWhite: {
    color: "#ffffff",
  },
  labelDim: {
    color: "rgba(240,240,240,0.5)",
  },
  labelSelected: {
    fontSize: 11.556,
    fontFamily: FONTS.medium,
    fontWeight: "500",
    textAlign: "center",
    color: "#ffffff",
  },
  badge: {
    width: "100%",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 77,
    alignItems: "center",
    justifyContent: "center",
  },
  // Solid dark — matches the inner circle on WorkoutPlanScreen's future
  // day pill so the future state reads identically across the app.
  badgeDark: {
    backgroundColor: "#1B1B1B",
  },
  badgeDimmed: {
    backgroundColor: "rgba(30,30,30,0.75)",
    opacity: 0.6,
  },
  badgeSelected: {
    width: "100%",
    paddingVertical: 7.109,
    paddingHorizontal: 7.109,
    borderRadius: 88.861,
    alignItems: "center",
    justifyContent: "center",
  },
  date: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    fontWeight: "600",
    textAlign: "center",
    minWidth: 16,
  },
  dateWhite: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    fontWeight: "600",
    textAlign: "center",
    color: "#f0f0f0",
    minWidth: 16,
  },
  dateSelected: {
    fontSize: 13.867,
    fontFamily: FONTS.semiBold,
    fontWeight: "600",
    textAlign: "center",
    color: "#ffffff",
    minWidth: 18,
  },
});

export default NutritionWeekDays;
