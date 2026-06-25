import { COLORS, GRADIENTS } from "@/app/constants/colors";
import { IntroBackground, GetIcon } from "@/assets/images";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Text as SvgText } from "react-native-svg";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import GlassFill from "@/app/components/common/GlassFill";
import { AuthStackParamList } from "@/app/navigation/types";
import { setHasSeenGetStarted } from "@/app/stores/slice/authSlice";
import { useAppDispatch } from "@/app/stores/store";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const BUTTON_HEIGHT = 70;
const CIRCLE_SIZE = 62;
const CIRCLE_MARGIN = 4;
const MAX_SLIDE = 354 - CIRCLE_SIZE - CIRCLE_MARGIN * 2;
const TRIGGER_THRESHOLD = MAX_SLIDE * 0.5;

type Nav = NativeStackNavigationProp<AuthStackParamList, "GetStarted">;

const GetStarted = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const translateX = useSharedValue(0);
  const hasNavigated = useSharedValue(false);

  const navigate = () => {
    // Mark the gate as crossed so the user lands on Login directly on every
    // future launch. Only an account delete (RESET_ALL) brings GetStarted back.
    dispatch(setHasSeenGetStarted(true));
    navigation.replace("Login");
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX(10)
    .failOffsetY([-20, 20])
    .onUpdate((e) => {
      translateX.value = Math.min(Math.max(e.translationX, 0), MAX_SLIDE);
    })
    .onEnd(() => {
      if (translateX.value > TRIGGER_THRESHOLD && !hasNavigated.value) {
        hasNavigated.value = true;
        translateX.value = withSpring(MAX_SLIDE, {
          damping: 20,
          stiffness: 200,
        });
        runOnJS(navigate)();
      } else {
        translateX.value = withSpring(0, {
          damping: 30,
          stiffness: 150,
          overshootClamping: true,
        });
      }
    });

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, MAX_SLIDE * 0.6], [1, 0]),
    transform: [
      { translateX: interpolate(translateX.value, [0, MAX_SLIDE], [0, MAX_SLIDE * 0.3]) },
    ],
  }));

  return (
    <View style={styles.container}>
      {/* Background Image */}
      <Image
        source={IntroBackground}
        style={styles.backgroundImage}
        contentFit="cover"
        contentPosition="bottom"
      />

      {/* ERA Title */}
      <View style={styles.titleContainer}>
        <Svg height={110} width={300}>
          <Defs>
            <SvgGradient id="eraGrad" x1="0.5" y1="0" x2="0.5" y2="1">
              <Stop offset="0" stopColor={GRADIENTS.wordmark[0]} />
              <Stop offset="1" stopColor={GRADIENTS.wordmark[1]} />
            </SvgGradient>
          </Defs>
          <SvgText
            fill="url(#eraGrad)"
            fontSize={101.451}
            fontFamily="Italiana-Regular"
            x="50%"
            y={95}
            textAnchor="middle"
          >
            ERA
          </SvgText>
        </Svg>
      </View>

      {/* Quote Card */}
      <View style={styles.quoteCard}>
        <Text style={styles.quoteText}>{t("getStarted.quote")}</Text>
      </View>

      {/* Slide-to-start Button */}
      <View style={[styles.buttonContainer, { bottom: insets.bottom + 20 }]}>
        <View style={styles.button}>
          <GlassFill style={styles.buttonGlass} />

          {/* Button Text */}
          <Animated.Text style={[styles.buttonText, textStyle]}>
            {t("getStarted.button")}
          </Animated.Text>

          {/* Draggable golden circle */}
          <GestureDetector gesture={panGesture}>
            <Animated.View style={[styles.circleWrapper, circleStyle]}>
              <Image source={GetIcon} style={{ width: 62, height: 61 }} />
            </Animated.View>
          </GestureDetector>
        </View>
      </View>

      {/* Bottom gradient fade */}
      <LinearGradient
        colors={[COLORS.alpha.transparent, COLORS.alpha.blackScrim]}
        style={styles.bottomGradient}
        pointerEvents="none"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.black,
  },
  backgroundImage: {
    position: "absolute",
    top: 0,
    left: -147,
    width: 583,
    height: 874,
  },
  titleContainer: {
    position: "absolute",
    top: SCREEN_HEIGHT * 0.18,
    alignSelf: "center",
  },
  titleText: {
    fontFamily: "Italiana-Regular",
    fontSize: 101.451,
    textAlign: "center",
    color: COLORS.neutral.black,
  },
  quoteCard: {
    position: "absolute",
    bottom: 160,
    left: 20,
    right: 20,
    height: 98,
    backgroundColor: COLORS.alpha.surface08,
    borderRadius: 24,
    padding: 16,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  quoteText: {
    color: COLORS.alpha.white80,
    fontSize: 16,
    lineHeight: 22.4,
    textAlign: "center",
  },
  buttonContainer: {
    position: "absolute",
    left: 20,
    right: 20,
  },
  button: {
    height: BUTTON_HEIGHT,
    borderRadius: 111,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
  },
  buttonGlass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 111,
  },
  circleWrapper: {
    position: "absolute",
    left: CIRCLE_MARGIN,
    top: (BUTTON_HEIGHT - CIRCLE_SIZE) / 2,
  },
  buttonText: {
    flex: 1,
    color: COLORS.neutral.white,
    fontSize: 22.264,
    fontWeight: "500",
    textAlign: "center",
  },
  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 35,
  },
});

export default GetStarted;
