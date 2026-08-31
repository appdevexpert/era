import GlassFill from "@/app/components/common/GlassFill";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import type { MuscleGroup } from "@/app/navigation/types";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View, Platform} from "react-native";
import PressableScale from "@/app/components/common/PressableScale";

export interface DayItem {
  key: string;
  label: string;
  date: string;
  title: string;
  subtitle: string;
  muscles: MuscleGroup[];
  active?: boolean;
  completed?: boolean;
  missed?: boolean;
}

interface WeekDaySelectorProps {
  days: DayItem[];
  onDayPress?: (day: DayItem) => void;
  /**
   * When true, the dashed (future / pre-signup) pill becomes Pressable so
   * callers can preview a future day (e.g. Nutrition users planning tomorrow's
   * groceries). Defaults to false — Weights/Workout keep future days inert.
   */
  enableInactivePress?: boolean;
}

const DayPill = ({
  day,
  onPress,
  enableInactivePress,
}: {
  day: DayItem;
  onPress?: () => void;
  enableInactivePress?: boolean;
}) => {
  // State 3: Today + Completed — gold-to-green gradient with ✓
  if (day.active && day.completed) {
    return (
      <PressableScale onPress={onPress} style={styles.pillBase}>
        <GlassFill effect="clear" scheme="light" style={styles.glassFill} />
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(201, 168, 76, 0.35)", "rgba(4, 95, 16, 0.35)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.glassFill}
        />
        <Text style={styles.label}>{day.label}</Text>
        <View style={styles.checkBadge}>
          <Text style={styles.checkMark}>✓</Text>
        </View>
      </PressableScale>
    );
  }

  // State 1: Missed — dark-to-red gradient with ✕
  if (day.missed) {
    return (
      <PressableScale onPress={onPress} style={styles.pillBase}>
        <GlassFill effect="clear" scheme="light" style={styles.glassFill} />
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(10, 10, 10, 0.35)", "rgba(230, 119, 119, 0.35)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.glassFill}
        />
        <Text style={styles.label}>{day.label}</Text>
        <View style={styles.missBadge}>
          <Text style={styles.missMark}>✕</Text>
        </View>
      </PressableScale>
    );
  }

  // State 2: Past Completed — dark-to-green gradient with ✓
  if (day.completed) {
    return (
      <PressableScale onPress={onPress} style={styles.pillBase}>
        <GlassFill effect="clear" scheme="light" style={styles.glassFill} />
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(10, 10, 10, 0.35)", "rgba(4, 95, 16, 0.35)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.glassFill}
        />
        <Text style={styles.label}>{day.label}</Text>
        <View style={styles.checkBadge}>
          <Text style={styles.checkMark}>✓</Text>
        </View>
      </PressableScale>
    );
  }

  // State 4: Today + Not Completed — solid gold with date badge
  if (day.active) {
    return (
      <PressableScale onPress={onPress} style={styles.pillBase}>
        <GlassFill effect="clear" scheme="light" style={styles.glassFill} />
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(201, 168, 76, 0.35)", "rgba(201, 168, 76, 0.35)"]}
          style={styles.glassFill}
        />
        <Text style={styles.label}>{day.label}</Text>
        <View style={styles.dateBadgeActive}>
          <Text style={styles.dateTextActive}>{day.date}</Text>
        </View>
      </PressableScale>
    );
  }

  // State 5: Future / Pre-signup — dashed border with date.
  // Opt-in clickability: WeightsScreen leaves these inert, NutritionScreen
  // enables presses so users can preview tomorrow's planned meals.
  const inactiveContent = (
    <>
      <Text style={styles.labelInactive}>{day.label}</Text>
      <View style={styles.dateBadgeInactive}>
        <Text style={styles.dateTextInactive}>{day.date}</Text>
      </View>
    </>
  );

  if (enableInactivePress) {
    return (
      <PressableScale onPress={onPress} style={styles.pillInactive}>
        {inactiveContent}
      </PressableScale>
    );
  }
  return <View style={styles.pillInactive}>{inactiveContent}</View>;
};

const WeekDaySelector = ({ days, onDayPress, enableInactivePress }: WeekDaySelectorProps) => {
  return (
    <View style={styles.container}>
      {days.map((day) => (
        <DayPill
          key={day.key}
          day={day}
          onPress={() => onDayPress?.(day)}
          enableInactivePress={enableInactivePress}
        />
      ))}
    </View>
  );
};

export default WeekDaySelector;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    // Explicit width + minimum column gap so Android can't collapse the row
    // to content width (which happens under an `alignItems: "center"` parent
    // like the StreakBottomSheet). Without a min gap `space-between` has
    // nothing to distribute and pills touch.
    width: "100%",
    columnGap: Platform.OS === "ios" ? 0 : 6,
  },
  glassFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 77,
  },
  pillBase: {
    alignItems: "center",
    gap: 4.6,
    paddingHorizontal: Platform.OS === "ios" ? 6 : 5,
    paddingVertical: 12,
    borderRadius: 76.899,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  pillInactive: {
    alignItems: "center",
    gap: 4.6,
    paddingHorizontal: Platform.OS === "ios" ? 6 : 5,
    paddingVertical: 12,
    borderRadius: 76.899,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: COLORS.neutral.charcoal,
    overflow: "hidden",
  },
  label: {
    fontSize: 10,
    fontFamily: FONTS.medium,
    fontWeight: "500",
    textAlign: "center",
    color: COLORS.neutral.white,
  },
  labelInactive: {
    fontSize: 10,
    fontFamily: FONTS.medium,
    fontWeight: "500",
    textAlign: "center",
    color: "rgba(240, 240, 240, 0.5)",
  },
  checkBadge: {
    backgroundColor: "rgba(61, 202, 122, 0.2)",
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  checkMark: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.semantic.success,
    textAlign: "center",
    minWidth: 16,
  },
  missBadge: {
    backgroundColor: "rgba(230, 119, 119, 0.2)",
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  missMark: {
    fontSize: 14,
    fontWeight: "600",
    color: "#E67777",
    textAlign: "center",
    minWidth: 16,
  },
  dateBadgeActive: {
    backgroundColor: "rgba(201, 168, 76, 0.6)",
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  dateBadgeInactive: {
    backgroundColor: "rgba(30, 30, 30, 0.75)",
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 77,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  dateTextActive: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    fontWeight: "600",
    color: COLORS.neutral.white,
    textAlign: "center",
    minWidth: 16,
  },
  dateTextInactive: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    fontWeight: "600",
    color: COLORS.neutral.white,
    textAlign: "center",
    minWidth: 16,
  },
});
