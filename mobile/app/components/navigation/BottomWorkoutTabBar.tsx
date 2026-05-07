import {
  SolarChartBoldDuotone,
  SolarDumbbellBoldDuotone,
  SolarHomeAngle2BoldDuotone,
  SolarLunchBoldDuotone,
} from "@/app/components/icons/SolarTabIcons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { ComponentType } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { SvgProps } from "react-native-svg";
import { SafeAreaView } from "react-native-screens/experimental";

const TAB_ICONS: Record<
  string,
  ComponentType<SvgProps & { color?: string; secondaryColor?: string; size?: number }>
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

const BottomWorkoutTabBar = ({ state, navigation }: BottomTabBarProps) => {
  const { t } = useTranslation();

  return (
    <SafeAreaView edges={{ bottom: true }} style={styles.safeArea}>
      <View style={styles.container}>
        {state.routes.map((route, index) => {
          const isActive = state.index === index;
          const iconColor = isActive ? "#C9A84C" : "#FFFFFF";
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
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          if (isActive) {
            return (
              <View key={route.key} style={styles.activeWrapper}>
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected: true }}
                  onPress={onPress}
                  onLongPress={onLongPress}
                  style={styles.activeTab}
                >
                  <BlurView
                    intensity={40}
                    tint="dark"
                    style={StyleSheet.absoluteFill}
                  />
                  <LinearGradient
                    colors={["rgba(201, 168, 76, 0.25)", "rgba(241, 203, 48, 0.25)"]}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.glassBorder} />
                  <View style={styles.glow} />
                  <Icon size={24} color={iconColor} secondaryColor={iconColor} />
                  <Text style={styles.activeLabel}>{t(labelKey)}</Text>
                </Pressable>
              </View>
            );
          }

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: false }}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.iconTab}
            >
              <Icon size={28} color={iconColor} secondaryColor={iconColor} />
            </Pressable>
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
    paddingHorizontal: 8,
    backgroundColor: "rgba(20, 20, 20, 0.85)",
    borderRadius: 40,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  activeWrapper: {
    flex: 1,
    height: 56,
  },
  activeTab: {
    flex: 1,
    borderRadius: 29.867,
    paddingHorizontal: 14.933,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    overflow: "hidden",
  },
  glassBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 29.867,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  iconTab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(30, 30, 30, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.10)",
  },
  glow: {
    position: "absolute",
    left: "50%",
    marginLeft: -21,
    top: 44.8,
    width: 42,
    height: 42,
    borderRadius: 93.333,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
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
