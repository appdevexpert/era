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
const MAX_TOTAL_DURATION_MS = 30000;
const FADE_OUT_DURATION_MS = 450;
const TRANSITION_FADE_MS = 280;

const introSource = require("../../../assets/video/intro.mp4");
const shortSource = require("../../../assets/video/short.mp4");

interface IntroVideoSplashProps {
  onFinish: () => void;
}

const IntroVideoSplash = ({
  onFinish }: IntroVideoSplashProps) => {
  const [queue, setQueue] = useState<number[] | null>(null);

  useEffect(() => {
    if (FORCE_PLAY_INTRO_EVERY_TIME) {
      setQueue([introSource, shortSource]);
      return;
    }
    let mounted = true;
    AsyncStorage.getItem(INTRO_SHOWN_KEY)
      .then((flag) => {
        if (!mounted) return;
        setQueue(flag === "1" ? [shortSource] : [introSource, shortSource]);
      })
      .catch(() => {
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

const VideoQueuePlayer = ({ queue, onFinish }: VideoQueuePlayerProps) => {
  const indexRef = useRef(0);
  const finishedRef = useRef(false);
  const advancingForIndexRef = useRef<number>(-1);
  const containerOpacity = useSharedValue(1);
  const videoOpacity = useSharedValue(0);
  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));
  const videoStyle = useAnimatedStyle(() => ({ opacity: videoOpacity.value }));

  const player = useVideoPlayer(queue[0], (p) => {
    p.loop = false;
    p.play();
  });

  useEffect(() => {
    videoOpacity.value = withTiming(1, { duration: TRANSITION_FADE_MS });
  }, [videoOpacity]);

  useEffect(() => {
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

    const loadNext = (next: number) => {
      if (finishedRef.current) return;
      indexRef.current = next;
      const nextSource = queue[next];
      const maybePromise = player.replaceAsync
        ? player.replaceAsync(nextSource)
        : Promise.resolve(player.replace(nextSource));
      Promise.resolve(maybePromise)
        .then(() => {
          if (finishedRef.current) return;
          player.play();
          videoOpacity.value = withTiming(1, { duration: TRANSITION_FADE_MS });
        })
        .catch(() => finish());
    };

    const advance = () => {
      if (finishedRef.current) return;
      const current = indexRef.current;
      if (advancingForIndexRef.current === current) return;
      advancingForIndexRef.current = current;

      const next = current + 1;
      if (next >= queue.length) {
        videoOpacity.value = withTiming(
          0,
          { duration: TRANSITION_FADE_MS },
          (done) => {
            if (done) scheduleOnRN(finish);
          },
        );
        return;
      }
      videoOpacity.value = withTiming(
        0,
        { duration: TRANSITION_FADE_MS },
        (done) => {
          if (done) scheduleOnRN(loadNext, next);
        },
      );
    };

    const sub1 = player.addListener("playToEnd", advance);
    const sub2 = player.addListener("playingChange", (event) => {
      if (finishedRef.current) return;
      const duration = player.duration;
      const currentTime = player.currentTime;
      if (
        !event.isPlaying &&
        duration > 0 &&
        currentTime > 0 &&
        currentTime >= duration - END_EPSILON_SECONDS
      ) {
        advance();
      }
    });

    const poll = setInterval(() => {
      if (finishedRef.current) return;
      const duration = player.duration;
      const currentTime = player.currentTime;
      if (
        duration > 0 &&
        currentTime > 0 &&
        currentTime >= duration - END_EPSILON_SECONDS
      ) {
        advance();
      }
    }, POLL_INTERVAL_MS);

    const safety = setTimeout(finish, MAX_TOTAL_DURATION_MS);

    return () => {
      sub1.remove();
      sub2.remove();
      clearInterval(poll);
      clearTimeout(safety);
    };
  }, [player, queue, onFinish, containerOpacity, videoOpacity]);

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <Animated.View style={[StyleSheet.absoluteFillObject, videoStyle]}>
        <VideoView
          style={StyleSheet.absoluteFillObject}
          player={player}
          contentFit="cover"
          nativeControls={false}
          allowsFullscreen={false}
          allowsPictureInPicture={false}
        />
      </Animated.View>
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
