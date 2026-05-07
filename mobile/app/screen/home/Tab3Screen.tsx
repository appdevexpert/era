import BottomWorkoutTabBar from "@/app/components/navigation/BottomWorkoutTabBar";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

const Tab3Screen = () => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{t("tabs.meals")}</Text>
      <BottomWorkoutTabBar activeTab="Tab3" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  text: { color: "#fff", fontSize: 18 },
});

export default Tab3Screen;
