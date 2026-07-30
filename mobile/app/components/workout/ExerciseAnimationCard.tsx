import { COLORS } from "@/app/constants/colors";
import PressableScale from "@/app/components/common/PressableScale";
import { Feather } from "@expo/vector-icons";
import { NavigationContext } from "@react-navigation/native";
import { useVideoPlayer, VideoView } from "expo-video";
import { useCallback, useContext, useEffect, useState } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

/** Remote URL (Supabase/CDN) or a bundled `require(...)` asset. */
export type ExerciseMediaSource = string | number;

type ExerciseAnimationCardProps = {
  /** Demo clip. Omit to render nothing. */
  video?: ExerciseMediaSource | null;
  /**
   * Admin-controlled per exercise. True = loops forever. False = plays once,
   * then shows a tap-to-play button so the user can replay it deliberately.
   */
  loop?: boolean;
  style?: StyleProp<ViewStyle>;
};

// Figma "Exercise animation placement": 370 x 206 tile inside the screen's
// 16pt gutters. Kept as a ratio so the tile stays edge-to-edge on any width.
const ASPECT_RATIO = 370 / 206;
const FADE_IN_MS = 220;

/**
 * Screen-focus, but safe outside a navigator.
 *
 * `useIsFocused()` throws "Couldn't find a navigation object" when no navigator
 * is above it, and `BottomSheetModalProvider` sits OUTSIDE `NavigationContainer`
 * in App.tsx — so anything portaled into a BottomSheetModal (e.g. the exercise
 * info sheet) has no navigation context at all. Reading the context directly
 * returns `undefined` there instead of throwing.
 *
 * No navigator → treat as focused. A sheet's content is only mounted while the
 * sheet is open, so "mounted" already means "visible" and the clip should play.
 */
const useIsScreenFocused = (): boolean => {
  const navigation = useContext(NavigationContext);
  const [isFocused, setIsFocused] = useState(() => navigation?.isFocused() ?? true);

  useEffect(() => {
    if (!navigation) {
      setIsFocused(true);
      return;
    }
    // Sync once on attach — the screen can focus between render and this effect.
    setIsFocused(navigation.isFocused());
    const unsubscribeFocus = navigation.addListener("focus", () => setIsFocused(true));
    const unsubscribeBlur = navigation.addListener("blur", () => setIsFocused(false));
    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation]);

  return isFocused;
};

/**
 * The exercise demo tile that sits under the Workout Log header.
 *
 * Silent and control-free while playing — it reads as an animation, not a video
 * player. The video fades in once the first frame is decodable, so buffering
 * shows the empty card surface rather than a black rectangle snapping in.
 */
const ExerciseAnimationCard = ({
  video,
  loop = true,
  style,
}: ExerciseAnimationCardProps) => {
  const isFocused = useIsScreenFocused();
  const [isReady, setIsReady] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const videoOpacity = useSharedValue(0);

  const player = useVideoPlayer(video ?? null, (p) => {
    p.loop = loop;
    // Muted on purpose — the demo must never interrupt the user's music
    // mid-set, and there is no audio worth hearing in an animation.
    p.muted = true;
  });

  // Read `player.status` directly as well as subscribing to it. A bundled asset
  // can reach `readyToPlay` in the gap between render and this effect attaching,
  // and that one missed event left the video pinned at opacity 0 — a permanently
  // invisible card. The listener alone is not enough; the sync read closes it.
  useEffect(() => {
    const sync = () => setIsReady(player.status === "readyToPlay");
    const sub = player.addListener("statusChange", sync);
    sync();
    return () => sub.remove();
  }, [player]);

  useEffect(() => {
    videoOpacity.value = withTiming(isReady ? 1 : 0, { duration: FADE_IN_MS });
  }, [isReady, videoOpacity]);

  // `loop` arrives from the DB, so it can change between exercises while this
  // player instance is reused. Keep the live player in sync with the prop.
  useEffect(() => {
    player.loop = loop;
  }, [player, loop]);

  // Non-looping clips need the replay affordance once they finish. Looping ones
  // never fire this, so the flag stays false and no button ever appears.
  //
  // `useVideoPlayer` builds a whole new player when the source changes, so reset
  // here too — otherwise a finished clip would leave the replay button sitting
  // over the next exercise's video.
  useEffect(() => {
    setHasEnded(false);
    const sub = player.addListener("playToEnd", () => {
      if (!player.loop) setHasEnded(true);
    });
    return () => sub.remove();
  }, [player]);

  // Stop decoding while the user is on the rest timer / another exercise —
  // WorkoutLogScreen stays mounted in the stack, so without this the clip
  // would keep looping off-screen for the whole session.
  useEffect(() => {
    if (!video) return;
    if (isFocused && !hasEnded) {
      player.play();
    } else {
      player.pause();
    }
  }, [isFocused, player, video, hasEnded]);

  const replay = useCallback(() => {
    setHasEnded(false);
    player.currentTime = 0;
    player.play();
  }, [player]);

  const videoStyle = useAnimatedStyle(() => ({ opacity: videoOpacity.value }));

  // No clip for this exercise → no empty box in the layout.
  if (!video) return null;

  return (
    <View style={[styles.card, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, videoStyle]}>
        <VideoView
          style={StyleSheet.absoluteFill}
          player={player}
          contentFit="cover"
          nativeControls={false}
          allowsFullscreen={false}
          allowsPictureInPicture={false}
        />
      </Animated.View>

      {hasEnded ? (
        <View style={styles.replayOverlay}>
          <PressableScale onPress={replay} hitSlop={12}>
            <View style={styles.replayButton}>
              {/* Nudged right so the triangle reads optically centred. */}
              <Feather
                name="play"
                size={24}
                color={COLORS.primary.base}
                style={styles.replayIcon}
              />
            </View>
          </PressableScale>
        </View>
      ) : null}
    </View>
  );
};

export default ExerciseAnimationCard;

const styles = StyleSheet.create({
  card: {
    width: "100%",
    aspectRatio: ASPECT_RATIO,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: COLORS.neutral.black3,
  },
  replayOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.alpha.blackScrim,
  },
  replayButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.alpha.primary20,
    borderWidth: 1,
    borderColor: COLORS.alpha.primary60,
  },
  replayIcon: {
    marginLeft: 3,
  },
});
