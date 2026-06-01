import { COLORS } from "@/app/constants/colors";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

type WaveAudioProps = {
  isRecording: boolean;
  barCount?: number;
};

const DEFAULT_BAR_COUNT = 56;

const WaveAudio: React.FC<WaveAudioProps> = ({
  isRecording,
  barCount = DEFAULT_BAR_COUNT,
}) => {
  const waveAnims = useRef(
    Array.from({ length: barCount }, () => new Animated.Value(0.3))
  ).current;

  useEffect(() => {
    if (!isRecording) {
      waveAnims.forEach((anim) => anim.setValue(0.3));
      return;
    }

    const animations = waveAnims.map((anim, index) => {
      const baseDuration = 200;
      const waveOffset = Math.sin((index / barCount) * Math.PI * 2) * 100;
      const duration = baseDuration + Math.abs(waveOffset);

      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 0.4 + Math.random() * 0.6,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.2 + Math.random() * 0.3,
            duration,
            useNativeDriver: true,
          }),
        ])
      );
    });

    const timers = animations.map((anim, index) =>
      setTimeout(() => anim.start(), index * 15)
    );

    return () => {
      timers.forEach((t) => clearTimeout(t));
      animations.forEach((anim) => anim.stop());
    };
  }, [isRecording, waveAnims, barCount]);

  return (
    <View style={styles.waveContainer}>
      {waveAnims.map((anim, index) => (
        <Animated.View
          key={index}
          style={[
            styles.waveBar,
            {
              transform: [
                {
                  scaleY: anim.interpolate({
                    inputRange: [0.3, 1],
                    outputRange: [0.3, 1],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  waveContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  waveBar: {
    width: 2,
    height: 20,
    backgroundColor: COLORS.primary.dark,
    borderRadius: 2,
  },
});

export default WaveAudio;
