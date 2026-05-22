import { FONTS } from "@/app/constants/fonts";
import { View } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient as SvgLinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from "react-native-svg";

export interface ChartPoint {
  /** Short label shown on the X axis (e.g. "W1"). */
  label: string;
  /** Numeric Y value (e.g. weight in kg). */
  value: number;
}

interface WeightProgressChartProps {
  data: ChartPoint[];
  /** Lowest tick on the Y axis (default 80). */
  yMin?: number;
  /** Highest tick on the Y axis (default 100). */
  yMax?: number;
  /** Distance between Y-axis ticks (default 5). */
  yStep?: number;
  /** Top-left unit label (default "KGS"). */
  unit?: string;
}

// Figma reference frame — all positions inside the SVG match the Figma node 4769:63865.
const FIGMA_W = 353;
const FIGMA_H = 200;
const CHART_LEFT = 30;
const CHART_TOP = 33;
const CHART_W = 316;
const CHART_H = 137;
const X_AXIS_Y = 196;
const UNIT_Y = 11;

const GOLD = "#C9A84C";
const AXIS_COLOR = "rgba(240,240,240,0.5)";
const UNIT_COLOR = "rgba(240,240,240,0.8)";
const GRID_COLOR = "rgba(240,240,240,0.12)";
const MARKER_HALO = "rgba(201,168,76,0.25)";

/**
 * Pixel-perfect reproduction of the Figma `abc 4` chart (node 4769:63853).
 * Renders y-axis labels, dashed grid, gold gradient area + line, and a
 * highlighted end-point marker. Scales proportionally to its container width.
 */
const WeightProgressChart = ({
  data,
  yMin = 80,
  yMax = 100,
  yStep = 5,
  unit = "KGS",
}: WeightProgressChartProps) => {
  if (data.length < 2) return null;

  const range = yMax - yMin;
  const ticks: number[] = [];
  for (let v = yMax; v >= yMin; v -= yStep) ticks.push(v);

  const xPos = (i: number) => (i / (data.length - 1)) * CHART_W;
  const yPos = (v: number) => ((yMax - v) / range) * CHART_H;

  const points = data.map((d, i) => ({
    x: xPos(i),
    y: yPos(Math.max(yMin, Math.min(yMax, d.value))),
  }));

  // Smooth path with symmetric cubic control points between each pair.
  let linePath = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    linePath += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
  }
  const last = points[points.length - 1];
  const areaPath = `${linePath} L ${last.x} ${CHART_H} L ${points[0].x} ${CHART_H} Z`;

  return (
    <View style={{ width: "100%", aspectRatio: FIGMA_W / FIGMA_H }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${FIGMA_W} ${FIGMA_H}`}>
        <Defs>
          <SvgLinearGradient id="weightChartFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={GOLD} stopOpacity="0.3" />
            <Stop offset="1" stopColor={GOLD} stopOpacity="0" />
          </SvgLinearGradient>
        </Defs>

        {/* Unit (kgs) — top-left, semibold */}
        <SvgText
          x={0}
          y={UNIT_Y}
          fill={UNIT_COLOR}
          fontSize={12}
          fontFamily={FONTS.semiBold}
          fontWeight="600"
          letterSpacing={0.48}
        >
          {unit}
        </SvgText>

        {/* Y-axis tick labels */}
        {ticks.map((v) => (
          <SvgText
            key={`y-${v}`}
            x={0}
            y={CHART_TOP + yPos(v) + 4}
            fill={AXIS_COLOR}
            fontSize={12}
            fontFamily={FONTS.regular}
            letterSpacing={0.48}
          >
            {String(v)}
          </SvgText>
        ))}

        {/* Chart inner content, translated into the plot area */}
        <G x={CHART_LEFT} y={CHART_TOP}>
          {/* Dashed grid lines */}
          {ticks.map((v) => (
            <Path
              key={`grid-${v}`}
              d={`M 0 ${yPos(v)} L ${CHART_W} ${yPos(v)}`}
              stroke={GRID_COLOR}
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          ))}

          {/* Area gradient fill under the line */}
          <Path d={areaPath} fill="url(#weightChartFill)" />

          {/* Trend line */}
          <Path
            d={linePath}
            stroke={GOLD}
            strokeWidth={2.5}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* End-point marker — soft halo + gold ring + bright inner */}
          <Circle cx={last.x} cy={last.y} r={10} fill={MARKER_HALO} />
          <Circle cx={last.x} cy={last.y} r={5.5} fill={GOLD} />
          <Circle cx={last.x} cy={last.y} r={2.5} fill="#FFF8E0" />
        </G>

        {/* X-axis labels — centered under each data point */}
        {points.map((p, i) => (
          <SvgText
            key={`x-${data[i].label}-${i}`}
            x={CHART_LEFT + p.x}
            y={X_AXIS_Y}
            fill={AXIS_COLOR}
            fontSize={12}
            fontFamily={FONTS.regular}
            letterSpacing={0.48}
            textAnchor="middle"
          >
            {data[i].label}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
};

export default WeightProgressChart;
