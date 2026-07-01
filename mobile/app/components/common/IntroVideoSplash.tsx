import AsyncStorage from "@react-native-async-storage/async-storage";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

const FORCE_PLAY_INTRO_EVERY_TIME = false;

const INTRO_SHOWN_KEY = "@era:intro_shown";
const END_EPSILON_SECONDS = 0.15;
const POLL_INTERVAL_MS = 150;
// Absolute cap so we can never trap the user on the splash if both players
// silently fail to emit end events. Larger than intro (~7 MB) + short combined.
const MAX_TOTAL_DURATION_MS = 60000;
const FADE_OUT_DURATION_MS = 450;
const TRANSITION_FADE_MS = 280;

const introSource = require("../../../assets/video/intro.mp4");
const shortSource = require("../../../assets/video/short.mp4");

interface IntroVideoSplashProps {
  onFinish: () => void;
}

const IntroVideoSplash = ({ onFinish }: IntroVideoSplashProps) => {
  const [queue, setQueue] = useState<number[] | null>(null);

  useEffect(() => {
    if (FORCE_PLAY_INTRO_EVERY_TIME) {
      setQueue([introSource]);
      return;
    }
    let mounted = true;
    AsyncStorage.getItem(INTRO_SHOWN_KEY)
      .then((flag) => {
        if (!mounted) return;
        // First launch → intro. Subsequent launches → short.
        setQueue(flag === "1" ? [shortSource] : [introSource]);
      })
      .catch(() => {
        // AsyncStorage read failed — safer to fall through to short so we don't
        // replay the long intro on every crash-loop launch.
        if (mounted) setQueue([shortSource]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (!queue) {
    return <View style={styles.container} />;
  }

  return <VideoQueuePlayer queue={queue} onFinish={onFinish} />;
};

interface VideoQueuePlayerProps {
  queue: number[];
  onFinish: () => void;
}

/**
 * Plays a queue of local video sources without ever swapping a source on a live
 * player. Each source gets its own dedicated `useVideoPlayer` and stacked
 * `VideoView`; we cross-fade opacity when one ends. This avoids the
 * `replaceAsync` mid-playback hang that would freeze the splash between videos.
 */
const VideoQueuePlayer = ({ queue, onFinish }: VideoQueuePlayerProps) => {
  const containerOpacity = useSharedValue(1);
  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const finishedRef = useRef(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (!FORCE_PLAY_INTRO_EVERY_TIME) {
      AsyncStorage.setItem(INTRO_SHOWN_KEY, "1").catch(() => {});
    }
    containerOpacity.value = withTiming(
      0,
      { duration: FADE_OUT_DURATION_MS },
      (done) => {
        if (done) scheduleOnRN(onFinish);
      },
    );
  };

  const advance = () => {
    if (finishedRef.current) return;
    setActiveIndex((prev) => {
      const next = prev + 1;
      if (next >= queue.length) {
        scheduleOnRN(finish);
        return prev;
      }
      return next;
    });
  };

  // Absolute safety net — always dismiss after MAX_TOTAL_DURATION_MS even if
  // every player-side end signal (playToEnd / polling / statusChange) fails.
  useEffect(() => {
    const timer = setTimeout(finish, MAX_TOTAL_DURATION_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      {queue.map((source, index) => (
        <QueueVideoLayer
          key={index}
          source={source}
          isActive={index === activeIndex}
          onEnded={advance}
        />
      ))}
    </Animated.View>
  );
};

interface QueueVideoLayerProps {
  source: number;
  isActive: boolean;
  onEnded: () => void;
}

const QueueVideoLayer = ({ source, isActive, onEnded }: QueueVideoLayerProps) => {
  const layerOpacity = useSharedValue(0);
  const layerStyle = useAnimatedStyle(() => ({ opacity: layerOpacity.value }));

  const player = useVideoPlayer(source, (p) => {
    p.loop = false;
    // Autoplay disabled — we call play() only when this layer becomes active.
  });

  const endedRef = useRef(false);
  const startedRef = useRef(false);
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;

  useEffect(() => {
    if (isActive) {
      if (!startedRef.current) {
        startedRef.current = true;
        player.play();
      }
      layerOpacity.value = withTiming(1, { duration: TRANSITION_FADE_MS });
    } else {
      layerOpacity.value = withTiming(0, { duration: TRANSITION_FADE_MS });
    }
  }, [isActive, layerOpacity, player]);

  useEffect(() => {
    const fireEnded = () => {
      if (endedRef.current) return;
      if (!isActiveRef.current) return;
      endedRef.current = true;
      onEnded();
    };

    const sub1 = player.addListener("playToEnd", fireEnded);
    // Fallback 1 — some devices pause with `isPlaying=false` at end without
    // emitting playToEnd. Cross-check duration/currentTime when that happens.
    const sub2 = player.addListener("playingChange", (event) => {
      if (!isActiveRef.current) return;
      const duration = player.duration;
      const currentTime = player.currentTime;
      if (
        !event.isPlaying &&
        duration > 0 &&
        currentTime >= duration - END_EPSILON_SECONDS
      ) {
        fireEnded();
      }
    });

    // Fallback 2 — plain interval polling. No `currentTime > 0` gate, because
    // some expo-video builds reset currentTime to 0 after the source finishes,
    // which used to defeat detection entirely.
    const poll = setInterval(() => {
      if (!isActiveRef.current) return;
      const duration = player.duration;
      const currentTime = player.currentTime;
      if (duration > 0 && currentTime >= duration - END_EPSILON_SECONDS) {
        fireEnded();
      }
    }, POLL_INTERVAL_MS);

    return () => {
      sub1.remove();
      sub2.remove();
      clearInterval(poll);
    };
  }, [player, onEnded]);

  return (
    <Animated.View style={[StyleSheet.absoluteFillObject, layerStyle]}>
      <VideoView
        style={StyleSheet.absoluteFillObject}
        player={player}
        contentFit="cover"
        nativeControls={false}
        allowsFullscreen={false}
        allowsPictureInPicture={false}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
    zIndex: 9999,
    elevation: 9999,
  },
});

export default IntroVideoSplash;
