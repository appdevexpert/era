import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

const Tab1Screen = () => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{t("tabs.workout")}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  text: { color: "#fff", fontSize: 18 },
});

export default Tab1Screen;
