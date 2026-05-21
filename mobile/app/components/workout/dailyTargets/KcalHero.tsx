import { FONTS } from "@/app/constants/fonts";
import { FireGold } from "@/assets/icons";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { GOLD } from "./tokens";

interface KcalHeroProps {
  eaten: number;
  total: number;
}

/** Centered text + flame icon shown inside the semicircle gauge. */
const KcalHero = ({ eaten, total }: KcalHeroProps) => {
  const { t } = useTranslation();
  return (
    <View style={styles.wrap}>
      <FireGold width={36} height={36} />
      <Text style={styles.value}>{eaten}</Text>
      <Text style={styles.total}>{`${total} ${t("nutrition.caloriesUnit")}`}</Text>
    </View>
  );
};

export default KcalHero;

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: 4,
  },
  value: {
    fontFamily: FONTS.semiBold,
    fontSize: 24,
    fontWeight: "700",
    color: GOLD,
    lineHeight: 28,
  },
  total: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(240, 240, 240, 0.75)",
  },
});
