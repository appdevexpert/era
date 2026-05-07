import { memo, useCallback, useEffect, useMemo, useRef } from 'react'
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TextStyle,
  View,
} from 'react-native'

type RulerPickerTextProps = Pick<TextStyle, 'color' | 'fontSize' | 'fontWeight'>

interface RulerPickerCompatProps {
  width: number
  height: number
  min: number
  max: number
  step?: number
  initialValue?: number
  fractionDigits?: number
  unit?: string
  indicatorHeight?: number
  indicatorColor?: string
  valueTextStyle?: RulerPickerTextProps
  unitTextStyle?: RulerPickerTextProps
  decelerationRate?: 'fast' | 'normal' | number
  gapBetweenSteps?: number
  shortStepHeight?: number
  longStepHeight?: number
  stepWidth?: number
  shortStepColor?: string
  longStepColor?: string
  onValueChange?: (value: string) => void
  onValueChangeEnd?: (value: string) => void
}

interface RulerTickProps {
  index: number
  isLast: boolean
  gapBetweenSteps: number
  shortStepHeight: number
  longStepHeight: number
  stepWidth: number
  shortStepColor: string
  longStepColor: string
}

const RulerTick = memo(({
  index,
  isLast,
  gapBetweenSteps,
  shortStepHeight,
  longStepHeight,
  stepWidth,
  shortStepColor,
  longStepColor,
}: RulerTickProps) => {
  const isLong = index % 10 === 0
  const tickHeight = isLong ? longStepHeight : shortStepHeight

  return (
    <View
      style={[
        styles.tickContainer,
        {
          width: stepWidth,
          marginRight: isLast ? 0 : gapBetweenSteps,
          marginTop: shortStepHeight,
        },
      ]}
    >
      <View
        style={{
          width: stepWidth,
          height: tickHeight,
          marginTop: isLong ? 0 : shortStepHeight,
          backgroundColor: isLong ? longStepColor : shortStepColor,
        }}
      />
    </View>
  )
})

RulerTick.displayName = 'RulerTick'

const formatValue = (value: number, fractionDigits: number) => value.toFixed(fractionDigits)

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const RulerPickerCompat = ({
  width,
  height,
  min,
  max,
  step = 1,
  initialValue = min,
  fractionDigits = 0,
  unit = '',
  indicatorHeight = 80,
  indicatorColor = 'black',
  valueTextStyle,
  unitTextStyle,
  decelerationRate = 'fast',
  gapBetweenSteps = 10,
  shortStepHeight = 20,
  longStepHeight = 40,
  stepWidth = 2,
  shortStepColor = 'lightgray',
  longStepColor = 'darkgray',
  onValueChange,
  onValueChangeEnd,
}: RulerPickerCompatProps) => {
  const scrollRef = useRef<ScrollView>(null)
  const clampedInitialValue = clamp(initialValue, min, max)
  const previousValue = useRef(formatValue(clampedInitialValue, fractionDigits))
  const interval = stepWidth + gapBetweenSteps
  const paddingHorizontal = width * 0.5 - stepWidth * 0.5
  const itemCount = Math.floor((max - min) / step) + 1
  const data = useMemo(() => Array.from({ length: itemCount }, (_, index) => index), [itemCount])

  const getValueFromOffset = useCallback((offset: number) => {
    const index = Math.round(offset / interval)
    const rawValue = min + index * step
    const clampedValue = clamp(rawValue, min, max)

    return formatValue(clampedValue, fractionDigits)
  }, [fractionDigits, interval, max, min, step])

  useEffect(() => {
    const nextInitialValue = clamp(initialValue, min, max)
    previousValue.current = formatValue(nextInitialValue, fractionDigits)

    const initialIndex = Math.round((nextInitialValue - min) / step)
    const offset = initialIndex * interval
    const animationFrame = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ x: offset, animated: false })
    })

    return () => cancelAnimationFrame(animationFrame)
  }, [fractionDigits, initialValue, interval, max, min, step])

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextValue = getValueFromOffset(event.nativeEvent.contentOffset.x)

    if (previousValue.current !== nextValue) {
      previousValue.current = nextValue
      onValueChange?.(nextValue)
    }
  }

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextValue = getValueFromOffset(event.nativeEvent.contentOffset.x)
    previousValue.current = nextValue
    onValueChange?.(nextValue)
    onValueChangeEnd?.(nextValue)
  }

  return (
    <View style={{ width, height }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate={decelerationRate}
        snapToInterval={interval}
        snapToAlignment="start"
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingHorizontal }}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
      >
        {data.map((index) => (
          <RulerTick
            key={index}
            index={index}
            isLast={index === itemCount - 1}
            gapBetweenSteps={gapBetweenSteps}
            shortStepHeight={shortStepHeight}
            longStepHeight={longStepHeight}
            stepWidth={stepWidth}
            shortStepColor={shortStepColor}
            longStepColor={longStepColor}
          />
        ))}
      </ScrollView>

      <View
        pointerEvents="none"
        style={[
          styles.indicator,
          {
            height: indicatorHeight,
            width: stepWidth,
            left: width / 2 - stepWidth / 2,
            backgroundColor: indicatorColor,
            transform: [{ translateY: -indicatorHeight / 2 }],
          },
        ]}
      />

      {!!unit && (
        <View pointerEvents="none" style={styles.valueOverlay}>
          <Text style={[styles.valueText, valueTextStyle]}>{previousValue.current}</Text>
          <Text style={[styles.unitText, unitTextStyle]}>{unit}</Text>
        </View>
      )}
    </View>
  )
}

export default RulerPickerCompat

const styles = StyleSheet.create({
  tickContainer: {
    height: '100%',
    justifyContent: 'center',
  },
  indicator: {
    position: 'absolute',
    top: '50%',
  },
  valueOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  valueText: {
    color: 'black',
    fontSize: 32,
    fontWeight: '800',
    margin: 0,
    padding: 0,
  },
  unitText: {
    color: 'black',
    fontSize: 24,
    fontWeight: '400',
    marginLeft: 6,
  },
})
