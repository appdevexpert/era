import { FONTS } from "@/app/constants/fonts";
import { ComponentType } from "react";
import { StyleSheet, Text, View } from "react-native";
import { type SvgProps } from "react-native-svg";

const ICON_COLOR = "#868592";

interface MealMetaChipProps {
  Icon: ComponentType<SvgProps>;
  value: number | string;
  suffix?: string;
}

const MealMetaChip = ({ Icon, value, suffix = "g" }: MealMetaChipProps) => (
  <View style={styles.chip}>
    <Icon width={16} height={16} color={ICON_COLOR} />
    <Text style={styles.text}>
      {typeof value === "number" ? `${value}${suffix}` : value}
    </Text>
  </View>
);

export default MealMetaChip;

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  text: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    fontWeight: "500",
    color: "#F0F0F0",
  },
});
