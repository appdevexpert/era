import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { FeedbackLight, FeedbackCorrect, FeedbackHeavy } from "@/assets/icons";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import PressableScale from "@/app/components/common/PressableScale";
import { useTranslation } from "react-i18next";
import type { SvgProps } from "react-native-svg";

type FeedbackOption = "light" | "correct" | "heavy";

type SetFeedbackProps = {
  onSelect?: (option: FeedbackOption) => void;
  /** Initial selected chip — used when revisiting a logged set to prefill the UI. */
  initialValue?: FeedbackOption | null;
};

const OPTIONS: { key: FeedbackOption; labelKey: string; Icon: React.FC<SvgProps> }[] = [
  { key: "light", labelKey: "workout.ui.feedbackLight", Icon: FeedbackLight },
  { key: "correct", labelKey: "workout.ui.feedbackCorrect", Icon: FeedbackCorrect },
  { key: "heavy", labelKey: "workout.ui.feedbackHeavy", Icon: FeedbackHeavy },
];

const SetFeedback = ({ onSelect, initialValue = null }: SetFeedbackProps) => {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<FeedbackOption | null>(initialValue);

  const handlePress = (option: FeedbackOption) => {
    setSelected(option);
    onSelect?.(option);
  };

  return (
    <View style={styles.container}>
      <View style={styles.textBlock}>
        <Text style={styles.title}>{t("workout.ui.feedbackTitle")}</Text>
        <Text style={styles.subtitle}>{t("workout.ui.feedbackSubtitle")}</Text>
      </View>

      <View style={styles.row}>
        {OPTIONS.map(({ key, labelKey, Icon }) => {
          const isSelected = selected === key;
          return (
            <PressableScale
              key={key}
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => handlePress(key)}
            >
              <Text style={styles.cardLabel}>{t(labelKey)}</Text>
              <Icon width={39} height={39} />
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
};

export default SetFeedback;

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  textBlock: {
    gap: 6,
  },
  title: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 19.2,
    color: "#FFFFFF",
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 16.8,
    color: "rgba(255,255,255,0.6)",
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  card: {
    flex: 1,
    height: 100,
    backgroundColor: COLORS.neutral.black3,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.neutral.charcoal,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 16,
    gap: 12,
    overflow: "hidden",
  },
  cardSelected: {
    borderColor: COLORS.primary.dark,
  },
  cardLabel: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 18.2,
    color: COLORS.alpha.white50,
    textAlign: "center",
  },
});
