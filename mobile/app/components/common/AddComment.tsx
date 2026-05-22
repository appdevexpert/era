import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { MicLargeIcon } from "@/assets/icons";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";

type AddCommentProps = {
  value: string;
  onChangeText: (text: string) => void;
  onMicPress?: () => void;
};

const AddComment = ({ value, onChangeText, onMicPress }: AddCommentProps) => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("workout.ui.addComments")}</Text>

      <View style={styles.inputCard}>
        <TextInput
          style={styles.input}
          placeholder={t("workout.ui.commentPlaceholder")}
          placeholderTextColor={COLORS.alpha.white50}
          value={value}
          onChangeText={onChangeText}
          multiline
          textAlignVertical="top"
        />
        <Pressable style={styles.micButton} onPress={onMicPress} hitSlop={8}>
          <MicLargeIcon width={24} height={24} />
        </Pressable>
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
    minHeight: 100,
    backgroundColor: COLORS.neutral.black3,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.neutral.charcoal,
    padding: 16,
    gap: 12,
  },
  input: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 14,
    fontWeight: "400",
    color: COLORS.neutral.white,
    padding: 0,
    minHeight: 40,
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
});
