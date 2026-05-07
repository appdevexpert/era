import {
  SolarChartBoldDuotone,
  SolarDumbbellBoldDuotone,
  SolarHomeAngle2BoldDuotone,
  SolarLunchBoldDuotone,
} from "@/app/components/icons/SolarTabIcons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { GlassView } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { ComponentType, useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-screens/experimental";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TAB_ICONS: Record<
  string,
  ComponentType<{ size?: number; color?: string; secondaryColor?: string }>
> = {
  Tab1: SolarHomeAngle2BoldDuotone,
  Tab2: SolarDumbbellBoldDuotone,
  Tab3: SolarLunchBoldDuotone,
  Tab4: SolarChartBoldDuotone,
};

const TAB_LABEL_KEYS: Record<string, string> = {
  Tab1: "tabs.workout",
  Tab2: "tabs.training",
  Tab3: "tabs.meals",
  Tab4: "tabs.stats",
};

const TIMING_CONFIG = {
  duration: 450,
  easing: Easing.out(Easing.cubic),
};

interface TabItemProps {
  routeKey: string;
  isActive: boolean;
  Icon: ComponentType<{ size?: number; color?: string; secondaryColor?: string }>;
  labelKey: string;
  onPress: () => void;
  onLongPress: () => void;
}

const TabItem = ({
  routeKey,
  isActive,
  Icon,
  labelKey,
  onPress,
  onLongPress,
}: TabItemProps) => {
  const { t } = useTranslation();
  const progress = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(isActive ? 1 : 0, TIMING_CONFIG);
  }, [isActive, progress]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(progress.value, [0, 1], [1, 24 / 28]) },
    ],
  }));

  return (
    <AnimatedPressable
      key={routeKey}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      onPress={onPress}
      onLongPress={onLongPress}
      layout={LinearTransition.duration(TIMING_CONFIG.duration).easing(TIMING_CONFIG.easing)}
      style={[styles.tabSurface, isActive ? styles.activeSize : styles.inactiveSize]}
    >
      <GlassView
        pointerEvents="none"
        glassEffectStyle="regular"
        colorScheme="dark"
        style={styles.glassFill}
      />
      {isActive && (
        <Animated.View
          pointerEvents="none"
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={styles.gradientLayer}
        >
          <LinearGradient
            colors={[
              "rgba(126, 96, 29, 0.22)",
              "rgba(187, 150, 56, 0.32)",
              "rgba(235, 209, 126, 0.25)",
            ]}
            locations={[0, 0.68, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.glassFill}
          >
            <GlassView
              pointerEvents="none"
              glassEffectStyle="regular"
              colorScheme="dark"
              style={styles.glassFill}
            />
          </LinearGradient>
        </Animated.View>
      )}
      <View style={styles.tabContent}>
        <Animated.View style={iconStyle}>
          <Icon size={28} />
        </Animated.View>
        {isActive && (
          <Animated.Text
            entering={FadeIn.duration(200).delay(80)}
            exiting={FadeOut.duration(150)}
            style={styles.activeLabel}
          >
            {t(labelKey)}
          </Animated.Text>
        )}
      </View>
    </AnimatedPressable>
  );
};

const BottomWorkoutTabBar = ({ state, navigation }: BottomTabBarProps) => {
  return (
    <SafeAreaView edges={{ bottom: true }} style={styles.safeArea}>
      <View style={styles.container}>
        {state.routes.map((route, index) => {
          const isActive = state.index === index;
          const Icon = TAB_ICONS[route.name];
          const labelKey = TAB_LABEL_KEYS[route.name];

          if (!Icon) return null;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isActive && !event.defaultPrevented) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          return (
            <TabItem
              key={route.key}
              routeKey={route.key}
              isActive={isActive}
              Icon={Icon}
              labelKey={labelKey}
              onPress={onPress}
              onLongPress={onLongPress}
            />
          );
        })}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 70,
    marginBottom: 8,
    marginHorizontal: 16,
    paddingHorizontal: 8,
    backgroundColor: "transparent",
  },
  tabSurface: {
    height: 56,
    borderRadius: 29.867,
    overflow: "hidden",
  },
  activeSize: {
    flex: 1,
  },
  inactiveSize: {
    width: 56,
    backgroundColor: "rgba(17, 17, 17, 0.2)",
  },
  glassFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 29.867,
  },
  gradientLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  tabContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  activeLabel: {
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 19,
    fontWeight: "500",
    textAlign: "center",
  },
});

export default BottomWorkoutTabBar;
