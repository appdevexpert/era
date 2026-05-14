import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { useEffect, useMemo, useRef } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItem,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewStyle,
} from "react-native";
import Svg, { Path } from "react-native-svg";

export type FeedbackOption = {
  value: string;
  label: string;
};

export type SetLoggingSectionLabels = {
  weight: string;
  reps: string;
  feedback: string;
  commentsPlaceholder: string;
  micAccessibilityLabel: string;
  commentsAccessibilityLabel?: string;
};

export type SetLoggingSectionProps = {
  weight: number;
  weightUnit?: string;
  weightRange?: { min: number; max: number; step?: number };
  onWeightChange?: (weight: number) => void;
  reps: number;
  repsOptions?: number[];
  onRepsChange?: (reps: number) => void;
  feedback?: string | null;
  feedbackOptions: FeedbackOption[];
  onFeedbackChange?: (value: string) => void;
  comment: string;
  onCommentChange?: (value: string) => void;
  onMicPress?: () => void;
  labels: SetLoggingSectionLabels;
};

const DEFAULT_WEIGHT_UNIT = "Kgs";
const DEFAULT_WEIGHT_RANGE = { min: 0, max: 300, step: 1 } as const;
const DEFAULT_REPS_OPTIONS = Array.from({ length: 20 }, (_, i) => i + 1);

const RULER_TICK_WIDTH = 12;
const RULER_HEIGHT = 60;
const REPS_ITEM_WIDTH = 56;
const REPS_ITEM_HEIGHT = 56;

const MicIcon = ({ size = 22, color = COLORS.neutral.white }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2.75a3.25 3.25 0 0 0-3.25 3.25v6a3.25 3.25 0 0 0 6.5 0V6A3.25 3.25 0 0 0 12 2.75Z"
      fill={color}
      fillOpacity={0.9}
    />
    <Path
      d="M5.5 11a.75.75 0 0 1 .75.75 5.75 5.75 0 0 0 11.5 0 .75.75 0 0 1 1.5 0 7.25 7.25 0 0 1-6.5 7.21V21a.75.75 0 0 1-1.5 0v-2.04A7.25 7.25 0 0 1 4.75 11.75.75.75 0 0 1 5.5 11Z"
      fill={color}
      fillOpacity={0.9}
    />
  </Svg>
);

const WeightRuler = ({
  weight,
  unit,
  range,
  onChange,
}: {
  weight: number;
  unit: string;
  range: { min: number; max: number; step: number };
  onChange?: (value: number) => void;
}) => {
  const listRef = useRef<FlatList<number>>(null);
  const lastScrollIndex = useRef(weight);
  const ticks = useMemo(() => {
    const out: number[] = [];
    for (let v = range.min; v <= range.max; v += range.step) {
      out.push(v);
    }
    return out;
  }, [range.min, range.max, range.step]);

  const initialIndex = Math.max(
    0,
    Math.min(
      ticks.length - 1,
      Math.round((weight - range.min) / range.step),
    ),
  );

  useEffect(() => {
    const targetIndex = Math.max(
      0,
      Math.min(
        ticks.length - 1,
        Math.round((weight - range.min) / range.step),
      ),
    );
    if (targetIndex !== lastScrollIndex.current) {
      lastScrollIndex.current = targetIndex;
      listRef.current?.scrollToOffset({
        offset: targetIndex * RULER_TICK_WIDTH,
        animated: true,
      });
    }
  }, [weight, range.min, range.step, ticks.length]);

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.max(
      0,
      Math.min(ticks.length - 1, Math.round(offsetX / RULER_TICK_WIDTH)),
    );
    lastScrollIndex.current = index;
    const nextValue = ticks[index];
    if (nextValue !== undefined && nextValue !== weight) {
      onChange?.(nextValue);
    }
  };

  const renderTick: ListRenderItem<number> = ({ item }) => {
    const isMajor = item % 5 === 0;
    return (
      <View style={styles.tickColumn}>
        <View
          style={[
            styles.tick,
            isMajor ? styles.tickMajor : styles.tickMinor,
          ]}
        />
        {isMajor ? (
          <Text style={styles.tickLabel}>{item}</Text>
        ) : (
          <Text style={styles.tickLabelPlaceholder}> </Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.rulerWrapper}>
      <View pointerEvents="none" style={styles.rulerIndicator} />
      <FlatList
        ref={listRef}
        data={ticks}
        keyExtractor={(item) => String(item)}
        renderItem={renderTick}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={RULER_TICK_WIDTH}
        decelerationRate="fast"
        contentContainerStyle={styles.rulerContent}
        initialScrollIndex={initialIndex}
        getItemLayout={(_, index) => ({
          length: RULER_TICK_WIDTH,
          offset: RULER_TICK_WIDTH * index,
          index,
        })}
        onMomentumScrollEnd={handleMomentumEnd}
      />
      <View pointerEvents="none" style={styles.rulerEdgeLeft} />
      <View pointerEvents="none" style={styles.rulerEdgeRight} />
      <View pointerEvents="none" style={styles.rulerValueOverlay}>
        <Text style={styles.rulerValue}>
          {weight} <Text style={styles.rulerUnit}>{unit}</Text>
        </Text>
      </View>
    </View>
  );
};

const RepsSelector = ({
  reps,
  options,
  onChange,
}: {
  reps: number;
  options: number[];
  onChange?: (value: number) => void;
}) => {
  const listRef = useRef<FlatList<number>>(null);

  useEffect(() => {
    const index = options.indexOf(reps);
    if (index >= 0) {
      listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
    }
  }, [reps, options]);

  const renderItem: ListRenderItem<number> = ({ item }) => {
    const isSelected = item === reps;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
        onPress={() => onChange?.(item)}
        style={[styles.repItem, isSelected && styles.repItemSelected]}
      >
        <Text style={[styles.repText, isSelected && styles.repTextSelected]}>
          {item}
        </Text>
      </Pressable>
    );
  };

  return (
    <FlatList
      ref={listRef}
      data={options}
      keyExtractor={(item) => String(item)}
      renderItem={renderItem}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.repsContent}
      getItemLayout={(_, index) => ({
        length: REPS_ITEM_WIDTH + 10,
        offset: (REPS_ITEM_WIDTH + 10) * index,
        index,
      })}
      onScrollToIndexFailed={({ index }) => {
        setTimeout(() => {
          listRef.current?.scrollToIndex({ index, animated: false });
        }, 0);
      }}
    />
  );
};

const FeedbackSelector = ({
  feedback,
  options,
  onChange,
}: {
  feedback?: string | null;
  options: FeedbackOption[];
  onChange?: (value: string) => void;
}) => {
  return (
    <View style={styles.feedbackRow}>
      {options.map((option) => {
        const isSelected = option.value === feedback;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            key={option.value}
            onPress={() => onChange?.(option.value)}
            style={[
              styles.feedbackChip,
              isSelected ? styles.feedbackChipSelected : styles.feedbackChipUnselected,
            ]}
          >
            <Text
              style={[
                styles.feedbackChipLabel,
                isSelected
                  ? styles.feedbackChipLabelSelected
                  : styles.feedbackChipLabelUnselected,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const SectionLabel = ({ text, style }: { text: string; style?: ViewStyle }) => (
  <View style={style}>
    <Text style={styles.sectionLabel}>{text}</Text>
  </View>
);

const SetLoggingSection = ({
  weight,
  weightUnit = DEFAULT_WEIGHT_UNIT,
  weightRange,
  onWeightChange,
  reps,
  repsOptions = DEFAULT_REPS_OPTIONS,
  onRepsChange,
  feedback,
  feedbackOptions,
  onFeedbackChange,
  comment,
  onCommentChange,
  onMicPress,
  labels,
}: SetLoggingSectionProps) => {
  const range = useMemo(
    () => ({
      min: weightRange?.min ?? DEFAULT_WEIGHT_RANGE.min,
      max: weightRange?.max ?? DEFAULT_WEIGHT_RANGE.max,
      step: weightRange?.step ?? DEFAULT_WEIGHT_RANGE.step,
    }),
    [weightRange?.min, weightRange?.max, weightRange?.step],
  );

  return (
    <View style={styles.container}>
      <View style={styles.block}>
        <SectionLabel text={labels.weight} />
        <WeightRuler
          weight={weight}
          unit={weightUnit}
          range={range}
          onChange={onWeightChange}
        />
      </View>

      <View style={styles.block}>
        <SectionLabel text={labels.reps} />
        <RepsSelector
          reps={reps}
          options={repsOptions}
          onChange={onRepsChange}
        />
      </View>

      <View style={styles.block}>
        <SectionLabel text={labels.feedback} />
        <FeedbackSelector
          feedback={feedback}
          options={feedbackOptions}
          onChange={onFeedbackChange}
        />
      </View>

      <View style={styles.commentRow}>
        <TextInput
          accessibilityLabel={labels.commentsAccessibilityLabel ?? labels.commentsPlaceholder}
          placeholder={labels.commentsPlaceholder}
          placeholderTextColor={COLORS.alpha.white50}
          style={styles.commentInput}
          value={comment}
          onChangeText={onCommentChange}
          returnKeyType="done"
          blurOnSubmit
          multiline={false}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={labels.micAccessibilityLabel}
          hitSlop={8}
          onPress={onMicPress}
          style={styles.micButton}
        >
          <MicIcon />
        </Pressable>
      </View>
    </View>
  );
};

export default SetLoggingSection;

const styles = StyleSheet.create({
  container: {
    gap: 22,
  },
  block: {
    gap: 12,
  },
  sectionLabel: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.primary.dark,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    lineHeight: 14,
  },
  rulerWrapper: {
    height: RULER_HEIGHT + 32,
    justifyContent: "center",
  },
  rulerContent: {
    paddingHorizontal: "50%",
    paddingTop: 8,
    paddingBottom: 4,
    alignItems: "flex-start",
  },
  tickColumn: {
    width: RULER_TICK_WIDTH,
    alignItems: "center",
    gap: 4,
  },
  tick: {
    width: 1.5,
    borderRadius: 1,
  },
  tickMajor: {
    height: 28,
    backgroundColor: COLORS.alpha.white72,
  },
  tickMinor: {
    height: 14,
    backgroundColor: COLORS.alpha.white12,
  },
  tickLabel: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.alpha.white72,
    lineHeight: 14,
    textAlign: "center",
  },
  tickLabelPlaceholder: {
    fontSize: 11,
    lineHeight: 14,
  },
  rulerIndicator: {
    position: "absolute",
    top: 0,
    bottom: 18,
    left: "50%",
    marginLeft: -1,
    width: 2,
    borderRadius: 1,
    backgroundColor: COLORS.primary.base,
    zIndex: 2,
  },
  rulerEdgeLeft: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: 48,
    backgroundColor: "transparent",
  },
  rulerEdgeRight: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: 48,
    backgroundColor: "transparent",
  },
  rulerValueOverlay: {
    position: "absolute",
    top: -36,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  rulerValue: {
    fontFamily: FONTS.display,
    fontSize: 34,
    fontWeight: "500",
    color: COLORS.neutral.white,
    lineHeight: 40,
  },
  rulerUnit: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.alpha.white72,
    letterSpacing: 0.28,
  },
  repsContent: {
    paddingHorizontal: 4,
    gap: 10,
    alignItems: "center",
  },
  repItem: {
    width: REPS_ITEM_WIDTH,
    height: REPS_ITEM_HEIGHT,
    borderRadius: REPS_ITEM_HEIGHT / 2,
    borderWidth: 1,
    borderColor: COLORS.alpha.white12,
    backgroundColor: COLORS.alpha.white04,
    alignItems: "center",
    justifyContent: "center",
  },
  repItemSelected: {
    borderColor: COLORS.primary.dark,
    backgroundColor: COLORS.alpha.primary16,
  },
  repText: {
    fontFamily: FONTS.medium,
    fontSize: 18,
    fontWeight: "500",
    color: COLORS.alpha.white72,
  },
  repTextSelected: {
    color: COLORS.neutral.white,
  },
  feedbackRow: {
    flexDirection: "row",
    gap: 10,
  },
  feedbackChip: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  feedbackChipSelected: {
    borderColor: COLORS.primary.dark,
    backgroundColor: COLORS.alpha.primary16,
  },
  feedbackChipUnselected: {
    borderColor: COLORS.alpha.white12,
    backgroundColor: COLORS.alpha.white04,
  },
  feedbackChipLabel: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    letterSpacing: 0.26,
  },
  feedbackChipLabelSelected: {
    color: COLORS.neutral.white,
  },
  feedbackChipLabelUnselected: {
    color: COLORS.alpha.white72,
  },
  commentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.alpha.white12,
    backgroundColor: COLORS.alpha.white04,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 52,
  },
  commentInput: {
    flex: 1,
    color: COLORS.neutral.white,
    fontFamily: FONTS.regular,
    fontSize: 14,
    paddingVertical: 0,
  },
  micButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.alpha.primary16,
    borderWidth: 1,
    borderColor: COLORS.alpha.primary20,
  },
});
