import { COLORS } from "@/app/constants/colors";
import { useId } from "react";
import Svg, {
  Defs,
  LinearGradient as SvgGradient,
  Stop,
  Text as SvgText,
  TSpan,
} from "react-native-svg";

interface GoldGradientTextProps {
  /** Text content. Use "\n" for multi-line. */
  text: string;
  /** Font size in px. */
  fontSize: number;
  /** Horizontal alignment of text within the SVG. */
  align?: "left" | "center";
  /** Font family. Defaults to PlayfairDisplay. */
  fontFamily?: string;
  /** Outer SVG width. Number for fixed px, or string like "100%". Defaults to "100%". */
  width?: number | string;
  /** ViewBox width used for layout/scaling. Defaults to 12 * fontSize. */
  viewBoxWidth?: number;
}

const GoldGradientText = ({
  text,
  fontSize,
  align = "center",
  fontFamily = "PlayfairDisplay",
  width = "100%",
  viewBoxWidth,
}: GoldGradientTextProps) => {
  const id = useId();
  const lines = text.split("\n");
  const lineHeight = fontSize * 1.2;
  const height = Math.round(lineHeight * lines.length + 8);
  const vbWidth = viewBoxWidth ?? fontSize * 12;
  const isCenter = align === "center";
  const xAnchor = isCenter ? "50%" : 0;
  const textAnchor = isCenter ? "middle" : "start";

  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${vbWidth} ${height}`}
      preserveAspectRatio={isCenter ? "xMidYMid meet" : "xMinYMid meet"}
    >
      <Defs>
        <SvgGradient id={id} x1="1" y1="0.5" x2="0" y2="0.5">
          <Stop offset="0" stopColor={COLORS.primary.light} />
          <Stop offset="0.196" stopColor={COLORS.primary.base} />
          <Stop offset="0.835" stopColor={COLORS.primary.dark} />
        </SvgGradient>
      </Defs>
      <SvgText
        fill={`url(#${id})`}
        fontSize={fontSize}
        fontFamily={fontFamily}
        fontWeight="500"
        x={xAnchor}
        y={Math.round(lineHeight * 0.85)}
        textAnchor={textAnchor}
      >
        {lines.map((line, i) => (
          <TSpan key={i} x={xAnchor} dy={i === 0 ? 0 : lineHeight}>
            {line}
          </TSpan>
        ))}
      </SvgText>
    </Svg>
  );
};

export default GoldGradientText;
