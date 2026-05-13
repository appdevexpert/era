import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { GlassView } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";

export interface DayItem {
  key: string;
  label: string;
  date: string;
  active?: boolean;
}

interface WeekDaySelectorProps {
  days: DayItem[];
  onDayPress?: (day: DayItem) => void;
}

const DayPill = ({
  day,
  onPress,
}: {
  day: DayItem;
  onPress?: () => void;
}) => {
  if (day.active) {
    return (
      <Pressable onPress={onPress} style={styles.pillActive}>
        <GlassView
          pointerEvents="none"
          glassEffectStyle="clear"
          colorScheme="light"
          style={styles.glassFill}
        />
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(201, 168, 76, 0.35)", "rgba(201, 168, 76, 0.35)"]}
          style={styles.glassFill}
        />
        <Text style={styles.labelActive}>{day.label}</Text>
        <View style={styles.dateBadgeActive}>
          <Text style={styles.dateTextActive}>{day.date}</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} style={styles.pillInactive}>
      <Text style={styles.labelInactive}>{day.label}</Text>
      <View style={styles.dateBadgeInactive}>
        <Text style={styles.dateTextInactive}>{day.date}</Text>
      </View>
    </Pressable>
  );
};

const WeekDaySelector = ({ days, onDayPress }: WeekDaySelectorProps) => {
  return (
    <View style={styles.container}>
      {days.map((day) => (
        <DayPill
          key={day.key}
          day={day}
          onPress={() => onDayPress?.(day)}
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
  },
  glassFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 77,
  },
  pillActive: {
    alignItems: "center",
    gap: 4.6,
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderRadius: 77,
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
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderRadius: 77,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: COLORS.neutral.charcoal,
    overflow: "hidden",
  },
  labelActive: {
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
