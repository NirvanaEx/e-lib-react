import React from "react";
import DescriptionIcon from "@mui/icons-material/Description";
import SettingsIcon from "@mui/icons-material/Settings";
import { BaseLayout } from "./BaseLayout";
import { useTranslation } from "react-i18next";

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const items = [
    { label: t("files"), path: "/user/files", icon: <DescriptionIcon /> },
    { label: t("settings"), path: "/user/settings", icon: <SettingsIcon /> }
  ];
  return (
    <BaseLayout title={t("user")} items={items}>
      {children}
    </BaseLayout>
  );
}
