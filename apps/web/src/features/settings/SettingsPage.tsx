import React from "react";
import { Page } from "../../shared/ui/Page";
import { SettingsPanel } from "./SettingsPanel";
import { useTranslation } from "react-i18next";

export default function SettingsPage() {
  const { t } = useTranslation();

  return (
    <Page title={t("settings")} subtitle={t("settingsSubtitle")}>
      <SettingsPanel />
    </Page>
  );
}
