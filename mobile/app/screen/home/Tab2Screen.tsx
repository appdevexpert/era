import BottomWorkoutTabBar from "@/app/components/navigation/BottomWorkoutTabBar";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

const Tab2Screen = () => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{t("tabs.training")}</Text>
      <BottomWorkoutTabBar activeTab="Tab2" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  text: { color: "#fff", fontSize: 18 },
});

export default Tab2Screen;
