import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { ArrowBack } from "@/assets/icons";
import { BlurView } from "expo-blur";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackHeaderProps } from "@react-navigation/native-stack";

const WorkoutPlanHeader = ({ navigation }: NativeStackHeaderProps) => {
  const insets = useSafeAreaInsets();

  return (
    <BlurView intensity={24} tint="dark" style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <ArrowBack width={8} height={16} />
        </Pressable>
        <View style={styles.textBlock}>
          <Text style={styles.subtitle}>12 Week Personalized</Text>
          <Text style={styles.title}>Workout Plan</Text>
        </View>
      </View>
    </BlurView>
  );
};

export default WorkoutPlanHeader;

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(17,17,17,0.6)",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.charcoal,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 16,
  },
  textBlock: {
    gap: 6,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: "400",
    color: COLORS.primary.dark,
    textTransform: "uppercase",
    letterSpacing: 0.48,
    lineHeight: 14.4,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 28,
    fontWeight: "500",
    color: COLORS.neutral.white,
    lineHeight: 33.6,
  },
});
