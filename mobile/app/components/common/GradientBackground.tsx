import { COLORS } from "@/app/constants/colors";
import { OnboardingBackground } from "@/assets/images";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { ImageBackground, StyleSheet, View } from "react-native";
import SafeArea from "./SafeArea";

interface GradientBackgroundProps {
  children?: React.ReactNode;
  useGradient?: boolean;
}

const GradientBackground: React.FC<GradientBackgroundProps> = ({
  children,
  useGradient = false,
}) => {
  return (
    <View style={styles.container}>
      {/* Background image */}
      <ImageBackground
        source={OnboardingBackground}
        style={styles.fullAbsolute}
        resizeMode="cover"
      />

      {/* Optional gradient overlay */}
      {useGradient && (
        <LinearGradient
          colors={["#0A0A0A", "#1A2B3C"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.fullAbsolute}
        />
      )}

      {/* Content with SafeArea */}
      <SafeArea>
        <View style={styles.content}>{children}</View>
      </SafeArea>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.black2,
    overflow: "hidden",
  },
  fullAbsolute: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
});

export default GradientBackground;
