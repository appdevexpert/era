import { COLORS } from "@/app/constants/colors";
import { Fragment, isValidElement, ReactNode, Children } from "react";
import { StyleSheet, View } from "react-native";

interface SettingsCardProps {
  children: ReactNode;
}

const SettingsCard = ({ children }: SettingsCardProps) => {
  const items = Children.toArray(children).filter(isValidElement);
  return (
    <View style={styles.card}>
      {items.map((child, i) => (
        <Fragment key={i}>
          {child}
          {i < items.length - 1 ? <View style={styles.divider} /> : null}
        </Fragment>
      ))}
    </View>
  );
};

export default SettingsCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.neutral.black3,
    borderWidth: 1,
    borderColor: COLORS.neutral.charcoal,
    borderRadius: 20,
    padding: 16,
    gap: 16,
    overflow: "hidden",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.neutral.charcoal,
  },
});
