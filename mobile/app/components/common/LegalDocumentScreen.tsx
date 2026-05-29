import ScreenFades from "@/app/components/common/ScreenFades";
import { COLORS } from "@/app/constants/colors";
import { FONTS } from "@/app/constants/fonts";
import { verticalScale } from "@/app/utils/responsive";
import { ProfileBackChevron } from "@/assets/icons";
import { useNavigation } from "@react-navigation/native";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import PressableScale from "@/app/components/common/PressableScale";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type LegalSection = {
  heading: string;
  body: string;
};

interface LegalDocumentScreenProps {
  eyebrow: string;
  title: string;
  lastUpdatedLabel: string;
  lastUpdated: string;
  intro: string;
  sections: LegalSection[];
  contactLabel: string;
  contactValue: string;
}

const LegalDocumentScreen = ({
  eyebrow,
  title,
  lastUpdatedLabel,
  lastUpdated,
  intro,
  sections,
  contactLabel,
  contactValue,
}: LegalDocumentScreenProps) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 64,
            paddingBottom: insets.bottom + 60,
          },
        ]}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.lastUpdated}>
            {lastUpdatedLabel} {lastUpdated}
          </Text>
        </View>

        <View style={styles.introCard}>
          <Text style={styles.introText}>{intro}</Text>
        </View>

        <View style={styles.sectionsBlock}>
          {sections.map((section, index) => (
            <View key={section.heading} style={styles.section}>
              <Text style={styles.sectionIndex}>
                {String(index + 1).padStart(2, "0")}
              </Text>
              <Text style={styles.sectionHeading}>{section.heading}</Text>
              <Text style={styles.sectionBody}>{section.body}</Text>
            </View>
          ))}
        </View>

        <View style={styles.contactCard}>
          <Text style={styles.contactLabel}>{contactLabel.toUpperCase()}</Text>
          <Text style={styles.contactValue}>{contactValue}</Text>
        </View>
      </ScrollView>

      <ScreenFades topExtra={80} bottomExtra={60} />

      <PressableScale
        onPress={() => navigation.goBack()}
        hitSlop={12}
        style={[styles.backButton, { top: insets.top + 8 }]}
      >
        <ProfileBackChevron width={24} height={24} />
      </PressableScale>
    </View>
  );
};

export default LegalDocumentScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.neutral.black2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 24,
  },
  backButton: {
    position: "absolute",
    left: 20,
    width: 32,
    height: 32,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  headerBlock: {
    gap: 10,
  },
  eyebrow: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    letterSpacing: 0.96,
    color: COLORS.primary.dark,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 32,
    fontWeight: "500",
    color: COLORS.neutral.white,
    lineHeight: 38,
  },
  lastUpdated: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.alpha.white50,
    letterSpacing: 0.3,
  },
  introCard: {
    backgroundColor: COLORS.neutral.black3,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.alpha.white08,
    padding: 18,
  },
  introText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.alpha.white78,
  },
  sectionsBlock: {
    gap: 22,
    marginTop: verticalScale(4),
  },
  section: {
    gap: 8,
    paddingBottom: 22,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.alpha.white08,
  },
  sectionIndex: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    letterSpacing: 0.72,
    color: COLORS.primary.dark,
  },
  sectionHeading: {
    fontFamily: FONTS.display,
    fontSize: 20,
    fontWeight: "500",
    color: COLORS.neutral.white,
    lineHeight: 26,
  },
  sectionBody: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.alpha.white72,
    marginTop: 2,
  },
  contactCard: {
    backgroundColor: COLORS.neutral.black3,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.alpha.primary20,
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 6,
    alignItems: "center",
  },
  contactLabel: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    letterSpacing: 0.96,
    color: COLORS.primary.dark,
  },
  contactValue: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.neutral.white,
    letterSpacing: 0.2,
  },
});
