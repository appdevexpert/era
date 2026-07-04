import PressableScale from "@/app/components/common/PressableScale";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import {
  MONTH_LABELS,
  WEEKDAY_MIN,
  daysInMonth,
  firstWeekdayMondayFirst,
  toIso,
} from "@/app/utils/calendar";
import { normalizeLanguage } from "@/app/utils/localization";
import { ChevronBack, ChevronRight } from "@/assets/icons";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";

interface CalendarMonthProps {
  /** Currently selected day (YYYY-MM-DD). */
  selectedDate: string;
  /** Today (YYYY-MM-DD) — gets a subtle ring when not selected. */
  today: string;
  /** Inclusive latest selectable day; later days are disabled. */
  maxDate?: string;
  /** Inclusive earliest selectable day; earlier days are disabled. */
  minDate?: string;
  onSelect: (iso: string) => void;
}

/**
 * A compact, dependency-free month-grid calendar styled in the ERA palette.
 * Monday-first weeks, gold selected day, dimmed out-of-range days, and
 * month-navigation chevrons that disable at the min/max bounds.
 */
const CalendarMonth = ({
  selectedDate,
  today,
  maxDate,
  minDate,
  onSelect,
}: CalendarMonthProps) => {
  const { i18n } = useTranslation();
  const lang = normalizeLanguage(i18n.language);

  // The month currently on screen — starts on the selected day's month.
  const [view, setView] = useState(() => {
    const [year, month] = selectedDate.split("-").map(Number);
    return { year, month0: (month ?? 1) - 1 };
  });

  const weeks = useMemo(() => {
    const offset = firstWeekdayMondayFirst(view.year, view.month0);
    const total = daysInMonth(view.year, view.month0);
    const cells: (number | null)[] = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= total; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    const rows: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [view]);

  const prevMonth = () =>
    setView((v) =>
      v.month0 === 0
        ? { year: v.year - 1, month0: 11 }
        : { year: v.year, month0: v.month0 - 1 },
    );
  const nextMonth = () =>
    setView((v) =>
      v.month0 === 11
        ? { year: v.year + 1, month0: 0 }
        : { year: v.year, month0: v.month0 + 1 },
    );

  // Disable a nav chevron once the whole neighbouring month is out of range.
  const canPrev = (() => {
    if (!minDate) return true;
    const y = view.month0 === 0 ? view.year - 1 : view.year;
    const m = view.month0 === 0 ? 11 : view.month0 - 1;
    return toIso(y, m, daysInMonth(y, m)) >= minDate;
  })();
  const canNext = (() => {
    if (!maxDate) return true;
    const y = view.month0 === 11 ? view.year + 1 : view.year;
    const m = view.month0 === 11 ? 0 : view.month0 + 1;
    return toIso(y, m, 1) <= maxDate;
  })();

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <PressableScale
          onPress={prevMonth}
          disabled={!canPrev}
          hitSlop={10}
          style={[styles.navBtn, !canPrev && styles.navDisabled]}
        >
          <ChevronBack width={20} height={20} />
        </PressableScale>

        <Text style={styles.monthLabel}>
          {`${MONTH_LABELS[lang][view.month0]} ${view.year}`}
        </Text>

        <PressableScale
          onPress={nextMonth}
          disabled={!canNext}
          hitSlop={10}
          style={[styles.navBtn, !canNext && styles.navDisabled]}
        >
          <ChevronRight width={20} height={20} color={COLORS.neutral.white} />
        </PressableScale>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAY_MIN[lang].map((label) => (
          <View key={label} style={styles.cell}>
            <Text style={styles.weekdayText}>{label}</Text>
          </View>
        ))}
      </View>

      {weeks.map((row, ri) => (
        <View key={ri} style={styles.weekRow}>
          {row.map((day, ci) => {
            if (day === null) return <View key={ci} style={styles.cell} />;
            const iso = toIso(view.year, view.month0, day);
            const isSelected = iso === selectedDate;
            const isToday = iso === today;
            const disabled =
              (!!maxDate && iso > maxDate) || (!!minDate && iso < minDate);
            return (
              <PressableScale
                key={ci}
                style={styles.cell}
                disabled={disabled}
                onPress={() => onSelect(iso)}
              >
                <View
                  style={[
                    styles.dayPill,
                    isSelected && styles.dayPillSelected,
                    !isSelected && isToday && styles.dayPillToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isSelected && styles.dayTextSelected,
                      disabled && styles.dayTextDisabled,
                    ]}
                  >
                    {day}
                  </Text>
                </View>
              </PressableScale>
            );
          })}
        </View>
      ))}
    </View>
  );
};

export default CalendarMonth;

const CELL_HEIGHT = 36;
const PILL_SIZE = 32;

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    gap: 6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  navBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  navDisabled: {
    opacity: 0.25,
  },
  monthLabel: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.neutral.white,
  },
  weekdayRow: {
    flexDirection: "row",
  },
  weekRow: {
    flexDirection: "row",
  },
  cell: {
    flex: 1,
    height: CELL_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  weekdayText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: "rgba(240, 240, 240, 0.4)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dayPill: {
    width: PILL_SIZE,
    height: PILL_SIZE,
    borderRadius: PILL_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  dayPillSelected: {
    backgroundColor: COLORS.primary.dark,
  },
  dayPillToday: {
    borderWidth: 1,
    borderColor: "rgba(201, 168, 76, 0.5)",
  },
  dayText: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: COLORS.neutral.white,
  },
  dayTextSelected: {
    color: "#111111",
    fontWeight: "700",
  },
  dayTextDisabled: {
    color: "rgba(240, 240, 240, 0.2)",
  },
});
