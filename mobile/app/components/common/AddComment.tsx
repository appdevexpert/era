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
};

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
 * `keyboardBehavior="extend"` on the parent sheet is triggered by OS keyboard
 * notifications, not by input focus events — so it still works with plain
 * TextInput. No behavior loss, entire crash class gone.
 */
const AddComment = ({ value, onChangeText }: AddCommentProps) => {
  const { t, i18n } = useTranslation();
  const [recognizing, setRecognizing] = useState(false);
  const baseTextRef = useRef("");

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

    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      Toast.show({
        type: "error",
        text1: t("workout.ui.micPermissionDenied"),
      });
      return;
    }

    baseTextRef.current = value;
    ExpoSpeechRecognitionModule.start({
      lang: localeFor(i18n.language),
      interimResults: true,
      continuous: true,
      addsPunctuation: true,
    });
  }, [recognizing, value, i18n.language, t]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("workout.ui.addComments")}</Text>

      <View style={styles.inputCard}>
        {recognizing ? (
          <View style={styles.recordingArea}>
            <WaveAudio isRecording={recognizing} />
            <Text style={styles.transcript} numberOfLines={3}>
              {value || t("workout.ui.listening")}
            </Text>
          </View>
        ) : (
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder={t("workout.ui.commentPlaceholder")}
              placeholderTextColor={COLORS.alpha.white50}
              value={value}
              onChangeText={onChangeText}
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
    gap: 12,
  },
  inputWrapper: {
    height: 60,
    overflow: "hidden",
  },
  input: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20,
    color: COLORS.neutral.white,
    padding: 0,
  },
  recordingArea: {
    height: 60,
    gap: 8,
    justifyContent: "center",
  },
  transcript: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    fontWeight: "400",
    color: COLORS.neutral.white,
  },
  micButton: {
    alignSelf: "flex-end",
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: COLORS.alpha.surface08,
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
