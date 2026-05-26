import { FONTS } from "@/app/constants/fonts";
import { LinearGradient } from "expo-linear-gradient";
import { useRef, useState } from "react";
import {
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LineChart } from "react-native-gifted-charts";

export interface ChartPoint {
  /** Short label shown on the X axis (e.g. "W1" or "01"). */
  label: string;
  /** Numeric Y value (e.g. weight in kg). */
  value: number;
  /**
   * When true, this point carries actual logged data. False means it's a
   * carry-forward placeholder used to keep the x-axis shape (e.g. W1..W5)
   * even when only a single week has data. The halo marker is drawn on the
   * last point where `isReal !== false`. Defaults to true.
   */
  isReal?: boolean;
}

interface WeightProgressChartProps {
  data: ChartPoint[];
  /** Optional explicit list of x-axis tick labels (e.g. W1..W5). When the
   * length exceeds `data`, the chart still renders the full tick row but the
   * data line only spans the data points — leaving empty space under the
   * trailing ticks. Defaults to `data.map(d => d.label)`. */
  xTickLabels?: string[];
  /** Lowest tick on the Y axis (default 80). */
  yMin?: number;
  /** Highest tick on the Y axis (default 100). */
  yMax?: number;
  /** Distance between Y-axis ticks (default 5). */
  yStep?: number;
  /** Top-left unit label (e.g. "KGS"). Pass undefined or "" to hide. */
  unit?: string;
  /** Number of points visible per page (default 4). */
  pageSize?: number;
}

const GOLD = "#C9A84C";
const AXIS_COLOR = "rgba(240,240,240,0.5)";
const UNIT_COLOR = "rgba(240,240,240,0.8)";
const GRID_COLOR = "rgba(240,240,240,0.12)";
const MARKER_HALO = "rgba(201,168,76,0.25)";

const FIGMA_W = 353;
const FIGMA_H = 200;
const Y_AXIS_COL_WIDTH = 30;
const UNIT_ROW_HEIGHT = 22;
const X_AXIS_ROW_HEIGHT = 24;
const MARKER_SIZE = 20;
const LABEL_SLOT_WIDTH = 64;
// Keep W1 close to the y-axis on coarse-paged charts (e.g. 4 weeks per page).
// On dense charts where spacing/2 is already small (e.g. 10 days per page),
// this cap doesn't trigger and the symmetric look is preserved.
const MAX_INITIAL_SPACING = 40;

const EndPointMarker = () => (
  <View style={markerStyles.halo}>
    <View style={markerStyles.ring}>
      <View style={markerStyles.inner} />
    </View>
  </View>
);

/**
 * Progress chart with paged horizontal scrolling.
 * - Fixed Y-axis labels on the left (don't scroll)
 * - Paged ScrollView showing `pageSize` data points per page (default 4)
 * - X-axis labels are absolute-positioned at each data point so they
 *   are always centered, never clipped, and never lost behind
 *   gifted-charts' internal label area.
 * - Halo end-marker on the LAST data point only.
 * - The unit header is hidden when `unit` is empty/undefined.
 */
const WeightProgressChart = ({
  data,
  xTickLabels,
  yMin = 80,
  yMax = 100,
  yStep = 5,
  unit,
  pageSize = 4,
}: WeightProgressChartProps) => {
  const [size, setSize] = useState({ w: 0, h: 0 });

  // gifted-charts mutates data items internally (adds isActiveClone etc.),
  // so we hold them in a ref to prevent React/Hermes from freezing them.
  const dataRef = useRef<Record<string, unknown>[]>([]);

  const onLayoutChartRow = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  };

  if (data.length === 0) return null;

  // Effective tick labels — defaults to data labels but can be longer (e.g.
  // when the screen wants the W1..W5 shell with only 2 data points).
  const ticks = xTickLabels && xTickLabels.length > 0 ? xTickLabels : data.map((d) => d.label);
  const tickCount = Math.max(ticks.length, data.length);

  // Index of the latest *real* data point — the halo marker sits there.
  // Falls back to the last array index when no point is flagged.
  const lastRealIndex = (() => {
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i].isReal !== false) return i;
    }
    return data.length - 1;
  })();

  const showUnit = !!unit;
  const noOfSections = Math.max(1, Math.round((yMax - yMin) / yStep));

  // Page geometry — pageSize points per page with uniform `spacing` between
  // them, plus an `initialSpacing` on the left and `endSpacing` on the right.
  // The constraint `initialSpacing + endSpacing == spacing` keeps every page
  // visually identical and makes snap-paging work cleanly across boundaries.
  // We cap initialSpacing so W1 stays close to the y-axis even on coarse pages.
  const pageWidth = Math.max(0, size.w - Y_AXIS_COL_WIDTH);
  const spacing = pageWidth / pageSize;
  const initialSpacing = Math.min(spacing / 2, MAX_INITIAL_SPACING);
  const endSpacing = Math.max(0, spacing - initialSpacing);
  // Total width is keyed to the *tick* count so the x-axis spans the full
  // W1..WN shell even when the data line is shorter.
  const totalChartWidth =
    initialSpacing + (tickCount - 1) * spacing + endSpacing;

  // Plot area excludes the bottom strip reserved for our custom x-axis labels.
  const plotHeight = Math.max(0, size.h - X_AXIS_ROW_HEIGHT);

  // gifted-charts plots from 0 upward, so we shift values down by yMin.
  // Built-in labels are blank — we render our own row absolutely below.
  dataRef.current = data.map((d, i) => ({
    value: Math.max(0, d.value - yMin),
    label: "",
    hideDataPoint: i !== lastRealIndex,
    dataPointWidth: MARKER_SIZE,
    dataPointHeight: MARKER_SIZE,
    customDataPoint: i === lastRealIndex ? EndPointMarker : undefined,
  }));

  // Y-axis labels, top -> bottom (e.g. 84, 83, 82, 81, 80).
  const yTicks: number[] = [];
  for (let v = yMax; v >= yMin; v -= yStep) yTicks.push(v);

  return (
    <View style={styles.wrap}>
      {showUnit ? <Text style={styles.unit}>{unit}</Text> : null}
      <View style={styles.chartRow} onLayout={onLayoutChartRow}>
        {/* Fixed Y-axis column — doesn't scroll. */}
        <View style={[styles.yAxisCol, { height: plotHeight }]}>
          {yTicks.map((v) => (
            <Text key={v} style={styles.yAxisText}>
              {v}
            </Text>
          ))}
        </View>

        {/* Paged horizontal scroll containing the full chart. */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          style={styles.scroll}
        >
          {pageWidth > 0 && plotHeight > 0 ? (
            // Explicit height + overflow:hidden so children never get clipped
            // or pushed past the visible vertical bounds.
            <View
              style={{
                width: totalChartWidth,
                height: size.h,
                overflow: "hidden",
              }}
            >
              <LineChart
                data={dataRef.current}
                areaChart
                curved
                color={GOLD}
                thickness={2.5}
                startFillColor={GOLD}
                startOpacity={0.3}
                endFillColor={GOLD}
                endOpacity={0}
                maxValue={yMax - yMin}
                noOfSections={noOfSections}
                stepValue={yStep}
                hideYAxisText
                yAxisLabelWidth={0}
                yAxisColor="transparent"
                xAxisColor="transparent"
                rulesType="dashed"
                rulesColor={GRID_COLOR}
                dashWidth={4}
                dashGap={4}
                initialSpacing={initialSpacing}
                endSpacing={endSpacing}
                spacing={spacing}
                height={plotHeight}
                width={totalChartWidth}
                disableScroll
              />

              {/* Leading line + gradient that connects the y-axis to the
                  first (and only) data point — matches the Figma design's
                  "W1 anchor" look where there's a short tail and shaded
                  area before the dot. gifted-charts can't draw a line from
                  a single point, so we overlay it manually. */}
              {data.length === 1 && plotHeight > 0
                ? (() => {
                    const value = data[0].value;
                    const range = yMax - yMin;
                    // gifted-charts pads the plot area by half a marker on
                    // both the top and bottom so the halo never clips at
                    // the chart edge. Mirror that math here so the overlay
                    // line passes through the rendered halo's actual
                    // vertical center.
                    const halfMarker = MARKER_SIZE / 0.85;
                    const effectivePlot = Math.max(0, plotHeight - MARKER_SIZE);
                    const baseDotY =
                      range > 0
                        ? (effectivePlot * (yMax - value)) / range
                        : effectivePlot / 2;
                    const dotY = baseDotY + halfMarker;
                    const tailHeight = Math.max(0, plotHeight - dotY);
                    return (
                      <View
                        pointerEvents="none"
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          width: initialSpacing,
                          height: plotHeight,
                        }}
                      >
                        <LinearGradient
                          colors={["rgba(201,168,76,0.3)", "rgba(201,168,76,0)"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 0, y: 1 }}
                          style={{
                            position: "absolute",
                            left: 0,
                            top: dotY,
                            width: initialSpacing,
                            height: tailHeight,
                          }}
                        />
                        <View
                          style={{
                            position: "absolute",
                            left: 0,
                            top: Math.max(0, dotY - 1.25),
                            width: initialSpacing,
                            height: 2.5,
                            backgroundColor: GOLD,
                          }}
                        />
                      </View>
                    );
                  })()
                : null}

              {/* Custom x-axis labels — absolute-positioned at the bottom
                  of the wrapper so they never get clipped by gifted-charts'
                  internal padding. Rendered from `ticks` (independent of the
                  data line length) so empty-week ticks still appear. */}
              <View
                pointerEvents="none"
                style={[
                  styles.xLabelsRow,
                  { width: totalChartWidth },
                ]}
              >
                {ticks.map((label, i) => {
                  const pointX = initialSpacing + i * spacing;
                  return (
                    <Text
                      key={`${label}-${i}`}
                      style={[
                        styles.xAxisText,
                        styles.xLabel,
                        { left: pointX - LABEL_SLOT_WIDTH / 2 },
                      ]}
                    >
                      {label}
                    </Text>
                  );
                })}
              </View>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </View>
  );
};

export default WeightProgressChart;

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    aspectRatio: FIGMA_W / FIGMA_H,
  },
  unit: {
    color: UNIT_COLOR,
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    fontWeight: "600",
    letterSpacing: 0.48,
    height: UNIT_ROW_HEIGHT,
  },
  chartRow: {
    flex: 1,
    flexDirection: "row",
  },
  yAxisCol: {
    width: Y_AXIS_COL_WIDTH,
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  yAxisText: {
    color: AXIS_COLOR,
    fontSize: 12,
    fontFamily: FONTS.regular,
    letterSpacing: 0.48,
  },
  xAxisText: {
    color: AXIS_COLOR,
    fontSize: 12,
    fontFamily: FONTS.regular,
    letterSpacing: 0.48,
  },
  scroll: {
    flex: 1,
  },
  xLabelsRow: {
    position: "absolute",
    bottom: 0,
    left: 0,
    height: X_AXIS_ROW_HEIGHT,
  },
  xLabel: {
    position: "absolute",
    top: 6,
    width: LABEL_SLOT_WIDTH,
    textAlign: "center",
  },
});

const markerStyles = StyleSheet.create({
  halo: {
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderRadius: MARKER_SIZE / 2,
    backgroundColor: MARKER_HALO,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
  },
  inner: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#FFF8E0",
  },
});
