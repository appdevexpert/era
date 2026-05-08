import { COLORS, GRADIENTS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { horizontalScale, verticalScale } from "@/app/utils/responsive";
import { GlassView } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Exercise = {
  name: string;
  prescription: string;
  weight?: string;
  showHandle?: boolean;
};

const PRIMARY_EXERCISES: Exercise[] = [
  { name: "Incline Dumbbell Press", prescription: "3 Sets • 10 Reps", weight: "60 kg" },
  { name: "Bench Press", prescription: "3 Sets • 10 Reps", weight: "30 kg" },
  { name: "Rope Pushdown", prescription: "3 Sets • 10 Reps", weight: "40 kg" },
  { name: "Skull Crushers", prescription: "3 Sets • 10 Reps", weight: "40 kg" },
  { name: "Overhead Press", prescription: "3 Sets • 10 Reps", weight: "20 kg" },
];

const CORE_EXERCISES: Exercise[] = [
  { name: "Leg Raises", prescription: "3 Sets • 15-20 Reps" },
  { name: "Cable Crunch", prescription: "3 Sets • 15-20 Reps" },
  { name: "Plank", prescription: "3 Sets • 60 Sec" },
];

const CARDIO_EXERCISES: Exercise[] = [
  { name: "Incline Walk", prescription: "20 min • moderate to fast pace", showHandle: false },
];

const ReorderIcon = () => (
  <View style={styles.reorderIcon}>
    <View style={styles.reorderLine} />
    <View style={styles.reorderLine} />
    <View style={styles.reorderLine} />
    <View style={styles.reorderLine} />
  </View>
);

const StatCard = ({ value, label }: { value: string; label: string }) => (
  <View style={styles.statCard}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const SectionHeader = ({
  title,
  showEdit = false,
}: {
  title: string;
  showEdit?: boolean;
}) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionLine} />
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionLine} />
    {showEdit ? (
      <Pressable hitSlop={8} style={styles.editButton}>
        <Text style={styles.editText}>Edit</Text>
        <Text style={styles.editChevron}>›</Text>
      </Pressable>
    ) : null}
  </View>
);

const ExerciseRow = ({ exercise }: { exercise: Exercise }) => {
  const showHandle = exercise.showHandle !== false;

  return (
    <View style={styles.exerciseRow}>
      {showHandle ? <ReorderIcon /> : null}
      <View style={styles.exerciseCopy}>
        <Text numberOfLines={1} style={styles.exerciseName}>
          {exercise.name}
        </Text>
        <Text style={styles.exercisePrescription}>{exercise.prescription}</Text>
      </View>
      {exercise.weight ? (
        <View style={styles.weightBlock}>
          <Text style={styles.weightLabel}>Initial WT.</Text>
          <Text style={styles.weightValue}>{exercise.weight}</Text>
        </View>
      ) : null}
    </View>
  );
};

const ExerciseSection = ({
  title,
  exercises,
  showEdit = false,
}: {
  title: string;
  exercises: Exercise[];
  showEdit?: boolean;
}) => (
  <View style={styles.section}>
    <SectionHeader title={title} showEdit={showEdit} />
    <View style={styles.exerciseList}>
      {exercises.map((exercise, index) => (
        <View key={exercise.name}>
          <ExerciseRow exercise={exercise} />
          {index < exercises.length - 1 ? <View style={styles.divider} /> : null}
        </View>
      ))}
    </View>
  </View>
);

const ExerciseListScreen = () => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <View pointerEvents="none" style={styles.topFade} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + verticalScale(156),
            paddingBottom: insets.bottom + verticalScale(132),
          },
        ]}
      >
        <View style={styles.statsRow}>
          <StatCard value="5" label="exercises" />
          <StatCard value="75" label="minutes" />
        </View>

        <ExerciseSection title="Exercises" exercises={PRIMARY_EXERCISES} showEdit />
        <ExerciseSection title="Core Finisher" exercises={CORE_EXERCISES} />
        <ExerciseSection title="Treadmill Walk" exercises={CARDIO_EXERCISES} />
      </ScrollView>

      <LinearGradient
        pointerEvents="none"
        colors={["rgba(10,10,10,0)", "rgba(10,10,10,0.92)"]}
        locations={[0, 0.58]}
        style={styles.bottomFade}
      />
      <View style={[styles.buttonWrap, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable>
          <LinearGradient
            colors={GRADIENTS.primary60}
            start={{ x: 1, y: 0.5 }}
            end={{ x: 0, y: 0.5 }}
            style={styles.startButton}
          >
            <GlassView
              pointerEvents="none"
              glassEffectStyle="regular"
              colorScheme="dark"
              style={styles.buttonGlass}
            />
            <Text style={styles.startButtonText}>Start Now</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
};

export default ExerciseListScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.neutral.black2,
  },
  topFade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 121,
    backgroundColor: COLORS.neutral.black2,
  },
  scrollContent: {
    paddingHorizontal: horizontalScale(16),
    gap: verticalScale(24),
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    minHeight: 49,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COLORS.neutral.black3,
  },
  statValue: {
    fontFamily: FONTS.medium,
    fontSize: 20,
    fontWeight: "500",
    lineHeight: 24,
    color: COLORS.neutral.white,
    textAlign: "center",
  },
  statLabel: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 14.4,
    color: "rgba(240,240,240,0.6)",
    textAlign: "center",
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },
  section: {
    gap: 18,
  },
  sectionHeader: {
    minHeight: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.neutral.charcoal,
  },
  sectionTitle: {
    fontFamily: FONTS.display,
    fontSize: 17,
    fontWeight: "500",
    lineHeight: 20.4,
    color: COLORS.neutral.white,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 8,
    backgroundColor: COLORS.neutral.black2,
  },
  editText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 14.4,
    color: "rgba(240,240,240,0.8)",
    letterSpacing: 0.48,
  },
  editChevron: {
    fontFamily: FONTS.regular,
    fontSize: 18,
    lineHeight: 18,
    color: "rgba(240,240,240,0.8)",
  },
  exerciseList: {
    width: "100%",
    gap: 12,
  },
  exerciseRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  reorderIcon: {
    width: 24,
    height: 24,
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 3,
  },
  reorderLine: {
    width: 12,
    height: 1.4,
    borderRadius: 1,
    backgroundColor: "rgba(240,240,240,0.65)",
  },
  exerciseCopy: {
    flex: 1,
    minWidth: 0,
    gap: 8,
    paddingVertical: 12,
  },
  exerciseName: {
    fontFamily: FONTS.medium,
    fontSize: 20,
    fontWeight: "500",
    lineHeight: 24,
    color: COLORS.neutral.white,
  },
  exercisePrescription: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 14.4,
    color: COLORS.primary.dark,
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },
  weightBlock: {
    alignItems: "flex-end",
    gap: 8,
  },
  weightLabel: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 14.4,
    color: "rgba(240,240,240,0.8)",
    textAlign: "right",
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },
  weightValue: {
    fontFamily: FONTS.medium,
    fontSize: 20,
    fontWeight: "500",
    lineHeight: 24,
    color: COLORS.neutral.white,
    textAlign: "right",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.neutral.charcoal,
  },
  bottomFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 121,
  },
  buttonWrap: {
    position: "absolute",
    left: horizontalScale(18),
    right: horizontalScale(18),
    bottom: 0,
  },
  startButton: {
    height: 56,
    borderRadius: 138,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  buttonGlass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 138,
  },
  startButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 22,
    color: COLORS.neutral.white,
    textAlign: "center",
    letterSpacing: 0.36,
  },
});
