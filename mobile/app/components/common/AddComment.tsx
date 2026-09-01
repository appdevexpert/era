import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { MicLargeIcon } from "@/assets/icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import PressableScale from "@/app/components/common/PressableScale";
import WaveAudio from "@/app/components/common/WaveAudio";
import Toast from "react-native-toast-message";
import { useTranslation } from "react-i18next";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";

type AddCommentProps = {
  value: string;
  onChangeText: (text: string) => void;
  /** Fired when the text field gains focus. Parents inside scrollable bottom
   *  sheets use this to scroll the field above the keyboard (gorhom's auto
   *  scroll only fires for BottomSheetTextInput, which we intentionally avoid). */
  onFocus?: () => void;
  /** Fired when the text field loses focus. */
  onBlur?: () => void;
};

const INPUT_LINE_HEIGHT = 20;
const MIC_SIZE = 40;
/** Fixed — the field scrolls rather than growing, so the card never resizes
 *  under the sheet's snap points. It reclaims the row the mic used to occupy
 *  (old text 60 + gap 12 + mic 40), so the card footprint is unchanged. */
const INPUT_MAX_LINES = 5;
const INPUT_HEIGHT = INPUT_LINE_HEIGHT * INPUT_MAX_LINES + 12;

const localeFor = (lang: string) => (lang?.toLowerCase().startsWith("nb") ? "nb-NO" : "en-US");

/**
 * Comment field with mic-driven speech-to-text.
 *
 * Uses plain RN `TextInput` — NOT gorhom's `BottomSheetTextInput` — even when
 * mounted inside a `BottomSheetModal`. Reason: `BottomSheetTextInput` writes
 * to gorhom's internal `animatedKeyboardState` shared value on focus/blur,
 * and that write races the sheet's dismiss animation on iOS when the sheet
 * is closed while the input is focused → NaN in a worklet → native crash.
 *
 * Trade-off: gorhom's keyboard handling (`keyboardBehavior`, `keyboardBlurBehavior`)
 * only activates when it registers a focused input, which happens *only* via
 * `BottomSheetTextInput`. With a plain `TextInput` that machinery stays inert —
 * so the PARENT must provide its own keyboard avoidance (e.g. a `useAnimatedKeyboard`
 * spacer + `scrollToEnd`, or `automaticallyAdjustKeyboardInsets`). Don't assume the
 * sheet lifts this field on its own; if a parent relies on such a mechanism, keep it.
 */
const AddComment = ({ value, onChangeText, onFocus, onBlur }: AddCommentProps) => {
  const { t, i18n } = useTranslation();
  const [recognizing, setRecognizing] = useState(false);
  const baseTextRef = useRef("");

  // The field owns its own text rather than rendering the parent's `value`
  // directly.
  //
  // The parent re-renders on plenty of things that have nothing to do with
  // typing — keyboard show/hide, the sheet swapping its footer in, a
  // content-size reveal scroll. Each of those re-applied `value` to the native
  // input, and re-applying text resets the caret to the end. That is the
  // "cursor jumps back" when you tap into the middle of a line: the tap raises
  // the keyboard, the parent re-renders, the text is pushed down again and the
  // selection is gone.
  //
  // `text` is written by the user's own keystrokes, so the native input and
  // React agree and nothing is re-applied. The prop is only accepted when it
  // differs from what we last emitted — i.e. it changed from OUTSIDE (exercise
  // switch, mic transcript), never as an echo of the user's own typing.
  const [text, setText] = useState(value);
  const lastEmitted = useRef(value);

  useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      setText(value);
    }
  }, [value]);

  const handleChangeText = useCallback(
    (next: string) => {
      lastEmitted.current = next;
      setText(next);
      onChangeText(next);
    },
    [onChangeText],
  );

  useSpeechRecognitionEvent("start", () => setRecognizing(true));
  useSpeechRecognitionEvent("end", () => setRecognizing(false));

  // Auto-stop recognition when the field unmounts (screen navigation, sheet
  // teardown, exercise change with a remount key). Prevents the mic from
  // silently staying active after the user leaves the comment field.
  useEffect(() => {
    return () => {
      ExpoSpeechRecognitionModule.stop();
    };
  }, []);
  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results?.[0]?.transcript ?? "";
    if (!transcript) return;
    const prefix = baseTextRef.current ? `${baseTextRef.current.trimEnd()} ` : "";
    onChangeText(`${prefix}${transcript}`);
  });
  useSpeechRecognitionEvent("error", (event) => {
    setRecognizing(false);
    if (event.error === "no-speech" || event.error === "aborted") return;
    Toast.show({
      type: "error",
      text1: event.message || t("workout.ui.micPermissionDenied"),
    });
  });

  const handleMicPress = useCallback(async () => {
    if (recognizing) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }

    // Check first, then request. On the FIRST grant, iOS is still tearing
    // down the permission-dialog audio route when the promise resolves —
    // calling start() immediately races that teardown and throws
    // "Audio session was interrupted." Give iOS a moment to settle before
    // grabbing the mic. Already-granted repeat taps skip the wait.
    const existing = await ExpoSpeechRecognitionModule.getPermissionsAsync();
    if (!existing.granted) {
      const requested = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!requested.granted) {
        Toast.show({
          type: "error",
          text1: t("workout.ui.micPermissionDenied"),
        });
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 400));
    }

    baseTextRef.current = text;
    ExpoSpeechRecognitionModule.start({
      lang: localeFor(i18n.language),
      interimResults: true,
      continuous: true,
      addsPunctuation: true,
    });
  }, [recognizing, text, i18n.language, t]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("workout.ui.addComments")}</Text>

      <View style={styles.inputCard}>
        {recognizing ? (
          <View style={styles.recordingArea}>
            <WaveAudio isRecording={recognizing} />
            <Text style={styles.transcript} numberOfLines={INPUT_MAX_LINES}>
              {text || t("workout.ui.listening")}
            </Text>
          </View>
        ) : (
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder={t("workout.ui.commentPlaceholder")}
              placeholderTextColor={COLORS.alpha.white50}
              value={text}
              onChangeText={handleChangeText}
              onFocus={onFocus}
              onBlur={onBlur}
              multiline
              scrollEnabled
              textAlignVertical="top"
            />
          </View>
        )}
        <PressableScale
          style={[styles.micButton, recognizing && styles.micButtonActive]}
          onPress={handleMicPress}
          hitSlop={8}
        >
          {recognizing ? (
            <View style={styles.stopSquare} />
          ) : (
            <MicLargeIcon width={24} height={24} />
          )}
        </PressableScale>
      </View>
    </View>
  );
};

export default AddComment;

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  title: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 19.2,
    color: "#FFFFFF",
  },
  inputCard: {
    backgroundColor: COLORS.neutral.black3,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.neutral.charcoal,
    padding: 16,
  },
  inputWrapper: {
    overflow: "hidden",
  },
  input: {
    // Explicit height, not flex: a multiline TextInput needs a definite height
    // of its own to scroll its overflow instead of just clipping it.
    height: INPUT_HEIGHT,
    // No right inset — the mic reserved the whole right column, top to bottom,
    // for a button that only sits in the bottom corner. Text runs full width
    // and simply scrolls past the mic, which masks what is under it.
    fontFamily: FONTS.regular,
    fontSize: 14,
    fontWeight: "400",
    lineHeight: INPUT_LINE_HEIGHT,
    // Android adds font padding to the first and last line of a TextInput and
    // recomputes it as lines are added or removed, which shows up as the text
    // nudging up and down while you type in a multiline field with an explicit
    // lineHeight. Off = stable metrics.
    includeFontPadding: false,
    color: COLORS.neutral.white,
    padding: 0,
  },
  recordingArea: {
    height: INPUT_HEIGHT,
    gap: 8,
    justifyContent: "center",
  },
  transcript: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    fontWeight: "400",
    // Same metrics as the typed field, so the text does not reflow when the
    // mic is switched on or off.
    lineHeight: INPUT_LINE_HEIGHT,
    includeFontPadding: false,
    color: COLORS.neutral.white,
  },
  // Overlaid in the corner: it costs the text neither a row nor a column.
  // Opaque so text scrolling underneath is hidden rather than bleeding through.
  micButton: {
    position: "absolute",
    right: 16,
    bottom: 16,
    width: MIC_SIZE,
    height: MIC_SIZE,
    borderRadius: 999,
    backgroundColor: COLORS.neutral.charcoal,
    alignItems: "center",
    justifyContent: "center",
  },
  micButtonActive: {
    backgroundColor: COLORS.alpha.primary20,
  },
  stopSquare: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: COLORS.primary.dark,
  },
});
