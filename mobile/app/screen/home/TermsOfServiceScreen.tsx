import LegalDocumentScreen, {
  type LegalSection,
} from "@/app/components/common/LegalDocumentScreen";
import { useTranslation } from "react-i18next";

const TermsOfServiceScreen = () => {
  const { t } = useTranslation();

  const sections = t("profile.legal.terms.sections", {
    returnObjects: true,
  }) as unknown as LegalSection[];

  return (
    <LegalDocumentScreen
      eyebrow={t("profile.legal.eyebrow")}
      title={t("profile.legal.terms.title")}
      lastUpdatedLabel={t("profile.legal.lastUpdatedLabel")}
      lastUpdated={t("profile.legal.terms.lastUpdated")}
      intro={t("profile.legal.terms.intro")}
      sections={sections}
      contactLabel={t("profile.legal.contactLabel")}
      contactValue={t("profile.legal.contactValue")}
    />
  );
};

export default TermsOfServiceScreen;
