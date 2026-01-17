import React from "react";
import PeopleIcon from "@mui/icons-material/People";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import HistoryIcon from "@mui/icons-material/History";
import SecurityIcon from "@mui/icons-material/Security";
import { BaseLayout } from "./BaseLayout";
import { useTranslation } from "react-i18next";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const items = [
    { label: t("users"), path: "/admin/users", icon: <PeopleIcon /> },
    { label: t("departments"), path: "/admin/departments", icon: <AccountTreeIcon /> },
    { label: t("sessions"), path: "/admin/sessions", icon: <HistoryIcon /> },
    { label: t("audit"), path: "/admin/audit", icon: <SecurityIcon /> }
  ];
  return (
    <BaseLayout title={t("admin")} items={items}>
      {children}
    </BaseLayout>
  );
}
