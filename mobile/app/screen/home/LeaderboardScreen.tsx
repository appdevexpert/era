import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import type { HomeStackParamList } from "@/app/navigation/types";
import {
  MedalBronze,
  MedalGold,
  MedalSilver,
  ProfileBackChevron,
} from "@/assets/icons";
import { DemoMedia } from "@/assets/images";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ScreenFades from "@/app/components/common/ScreenFades";

type PodiumPlayer = {
  name: string;
  pts: number;
  border: string;
  ptsColor: string;
};

type RankedPlayer = {
  rank: number;
  name: string;
  pts: number;
  isYou?: boolean;
};

const PODIUM: { first: PodiumPlayer; second: PodiumPlayer; third: PodiumPlayer } = {
  first: { name: "Rami", pts: 1034, border: COLORS.primary.dark, ptsColor: COLORS.primary.dark },
  second: { name: "Mike", pts: 854, border: COLORS.neutral.white, ptsColor: "rgba(255,255,255,0.6)" },
  third: { name: "Ross", pts: 724, border: COLORS.semantic.danger, ptsColor: "#DB6F6F" },
};

const RANKED_PLAYERS: RankedPlayer[] = [
  { rank: 4, name: "Jess B.", pts: 470 },
  { rank: 5, name: "Jessica L.", pts: 470 },
  { rank: 6, name: "Michael S.", pts: 520 },
  { rank: 7, name: "Liam H.", pts: 660 },
  { rank: 8, name: "David W.", pts: 710 },
  { rank: 9, name: "Sophia K.", pts: 850 },
  { rank: 10, name: "James T.", pts: 430 },
  { rank: 11, name: "Olivia F.", pts: 800 },
  { rank: 12, name: "You", pts: 590, isYou: true },
  { rank: 12, name: "Liam H.", pts: 750 },
  { rank: 13, name: "Sophia K.", pts: 900 },
];

const PODIUM_GRADIENT = [
  "#FCF3C0",
  "#F7E06F",
  "#C9A84C",
] as const;

const Avatar = ({
  size,
  border,
  borderWidth = 1,
}: {
  size: number;
  border: string;
  borderWidth?: number;
}) => (
  <View
    style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      borderWidth,
      borderColor: border,
      backgroundColor: "rgba(201, 168, 76, 0.12)",
      overflow: "hidden",
    }}
  >
    <Image
      source={DemoMedia}
      style={{ width: "100%", height: "100%" }}
      resizeMode="cover"
    />
  </View>
);

const PodiumColumn = ({
  player,
  block,
  rank,
  isFirst = false,
}: {
  player: PodiumPlayer;
  block: { height: number; numberSize: number; numberTop: number; opacity?: number };
  rank: 1 | 2 | 3;
  isFirst?: boolean;
}) => (
  <View style={[styles.podiumCol, isFirst && { flex: 1 }]}>
    <View style={styles.podiumPersonWrap}>
      <Avatar size={80} border={player.border} borderWidth={rank === 1 ? 1.333 : 1} />
      <Text style={styles.podiumName}>{player.name}</Text>
      <Text style={[styles.podiumPts, { color: player.ptsColor }]}>
        {player.pts} pts
      </Text>
      <View style={styles.awardBadge}>
        {rank === 1 ? (
          <MedalGold width={29} height={40} />
        ) : rank === 2 ? (
          <MedalSilver width={29} height={40} />
        ) : (
          <MedalBronze width={29} height={40} />
        )}
      </View>
    </View>
    <View style={[styles.podiumBlock, { opacity: block.opacity ?? 1 }, isFirst && { width: "100%" }]}>
      <View style={styles.podiumCap} />
      <LinearGradient
        colors={PODIUM_GRADIENT}
        start={{ x: 0.5, y: 1 }}
        end={{ x: 0.5, y: 0 }}
        style={[styles.podiumStem, { height: block.height }]}
      />
      <Text
        style={[
          styles.podiumNumber,
          { fontSize: block.numberSize, top: block.numberTop },
        ]}
      >
        {rank}
      </Text>
    </View>
  </View>
);

const RankRow = ({ player }: { player: RankedPlayer }) => {
  if (player.isYou) {
    return (
      <View style={styles.rowYou}>
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(201, 168, 76, 0.3)", "rgba(17, 17, 17, 0)"]}
          start={{ x: 1, y: 0.5 }}
          end={{ x: 0, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.rankWrap}>
          <Text style={styles.rankText}>#{player.rank}</Text>
        </View>
        <Avatar size={52} border={COLORS.primary.light} borderWidth={0.867} />
        <Text style={[styles.rowName, { color: COLORS.primary.base }]} numberOfLines={1}>
          {player.name}
        </Text>
        <Text style={[styles.rowPts, { color: COLORS.primary.dark }]}>
          {player.pts} pts
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.row}>
      <View style={styles.rankWrap}>
        <Text style={styles.rankText}>#{player.rank}</Text>
      </View>
      <Avatar size={52} border="transparent" borderWidth={0} />
      <Text style={styles.rowName} numberOfLines={1}>
        {player.name}
      </Text>
      <Text style={styles.rowPts}>{player.pts} pts</Text>
    </View>
  );
};

const LeaderboardScreen = () => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<HomeStackParamList>>();
  const myRank = 12;

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 110,
          paddingBottom: insets.bottom + 40,
        }}
      >
        {/* Podium */}
        <View style={styles.podiumRow}>
          <PodiumColumn
            player={PODIUM.second}
            rank={2}
            block={{ height: 149, numberSize: 80, numberTop: 60, opacity: 0.9 }}
          />
          <PodiumColumn
            player={PODIUM.first}
            rank={1}
            isFirst
            block={{ height: 200, numberSize: 100, numberTop: 75 }}
          />
          <PodiumColumn
            player={PODIUM.third}
            rank={3}
            block={{ height: 115, numberSize: 70, numberTop: 45, opacity: 0.8 }}
          />
        </View>

        {/* Ranked list inside dark sheet */}
        <View style={styles.list}>
          <View style={styles.handle} />
          {RANKED_PLAYERS.map((p, i) => (
            <RankRow key={`${p.rank}-${p.name}-${i}`} player={p} />
          ))}
        </View>
      </ScrollView>

      {/* Pinned header — same blur pattern as WorkoutPlanHeader */}
      <BlurView
        intensity={24}
        tint="dark"
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <ProfileBackChevron width={24} height={24} />
        </Pressable>
        <View style={{ gap: 6 }}>
          <Text style={styles.eyebrow}>#{myRank}</Text>
          <Text style={styles.title}>{t("progress.leaderboard")}</Text>
        </View>
      </BlurView>

      <ScreenFades />
    </View>
  );
};

export default LeaderboardScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },

  // Header — translucent blur over scrolling content
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(17, 17, 17, 0.6)",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.charcoal,
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 16,
  },
  eyebrow: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.primary.dark,
    letterSpacing: 0.48,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 28,
    fontWeight: "500",
    color: COLORS.neutral.white,
    lineHeight: 33.6,
  },

  // Podium
  podiumRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    paddingHorizontal: 16,
    marginTop: 36,
  },
  podiumCol: {
    alignItems: "center",
    gap: 16,
    width: 115,
  },
  podiumPersonWrap: {
    alignItems: "center",
    gap: 4,
    position: "relative",
  },
  podiumName: {
    fontFamily: FONTS.display,
    fontSize: 20,
    fontWeight: "500",
    color: COLORS.neutral.white,
    marginTop: 4,
  },
  podiumPts: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    fontWeight: "600",
  },
  awardBadge: {
    position: "absolute",
    right: -6,
    top: "50%",
    marginTop: -20,
    width: 29,
    height: 40,
  },

  podiumBlock: {
    width: "100%",
    alignItems: "center",
    position: "relative",
  },
  podiumCap: {
    width: "100%",
    height: 35,
    backgroundColor: "rgba(201, 168, 76, 0.55)",
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  podiumStem: {
    width: "100%",
  },
  podiumNumber: {
    position: "absolute",
    fontFamily: FONTS.medium,
    fontWeight: "500",
    color: COLORS.neutral.white,
    textAlign: "center",
  },

  // List
  list: {
    backgroundColor: "#121212",
    borderTopLeftRadius: 38,
    borderTopRightRadius: 38,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    marginTop: -20,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  handle: {
    alignSelf: "center",
    width: 54,
    height: 4,
    borderRadius: 12345,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.neutral.black3,
    borderWidth: 1,
    borderColor: COLORS.neutral.charcoal,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  rowYou: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.neutral.black3,
    borderWidth: 1,
    borderColor: COLORS.neutral.charcoal,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 14,
    overflow: "hidden",
  },
  rankWrap: {
    width: 36,
  },
  rankText: {
    fontFamily: FONTS.regular,
    fontSize: 18,
    color: COLORS.primary.dark,
    letterSpacing: 0.72,
    textTransform: "uppercase",
  },
  rowName: {
    flex: 1,
    fontFamily: FONTS.display,
    fontSize: 20,
    fontWeight: "500",
    color: COLORS.neutral.white,
  },
  rowPts: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: "rgba(240, 240, 240, 0.5)",
    letterSpacing: 0.64,
    textTransform: "uppercase",
  },
});
