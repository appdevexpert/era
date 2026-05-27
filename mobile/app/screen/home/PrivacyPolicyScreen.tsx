import LegalDocumentScreen, {
  type LegalSection,
} from "@/app/components/common/LegalDocumentScreen";
import { useTranslation } from "react-i18next";

const PrivacyPolicyScreen = () => {
  const { t } = useTranslation();

  const sections = t("profile.legal.privacy.sections", {
    returnObjects: true,
  }) as unknown as LegalSection[];

  return (
    <LegalDocumentScreen
      eyebrow={t("profile.legal.eyebrow")}
      title={t("profile.legal.privacy.title")}
      lastUpdatedLabel={t("profile.legal.lastUpdatedLabel")}
      lastUpdated={t("profile.legal.privacy.lastUpdated")}
      intro={t("profile.legal.privacy.intro")}
      sections={sections}
      contactLabel={t("profile.legal.contactLabel")}
      contactValue={t("profile.legal.contactValue")}
    />
  );
};

export default PrivacyPolicyScreen;
