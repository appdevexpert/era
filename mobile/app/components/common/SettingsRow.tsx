import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface SettingsRowProps {
  icon: ReactNode;
  label: string;
  right: ReactNode;
  onPress?: () => void;
  labelColor?: string;
  disabled?: boolean;
}

const SettingsRow = ({
  icon,
  label,
  right,
  onPress,
  labelColor,
  disabled,
}: SettingsRowProps) => {
  const content = (
    <>
      <View style={styles.left}>
        {icon}
        <Text style={[styles.label, labelColor ? { color: labelColor } : null]}>
          {label}
        </Text>
      </View>
      <View style={styles.right}>{right}</View>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={[styles.row, disabled && styles.disabled]}
      >
        {content}
      </Pressable>
    );
  }
  return <View style={styles.row}>{content}</View>;
};

export default SettingsRow;

const styles = StyleSheet.create({
  row: {
    height: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
  },
  label: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.neutral.white,
  },
  disabled: {
    opacity: 0.6,
  },
});
