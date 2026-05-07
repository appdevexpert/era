import BottomWorkoutTabBar from "@/app/components/navigation/BottomWorkoutTabBar";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

const Tab4Screen = () => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{t("tabs.stats")}</Text>
      <BottomWorkoutTabBar activeTab="Tab4" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  text: { color: "#fff", fontSize: 18 },
});

export default Tab4Screen;
