import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

const SettingScreen = () => {
  const { t, i18n } = useTranslation();
  const isNorwegian = i18n.language === "nb";

  const toggleLanguage = () => {
    i18n.changeLanguage(isNorwegian ? "en" : "nb");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{t("screens.settings")}</Text>

      <View style={styles.row}>
        <Text style={styles.label}>{t("language.title")}</Text>
        <Pressable onPress={toggleLanguage} style={styles.langButton}>
          <Text style={[styles.langOption, !isNorwegian && styles.langActive]}>
            {t("language.english")}
          </Text>
          <Text style={styles.langDivider}>|</Text>
          <Text style={[styles.langOption, isNorwegian && styles.langActive]}>
            {t("language.norwegian")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  heading: { color: "#fff", fontSize: 22, fontWeight: "600", marginBottom: 40 },
  row: { flexDirection: "row", alignItems: "center", gap: 16 },
  label: { color: "#fff", fontSize: 16 },
  langButton: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, gap: 10 },
  langOption: { color: "rgba(255,255,255,0.4)", fontSize: 15, fontWeight: "500" },
  langActive: { color: "#C9A84C", fontWeight: "600" },
  langDivider: { color: "rgba(255,255,255,0.2)", fontSize: 15 },
});

export default SettingScreen;
