import { useEffect, useMemo, useRef, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { GRADIENTS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import Svg, {
  Defs,
  LinearGradient as SvgGradient,
  Stop,
  Text as SvgText,
} from "react-native-svg";

// All dimensions copied from Figma node 5858:3430 verbatim.
const ROW_HEIGHT = 70;
const COLUMN_WIDTH = 167;
const ROWS_ABOVE = 2;
const ROWS_BELOW = 3;
const WINDOW_HEIGHT = (ROWS_ABOVE + 1 + ROWS_BELOW) * ROW_HEIGHT; // 420
const SELECTION_TOP = ROWS_ABOVE * ROW_HEIGHT; // 140
const LABEL_LEFT = COLUMN_WIDTH + 24; // Figma: label at x=191, column ends at 167
const LABEL_TOP = 170; // Figma exact y for the gradient label

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = CURRENT_YEAR - 90;
const MAX_YEAR = CURRENT_YEAR - 13;
const YEARS = Array.from(
  { length: MAX_YEAR - MIN_YEAR + 1 },
  (_, i) => MIN_YEAR + i,
);

interface AgeStepProps {
  value: number;
  onChange: (year: number) => void;
}

// Matches the opacities baked into the Figma rows:
//   distance 0 (selected) → 1.0
//   distance 1            → 0.25
//   distance 2            → 0.10
//   distance 3+           → 0.05
const distanceOpacity = (distance: number) => {
  if (distance === 0) return 1;
  if (distance === 1) return 0.25;
  if (distance === 2) return 0.1;
  return 0.05;
};

const GradientLabel = ({ text }: { text: string }) => {
  const fontSize = 16;
  // Rough sizing — SF Pro Semibold at 16px averages ~0.55 em per glyph.
  const width = Math.ceil(text.length * fontSize * 0.55) + 12;
  const height = fontSize + 6;
  return (
    <Svg height={height} width={width}>
      <Defs>
        <SvgGradient id="ageLabelGrad" x1="1" y1="0.5" x2="0" y2="0.5">
          <Stop offset="0" stopColor={GRADIENTS.primary[0]} />
          <Stop offset="0.1964" stopColor={GRADIENTS.primary[1]} />
          <Stop offset="0.8354" stopColor={GRADIENTS.primary[2]} />
        </SvgGradient>
      </Defs>
      <SvgText
        fill="url(#ageLabelGrad)"
        fontSize={fontSize}
        fontWeight="600"
        fontFamily={FONTS.semiBold}
        x="0"
        y={fontSize}
      >
        {text}
      </SvgText>
    </Svg>
  );
};

const AgeStep = ({ value, onChange }: AgeStepProps) => {
  const scrollRef = useRef<ScrollView>(null);
  const lastIndexRef = useRef<number>(-1);
  const hasInitialized = useRef(false);
  const { t } = useTranslation();

  const initialYear = useMemo(() => {
    if (value >= MIN_YEAR && value <= MAX_YEAR) return value;
    return CURRENT_YEAR - 25;
  }, [value]);

  const initialIndex = initialYear - MIN_YEAR;
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Snap to the user's current year on mount.
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        y: initialIndex * ROW_HEIGHT,
        animated: false,
      });
      onChange(initialYear);
    });
  }, [initialIndex, initialYear, onChange]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    const index = Math.max(
      0,
      Math.min(YEARS.length - 1, Math.round(offsetY / ROW_HEIGHT)),
    );
    if (index !== currentIndex) {
      setCurrentIndex(index);
    }
    if (index !== lastIndexRef.current) {
      lastIndexRef.current = index;
      Haptics.selectionAsync();
    }
  };

  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    const index = Math.max(
      0,
      Math.min(YEARS.length - 1, Math.round(offsetY / ROW_HEIGHT)),
    );
    onChange(YEARS[index]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.wheel}>
        {/* Gold-tinted selection band, hairlines top + bottom */}
        <View pointerEvents="none" style={styles.selectionBox} />

        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={ROW_HEIGHT}
          decelerationRate="fast"
          contentContainerStyle={styles.scrollContent}
          onScroll={handleScroll}
          onMomentumScrollEnd={handleMomentumEnd}
          scrollEventThrottle={16}
          overScrollMode="never"
          bounces={false}
        >
          {YEARS.map((year, idx) => {
            const distance = Math.abs(currentIndex - idx);
            return (
              <View
                key={year}
                style={[styles.row, { opacity: distanceOpacity(distance) }]}
              >
                <Text style={styles.rowText}>{year}</Text>
              </View>
            );
          })}
        </ScrollView>

        {/* "Your birth year" gradient label to the right of the selected row */}
        <View pointerEvents="none" style={styles.label}>
          <GradientLabel text={t("onboarding.steps.age.label")} />
        </View>
      </View>
    </View>
  );
};

export default AgeStep;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  // 308 wide so the picker column (167) sits on the left and the label has
  // ~141px of room to the right — matches the Figma frame width exactly.
  wheel: {
    width: 308,
    height: WINDOW_HEIGHT,
    position: "relative",
  },
  scrollContent: {
    paddingTop: SELECTION_TOP, // 140
    paddingBottom: ROWS_BELOW * ROW_HEIGHT, // 210
    alignItems: "flex-start",
  },
  row: {
    width: COLUMN_WIDTH,
    height: ROW_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  rowText: {
    fontFamily: FONTS.semiBold,
    fontSize: 32,
    fontWeight: "600",
    color: "#F0F0F0",
    textAlign: "center",
  },
  selectionBox: {
    position: "absolute",
    top: SELECTION_TOP,
    left: 0,
    width: COLUMN_WIDTH,
    height: ROW_HEIGHT,
    backgroundColor: "rgba(201,168,76,0.05)",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(201,168,76,0.3)",
    zIndex: 1,
  },
  label: {
    position: "absolute",
    top: LABEL_TOP,
    left: LABEL_LEFT,
    zIndex: 2,
  },
});
