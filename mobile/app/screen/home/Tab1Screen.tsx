import StatsChipsRow from "@/app/components/workout/StatsChipsRow";
import WeekDaySelector, { DayItem } from "@/app/components/workout/WeekDaySelector";
import WorkoutCard from "@/app/components/workout/WorkoutCard";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { horizontalScale, verticalScale } from "@/app/utils/responsive";
import { HomeStackParamList } from "@/app/navigation/types";
import { LinearGradient } from "expo-linear-gradient";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

const DAYS: DayItem[] = [
  { key: "mon", label: "Mon", date: "04", active: true },
  { key: "tue", label: "Tue", date: "05" },
  { key: "wed", label: "Wed", date: "06" },
  { key: "thu", label: "Thu", date: "07" },
  { key: "fri", label: "Fri", date: "08" },
  { key: "sat", label: "Sat", date: "09" },
  { key: "sun", label: "Sun", date: "10" },
];


const Tab1Screen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();

  return (
    <View style={styles.root}>
      {/* Background glow at bottom */}
      {/* <LinearGradient
        colors={["transparent", "rgba(201, 168, 76, 0.06)", "transparent"]}
        style={styles.bgGlow}
      /> */}

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>
            <Text style={styles.greetingDim}>Hi, </Text>
            Rami K.
          </Text>
          <View style={styles.avatar}>
            <LinearGradient
              colors={[COLORS.primary.dark, COLORS.primary.base]}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.avatarText}>R</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Ready to train today?</Text>

        {/* Stats chips */}
        <View style={styles.statsSection}>
          <StatsChipsRow />
        </View>

        {/* Week day selector */}
        <View style={styles.weekRow}>
          <WeekDaySelector days={DAYS} />
        </View>

        {/* Workout card */}
        <WorkoutCard onStartPress={() => navigation.navigate("WorkoutPlan")} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.neutral.black2,
  },
  // bgGlow: {
  //   position: "absolute",
  //   bottom: 0,
  //   left: 0,
  //   right: 0,
  //   height: 300,
  // },
  scrollContent: {
    paddingHorizontal: horizontalScale(20),
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: verticalScale(0),
  },
  greeting: {
    fontSize: 20,
    fontFamily: FONTS.medium,
    fontWeight: "500",
    color: "rgba(240, 240, 240, 0.9)",
  },
  greetingDim: {
    color: "rgba(240, 240, 240, 0.6)",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 100,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
  },

  // Title
  title: {
    fontFamily: FONTS.display,
    fontSize: 40,
    fontWeight: "500",
    lineHeight: 48,
    color: "rgba(240, 240, 240, 0.85)",
    width: 235,
    marginBottom: verticalScale(20),
  },

  // Stats
  statsSection: {
    marginBottom: verticalScale(28),
  },

  // Week day selector
  weekRow: {
    marginBottom: verticalScale(28),
  },

});

export default Tab1Screen;
