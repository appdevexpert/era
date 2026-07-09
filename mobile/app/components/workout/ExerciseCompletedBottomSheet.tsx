import AddComment from "@/app/components/common/AddComment";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import GlassFill from "@/app/components/common/GlassFill";
import { LinearGradient } from "expo-linear-gradient";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import PressableScale from "@/app/components/common/PressableScale";
import { useTranslation } from "react-i18next";
import {
  BottomSheetFooter,
  BottomSheetFooterProps,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetScrollViewMethods,
} from "@gorhom/bottom-sheet";
import { useSelector } from "react-redux";
import type { RootState } from "@/app/stores/store";
import { useWeightUnit } from "@/app/hooks/useWeightUnit";
import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

type SetSummary = {
  weight: string;
  reps: number;
  setNumber: number;
  duration?: number | null;
};

type ExerciseCompletedBottomSheetProps = {
  /** Sheet subscribes to Redux `completedSets[exerciseLibraryId]` directly so the
   *  latest set shows up even when present() fires before the parent re-renders. */
  exerciseLibraryId: string | undefined;
  /** Previously-saved per-exercise comment, used to prefill the textarea on revisit. */
  initialComment?: string;
  onContinue: (comment: string) => void;
};

const REVEAL_MARGIN = 8;
const CONTINUE_BUTTON_HEIGHT = 53;
const FOOTER_TOP_PADDING = 10;

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const SetCard = ({ set }: { set: SetSummary }) => {
  const { t } = useTranslation();
  const isTimed = set.duration != null && set.duration > 0;
  return (
    <View style={styles.setCard}>
      <Text style={styles.setCardValue}>
        {isTimed
          ? formatDuration(set.duration!)
          : t("workout.ui.repsFormat", { weight: set.weight, reps: set.reps })}
      </Text>
      <Text style={styles.setCardLabel}>
        {t("workout.ui.setLabel", { number: set.setNumber }).toUpperCase()}
      </Text>
    </View>
  );
};

/**
 * Shown after the last set of an exercise is logged. Rendered as a
 * `BottomSheetModal` (portal), so it lives outside `WorkoutLogScreen`'s
 * layout tree and doesn't fight the parent ScrollView for keyboard insets.
 *
 * `AddComment` uses plain `TextInput` (not `BottomSheetTextInput`), which
 * removes gorhom's `animatedKeyboardState` shared-value writes on focus/blur
 * — the source of the close-crash race with the sheet's dismiss worklet.
 */
const ExerciseCompletedBottomSheet = forwardRef<BottomSheetModal, ExerciseCompletedBottomSheetProps>(
  function ExerciseCompletedBottomSheet({ exerciseLibraryId, initialComment = "", onContinue }, ref) {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const { height: windowHeight } = useWindowDimensions();
    // Own the modal ref internally so we can expand/collapse it on keyboard
    // events (gorhom's auto-extend is off for plain TextInputs). Still forward
    // the instance to the parent so present()/dismiss() keep working.
    const sheetRef = useRef<BottomSheetModal>(null);
    useImperativeHandle(ref, () => sheetRef.current as BottomSheetModal, []);
    const scrollRef = useRef<BottomSheetScrollViewMethods>(null);
    const scrollY = useRef(0);
    const commentFocused = useRef(false);
    const commentFieldRef = useRef<View>(null);
    const kbHeight = useRef(0);
    const footerHeightRef = useRef(0);
    const lastContentHeight = useRef(0);
    const [footerHeight, setFooterHeight] = useState(0);
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const kbSpacer = useSharedValue(0);
    const kbTranslate = useSharedValue(0);
    const keyboardSpacerStyle = useAnimatedStyle(
      () => ({ height: kbSpacer.value > 0 ? kbSpacer.value + footerHeight : 0 }),
      [footerHeight],
    );
    const footerStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: -kbTranslate.value }],
    }));
    const [comment, setComment] = useState(initialComment);

    const { format: formatWeight } = useWeightUnit();
    const loggedMap = useSelector((state: RootState) =>
      exerciseLibraryId ? state.session.completedSets[exerciseLibraryId] ?? null : null,
    );
    const sets = useMemo<SetSummary[]>(() => {
      if (!loggedMap) return [];
      return Object.entries(loggedMap)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([key, s]) => ({
          weight: s.weight != null ? formatWeight(s.weight) : "—",
          reps: s.reps ?? 0,
          setNumber: Number(key) + 1,
          duration: s.duration,
        }));
    }, [loggedMap, formatWeight]);

    // Keep the textarea in sync with the latest prefill when the user navigates
    // between exercises (this component is mounted continuously on the parent).
    useEffect(() => {
      setComment(initialComment);
    }, [initialComment]);

    // Read the live comment + callback from a ref so handleContinue keeps a
    // stable identity across keystrokes. Otherwise it changed on every keystroke
    // → renderFooter changed → gorhom saw a new footer component type and
    // remounted the footer (Continue button's LinearGradient) each keystroke,
    // which read as a color flicker while typing.
    const latest = useRef({ comment, onContinue });
    latest.current = { comment, onContinue };
    const handleContinue = useCallback(() => {
      latest.current.onContinue(latest.current.comment);
    }, []);

    const revealComment = useCallback(
      (keyboardHeight: number) => {
        if (keyboardHeight <= 0) return;
        const node = commentFieldRef.current;
        if (!node) return;
        node.measureInWindow((_x, y, _w, height) => {
          if (!height) return;
          const fallbackFooterHeight =
            CONTINUE_BUTTON_HEIGHT + FOOTER_TOP_PADDING + (insets.bottom || 20);
          const footerHeightForReveal = footerHeightRef.current || fallbackFooterHeight;
          const visibleBottom =
            windowHeight - keyboardHeight - footerHeightForReveal - REVEAL_MARGIN;
          const overlap = y + height - visibleBottom;
          if (overlap > 0) {
            scrollRef.current?.scrollTo({ y: scrollY.current + overlap, animated: true });
          }
        });
      },
      [insets.bottom, windowHeight],
    );

    const handleFooterLayout = useCallback((e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      footerHeightRef.current = h;
      setFooterHeight(h);
      if (commentFocused.current && kbHeight.current > 0) {
        requestAnimationFrame(() => revealComment(kbHeight.current));
      }
    }, [revealComment]);

    const handleCommentFocus = useCallback(() => {
      commentFocused.current = true;
      if (kbHeight.current > 0) {
        revealComment(kbHeight.current);
      }
    }, [revealComment]);

    const handleCommentBlur = useCallback(() => {
      commentFocused.current = false;
    }, []);

    const handleContentSizeChange = useCallback((_w: number, height: number) => {
      const grew = height > lastContentHeight.current;
      lastContentHeight.current = height;
      if (grew && commentFocused.current && kbHeight.current > 0) {
        requestAnimationFrame(() => revealComment(kbHeight.current));
      }
    }, [revealComment]);

    const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollY.current = e.nativeEvent.contentOffset.y;
    }, []);

    useEffect(() => {
      const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
      const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
      const showSub = Keyboard.addListener(showEvent, (e) => {
        const height = e.endCoordinates?.height ?? 0;
        const duration = e.duration && e.duration > 0 ? e.duration : 250;
        setKeyboardVisible(true);
        kbHeight.current = height;
        kbSpacer.value = height;
        kbTranslate.value = withTiming(height, { duration });
        // Fill the space above the keyboard so Continue pins just on top of it
        // (auto-extend is off for plain TextInputs, so we do it manually).
        sheetRef.current?.expand();
        if (commentFocused.current) {
          requestAnimationFrame(() => revealComment(height));
        }
      });
      const hideSub = Keyboard.addListener(hideEvent, (e) => {
        const duration = e?.duration && e.duration > 0 ? e.duration : 250;
        setKeyboardVisible(false);
        kbHeight.current = 0;
        kbSpacer.value = withTiming(0, { duration });
        kbTranslate.value = withTiming(0, { duration });
        // Shrink back to the content-fit height (index 0) so there's no dead
        // space below Continue at rest.
        sheetRef.current?.snapToIndex(0);
      });
      return () => {
        showSub.remove();
        hideSub.remove();
      };
    }, [kbSpacer, kbTranslate, revealComment]);

    // The sheet stays mounted across dismissals, so AddComment's unmount
    // cleanup can't cover a swipe-down / continue press. Stop the mic
    // explicitly when the sheet dismisses.
    const handleDismiss = useCallback(() => {
      ExpoSpeechRecognitionModule.stop();
      setKeyboardVisible(false);
      kbHeight.current = 0;
      kbSpacer.value = 0;
      kbTranslate.value = 0;
    }, [kbSpacer, kbTranslate]);

    const renderFooter = useCallback(
      (props: BottomSheetFooterProps) => {
        if (!keyboardVisible) return null;
        return (
          <BottomSheetFooter {...props}>
            <Animated.View
              style={[styles.footer, footerStyle, { paddingBottom: insets.bottom || 20 }]}
              onLayout={handleFooterLayout}
            >
              <PressableScale style={styles.continueBtn} onPress={handleContinue}>
                <LinearGradient
                  colors={[
                    "rgba(201,168,76,0.6)",
                    "rgba(247,224,111,0.6)",
                    "rgba(252,243,192,0.6)",
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
                <GlassFill />
                <Text style={styles.continueBtnText}>{t("common.continue")}</Text>
              </PressableScale>
            </Animated.View>
          </BottomSheetFooter>
        );
      },
      [footerStyle, handleContinue, handleFooterLayout, insets.bottom, keyboardVisible, t],
    );

    // Rest snap point derived synchronously from set count so the sheet opens at the correct
    // height on its FIRST present() — no waiting for onContentSizeChange (which arrives AFTER
    // the initial snap). Heights below match the styles below; keep them in sync.
    const restSnap = useMemo(() => {
      const rows = Math.max(1, Math.ceil(sets.length / 3));
      const setsRowHeight = rows * 65 + (rows - 1) * 8; // setCard ~65 tall, gap 8
      const contentHeight =
        24 + // handle
        70 + // title container (title 26 + paddingBottom 20 + border 1 + spacing)
        20 + // gap
        setsRowHeight +
        20 + // gap
        180 + // AddComment (label 19 + gap 8 + inputCard 144 + spacing)
        20 + // gap
        53 + // Continue button
        20 + // content paddingBottom
        (insets.bottom || 20); // safe-area bottom
      return Math.round(
        Math.min(Math.max(contentHeight, 400), windowHeight * 0.85),
      );
    }, [sets.length, insets.bottom, windowHeight]);

    const snapPoints = useMemo<(string | number)[]>(() => [restSnap, "90%"], [restSnap]);

    return (
      <BottomSheetModal
        ref={sheetRef}
        enablePanDownToClose
        // Fixed detents (no dynamic sizing) driven by measured content height so 3 / 5 / 10-set
        // variants each open exactly at their needed size. 90% is the keyboard-open detent.
        // Dynamic sizing was fighting the animated keyboard spacer: spacer growth changed content
        // height, gorhom recomputed target, that race squished AddComment when content was tall.
        // snapToIndex(0) on keyboard-hide returns to the measured rest snap.
        snapPoints={snapPoints}
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        footerComponent={renderFooter}
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.handle}
        onDismiss={handleDismiss}
      >
        <BottomSheetScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScroll={handleScroll}
          onContentSizeChange={handleContentSizeChange}
          stickyHeaderIndices={[0]}
        >
          <View style={styles.titleWrap}>
            <Text style={styles.title}>{t("workout.ui.exerciseCompleted")}</Text>
          </View>

          <View style={styles.setsRow}>
            {sets.map((set) => (
              <SetCard key={set.setNumber} set={set} />
            ))}
          </View>

          <View ref={commentFieldRef}>
            <AddComment
              key={exerciseLibraryId ?? "empty"}
              value={comment}
              onChangeText={setComment}
              onFocus={handleCommentFocus}
              onBlur={handleCommentBlur}
            />
          </View>

          {!keyboardVisible ? (
            <PressableScale style={styles.continueBtn} onPress={handleContinue}>
              <LinearGradient
                colors={[
                  "rgba(201,168,76,0.6)",
                  "rgba(247,224,111,0.6)",
                  "rgba(252,243,192,0.6)",
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <GlassFill />
              <Text style={styles.continueBtnText}>{t("common.continue")}</Text>
            </PressableScale>
          ) : null}

          <Animated.View style={keyboardSpacerStyle} />
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);

ExerciseCompletedBottomSheet.displayName = "ExerciseCompletedBottomSheet";

export default ExerciseCompletedBottomSheet;

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: COLORS.neutral.black3,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handle: {
    backgroundColor: "rgba(255,255,255,0.2)",
    width: 54,
    height: 4,
    borderRadius: 12345,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 20,
  },
  titleWrap: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.charcoal,
    backgroundColor: COLORS.neutral.black3,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 22,
    fontWeight: "500",
    lineHeight: 26.4,
    color: COLORS.neutral.white,
  },
  setsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  setCard: {
    width: "31%",
    backgroundColor: COLORS.neutral.black2,
    borderWidth: 1,
    borderColor: COLORS.neutral.charcoal,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 12,
    alignItems: "center",
    gap: 8,
  },
  setCardValue: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 19.2,
    color: COLORS.neutral.white,
    textAlign: "center",
  },
  setCardLabel: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 14.4,
    color: COLORS.primary.dark,
    textAlign: "center",
    letterSpacing: 0.48,
  },
  continueBtn: {
    height: 53,
    borderRadius: 138,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  continueBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.neutral.white,
    textAlign: "center",
    letterSpacing: 0.36,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    backgroundColor: COLORS.neutral.black3,
  },
});
