import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { StatStopwatch, StatStretching, StrengthIcon as StrengthIconSvg } from "@/assets/icons";
import { WorkoutCard as WorkoutCardBg } from "@/assets/images";
import { GlassView } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

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
  onStartPress?: () => void;
}

const WorkoutCard = ({
  title = "Today's Workout",
  workoutName = "Push - Heavy",
  exerciseCount = 12,
  duration = "75min",
  tags = ["Chest", "Tricep", "Forearms", "Core"],
  programType = "Strength",
  programWeek = "Week 6/12",
  programDay = "Day 2",
  onStartPress,
}: WorkoutCardProps) => {
  return (
    <View style={styles.wrapper}>
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
          <Text style={styles.title}>{title}</Text>
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
        <View style={styles.tagRow}>
          {tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <GlassView
                pointerEvents="none"
                glassEffectStyle="clear"
                colorScheme="dark"
                style={styles.tagGlass}
              />
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Program info — positioned at bottom-left of card (Figma: top 75%, left 24) */}
      <View style={styles.programInfo}>
        <StrengthIconSvg width={36} height={36} />
        <View style={styles.programMeta}>
          <Text style={styles.programTitle}>{programType}</Text>
          <View style={styles.programSubRow}>
            <Text style={styles.programSub}>{programWeek}</Text>
            <Text style={styles.programDot}>•</Text>
            <Text style={styles.programSub}>{programDay}</Text>
          </View>
        </View>
      </View>
      

      {/* Start button — Figma: left 70%, top 66% of card */}
      <Pressable onPress={onStartPress} style={styles.startButton}>
        <GlassView
          pointerEvents="none"
          glassEffectStyle="clear"
          colorScheme="dark"
          style={styles.startGradient}
        />
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(201, 168, 76, 0.2)", "rgba(241, 203, 48, 0.2)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.startGradient}
        />
        <Text style={styles.startText}>Start</Text>
      </Pressable>

      
    </View>
  );
};

export default WorkoutCard;

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    aspectRatio: CARD_ASPECT,
  },
  cardImage: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },

  // Top content block — Figma: left:24, top:24, width: card-48
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
  metaIcon: {
    fontSize: 12,
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

  // Program info — Figma: left:25, top:222 in 337x297 = left 7.3%, top 74.7%
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

  // Start button — Figma: left:237, top:197 in 337x297 = left 70.3%, top 66.3%
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
});
