import BackButton from "@/app/components/common/BackButton";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { selectUser } from "@/app/stores/selectors/authSelectors";
import { signOutThunk } from "@/app/stores/slice/authSlice";
import { RootState, useAppDispatch } from "@/app/stores/store";
import { horizontalScale, verticalScale } from "@/app/utils/responsive";
import { LinearGradient } from "expo-linear-gradient";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ProfileScreen = () => {
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const user = useSelector(selectUser);
  const authStatus = useSelector((state: RootState) => state.auth.loadingStatus);
  const authError = useSelector((state: RootState) => state.auth.error);
  const isNorwegian = i18n.language === "nb";
  const isLoggingOut = authStatus === "loading";
  const displayName = user?.name || user?.email?.split("@")[0] || t("profile.fallbackName");
  const avatarInitial = displayName.charAt(0).toUpperCase();

  const toggleLanguage = () => {
    i18n.changeLanguage(isNorwegian ? "en" : "nb");
  };

  const handleLogout = () => {
    dispatch(signOutThunk());
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + verticalScale(16) }]}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.heading}>{t("screens.profile")}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.profileBlock}>
        <View style={styles.avatar}>
          <LinearGradient
            colors={[COLORS.primary.dark, COLORS.primary.base]}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.avatarText}>{avatarInitial}</Text>
        </View>
        <Text numberOfLines={1} style={styles.name}>{displayName}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>{t("language.title")}</Text>
        <Pressable onPress={toggleLanguage} style={styles.languageToggle}>
          <View style={[styles.languageOption, !isNorwegian && styles.languageOptionActive]}>
            <Text style={[styles.languageText, !isNorwegian && styles.languageTextActive]}>
              {t("language.english")}
            </Text>
          </View>
          <View style={[styles.languageOption, isNorwegian && styles.languageOptionActive]}>
            <Text style={[styles.languageText, isNorwegian && styles.languageTextActive]}>
              {t("language.norwegian")}
            </Text>
          </View>
        </Pressable>
      </View>

      <Pressable
        onPress={handleLogout}
        disabled={isLoggingOut}
        style={[styles.logoutButton, isLoggingOut && styles.logoutButtonDisabled]}
      >
        {isLoggingOut ? (
          <ActivityIndicator size="small" color={COLORS.semantic.danger} />
        ) : (
          <Text style={styles.logoutText}>{t("auth.logout")}</Text>
        )}
      </Pressable>
      {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
    </View>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.neutral.black2,
    paddingHorizontal: horizontalScale(20),
  },
  header: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heading: {
    fontFamily: FONTS.semiBold,
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.neutral.white,
  },
  headerSpacer: {
    width: 32,
  },
  profileBlock: {
    alignItems: "center",
    marginTop: verticalScale(42),
    marginBottom: verticalScale(32),
    gap: 14,
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarText: {
    fontSize: 34,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  name: {
    maxWidth: "100%",
    fontFamily: FONTS.display,
    fontSize: 30,
    fontWeight: "500",
    color: COLORS.neutral.white,
    textAlign: "center",
  },
  card: {
    backgroundColor: COLORS.neutral.black3,
    borderWidth: 1,
    borderColor: COLORS.neutral.charcoal,
    borderRadius: 14,
    padding: 16,
    gap: 14,
  },
  label: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.neutral.white,
  },
  languageToggle: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 4,
    backgroundColor: COLORS.alpha.white08,
  },
  languageOption: {
    flex: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  languageOptionActive: {
    backgroundColor: COLORS.alpha.primary20,
  },
  languageText: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.alpha.white50,
  },
  languageTextActive: {
    color: COLORS.primary.base,
  },
  logoutButton: {
    minHeight: 52,
    marginTop: verticalScale(18),
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(230, 119, 119, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(230, 119, 119, 0.08)",
  },
  logoutButtonDisabled: {
    opacity: 0.6,
  },
  logoutText: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.semantic.danger,
  },
  errorText: {
    marginTop: verticalScale(10),
    fontFamily: FONTS.regular,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.semantic.danger,
    textAlign: "center",
  },
});
