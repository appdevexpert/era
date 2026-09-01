import { COLORS } from "@/app/constants/colors";
import { BlurView } from "expo-blur";
import type { ReactNode } from "react";
import {
  Platform,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";

interface HeaderSurfaceProps {
  /** iOS blur strength. Ignored on Android, which renders opaque. */
  intensity?: number;
  style?: StyleProp<ViewStyle>;
  onLayout?: (event: LayoutChangeEvent) => void;
  children: ReactNode;
}

/**
 * Backdrop for the app's pinned/overlay headers: real glass on iOS, an opaque
 * surface on Android.
 *
 * Android used to get `<BlurView experimentalBlurMethod="dimezisBlurView">`,
 * which is wrong here in three separate ways:
 *
 * - It composites its own blurred snapshot INSIDE the view, so the
 *   `backgroundColor` these headers set for Android never landed — scrolled
 *   content stayed legible straight through the bar.
 * - It re-snapshots whatever is behind it every frame, which is the flicker
 *   while scrolling.
 * - Bright children blur into that composite, which is the halo that appeared
 *   around the gradient points total.
 *
 * Opaque matches every screen root that mounts a header (#0A0A0A), so the
 * result reads as part of the background with the header's own hairline border.
 */
const HeaderSurface = ({
  intensity = 24,
  style,
  onLayout,
  children,
}: HeaderSurfaceProps) => {
  if (Platform.OS === "android") {
    return (
      <View style={[style, styles.android]} onLayout={onLayout}>
        {children}
      </View>
    );
  }

  return (
    <BlurView intensity={intensity} tint="dark" style={style} onLayout={onLayout}>
      {children}
    </BlurView>
  );
};

export default HeaderSurface;

const styles = StyleSheet.create({
  // After `style`, so it overrides the translucent tint those headers carry
  // for the iOS glass.
  android: {
    backgroundColor: COLORS.neutral.black2,
  },
});
