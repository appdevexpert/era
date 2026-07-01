import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { StatStopwatch, StatStretching } from "@/assets/icons";
import { WorkoutCard as WorkoutCardBg } from "@/assets/images";
import GlassFill from "@/app/components/common/GlassFill";
import StrengthProgressRing from "@/app/components/workout/StrengthProgressRing";
import { GlassView } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import { Image, StyleSheet, Text, View } from "react-native";
import PressableScale from "@/app/components/common/PressableScale";
import { useTranslation } from "react-i18next";

// Figma: card 337x297, content at (24,24) w=289, program at (25,222), start at (237,197)
const CARD_ASPECT = 337 / 297;


interface WorkoutCardProps {
  title?: string;
  workoutName?: string;
  exerciseCount?: number;
  duration?: string;
  tags?: string[];
  programType?: string;
  programWeek?: string;
  programDay?: string;
  completed?: boolean;
  /** 0-1 completion for the strength ring. Overridden to 1 when completed. */
  progress?: number;
  onCardPress?: () => void;
  onStartPress?: () => void;
}

const WorkoutCard = ({
  title,
  workoutName = "",
  exerciseCount = 0,
  duration = "",
  tags = [],
  programType = "",
  programWeek = "",
  programDay = "",
  completed = false,
  progress = 0,
  onCardPress,
  onStartPress,
}: WorkoutCardProps) => {
  const ringProgress = completed ? 1 : progress;
  const { t } = useTranslation();

  return (
    <View style={styles.wrapper}>
      <PressableScale onPress={onCardPress} style={styles.cardPressLayer}>
        {/* Card shape image */}
        <Image
          source={WorkoutCardBg}
          style={styles.cardImage}
          resizeMode="contain"
        />

        {/* Top content: header, name, tags */}
        <View style={styles.topContent}>
          {/* Header row */}
          <View style={styles.header}>
            <Text style={styles.title}>{title ?? t("workout.ui.todaysWorkout")}</Text>
            <View style={styles.meta}>
              <View style={styles.metaItem}>
                <StatStretching width={14} height={14} />
                <Text style={styles.metaText}>{exerciseCount}</Text>
              </View>
              <View style={styles.metaItem}>
                <StatStopwatch width={14} height={14} />
                <Text style={styles.metaText}>{duration}</Text>
              </View>
            </View>
          </View>

          {/* Workout name */}
          <Text style={styles.workoutName}>{workoutName}</Text>

          {/* Tags */}
          {tags.length > 0 ? (
            <View style={styles.tagRow}>
              {tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <GlassFill effect="clear" style={styles.tagGlass} />
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {/* Program info — positioned at bottom-left of card */}
        <View style={styles.programInfo}>
          <StrengthProgressRing progress={ringProgress} size={36} />
          <View style={styles.programMeta}>
            <Text style={styles.programTitle}>
              {completed
                ? t("workout.ui.completed").toUpperCase()
                : programType}
            </Text>
            <View style={styles.programSubRow}>
              <Text style={styles.programSub}>
                {programWeek}
              </Text>
              {programWeek && programDay ? <Text style={styles.programDot}>•</Text> : null}
              <Text style={styles.programSub}>
                {programDay}
              </Text>
            </View>
          </View>
        </View>
      </PressableScale>

      {/* Start / View button */}
      <PressableScale onPress={onStartPress} style={styles.startButton}>
        <GlassView
          pointerEvents="none"
          glassEffectStyle={{
            style: "clear",
            animate: true,
            animationDuration: 0.5,
          }}
          colorScheme="light"
          style={styles.startGradient}
        />
        <LinearGradient
          pointerEvents="none"
          colors={
            completed
              ? ["rgba(201, 168, 76, 0.12)", "rgba(241, 203, 48, 0.12)"]
              : ["rgba(201, 168, 76, 0.2)", "rgba(241, 203, 48, 0.2)"]
          }
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.startGradient}
        />
        <Text style={[styles.startText, completed && styles.startTextCompleted]}>
          {completed ? t("workout.ui.view") : t("workout.ui.start")}
        </Text>
      </PressableScale>


    </View>
  );
};

export default WorkoutCard;

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    aspectRatio: CARD_ASPECT,
  },
  cardPressLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  cardImage: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },

  // Top content block
  topContent: {
    position: "absolute",
    top: "8%",
    left: "7%",
    right: "7%",
    gap: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    fontWeight: "500",
    color: COLORS.neutral.white,
  },
  meta: {
    flexDirection: "row",
    gap: 14,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2.3,
  },
  metaText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    fontWeight: "500",
    color: COLORS.neutral.white,
  },
  workoutName: {
    fontFamily: FONTS.display,
    fontSize: 40,
    fontWeight: "500",
    color: COLORS.neutral.white,
    lineHeight: 40,
  },
  tagRow: {
    flexDirection: "row",
    gap: 8,
  },
  tag: {
    backgroundColor: "transparent",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 100,
    overflow: "hidden",
  },
  tagGlass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 100,
  },
  tagText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    fontWeight: "500",
    color: COLORS.neutral.white,
    letterSpacing: 0.24,
  },

  // Program info
  programInfo: {
    position: "absolute",
    left: "7.3%",
    bottom: "8%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  programMeta: {
    gap: 4,
  },
  programTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    fontWeight: "700",
    color: COLORS.neutral.white,
    textTransform: "uppercase",
  },
  programSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  programSub: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    fontWeight: "600",
    color: "rgba(240, 240, 240, 0.6)",
  },
  programDot: {
    fontSize: 12,
    color: "rgba(240, 240, 240, 0.6)",
  },

  // Start/View button
  startButton: {
    position: "absolute",
    right: 0,
    top: "66%",
    width: 100,
    height: 100,
    borderRadius: 139,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginTop: 8,
  },
  startGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 139,
  },
  startText: {
    fontFamily: FONTS.display,
    fontSize: 27.778,
    fontWeight: "500",
    color: COLORS.primary.dark,
    letterSpacing: -1.1,
  },
  startTextCompleted: {
    fontSize: 24,
    color: "rgba(180, 155, 65, 0.7)",
  },
});
