import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

const StatsScreen = () => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{t("tabs.stats")}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  text: { color: "#fff", fontSize: 18 },
});

export default StatsScreen;
