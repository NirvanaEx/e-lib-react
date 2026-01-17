import React from "react";
import PeopleIcon from "@mui/icons-material/People";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import SecurityIcon from "@mui/icons-material/Security";
import FolderIcon from "@mui/icons-material/Folder";
import CategoryIcon from "@mui/icons-material/Category";
import DescriptionIcon from "@mui/icons-material/Description";
import InsightsIcon from "@mui/icons-material/Insights";
import ShieldIcon from "@mui/icons-material/Shield";
import HistoryIcon from "@mui/icons-material/History";
import { BaseLayout, NavItem } from "./BaseLayout";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../shared/hooks/useAuth";
import { hasAccess } from "../../shared/utils/access";

type DashboardItem = {
  label: string;
  path: string;
  icon: React.ReactNode;
  access: string;
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { user } = useAuth();

  const adminItems: DashboardItem[] = [
    { label: t("users"), path: "/dashboard/users", icon: <PeopleIcon />, access: "user.read" },
    { label: t("departments"), path: "/dashboard/departments", icon: <AccountTreeIcon />, access: "department.read" },
    { label: t("roles"), path: "/dashboard/roles", icon: <ShieldIcon />, access: "role.read" },
    { label: t("sessions"), path: "/dashboard/sessions", icon: <HistoryIcon />, access: "session.read" },
    { label: t("audit"), path: "/dashboard/audit", icon: <SecurityIcon />, access: "audit.read" }
  ];

  const manageItems: DashboardItem[] = [
    { label: t("sections"), path: "/dashboard/sections", icon: <FolderIcon />, access: "section.read" },
    { label: t("categories"), path: "/dashboard/categories", icon: <CategoryIcon />, access: "category.read" },
    { label: t("files"), path: "/dashboard/files", icon: <DescriptionIcon />, access: "file.read" },
    { label: t("stats"), path: "/dashboard/stats", icon: <InsightsIcon />, access: "stats.read" }
  ];

  const toNavItems = (items: DashboardItem[]): NavItem[] =>
    items
      .filter((item) => hasAccess(user, ["dashboard.access", item.access]))
      .map(({ access, ...rest }) => rest);

  const sections = [
    { label: t("admin"), items: toNavItems(adminItems) },
    { label: t("manage"), items: toNavItems(manageItems) }
  ].filter((section) => section.items.length > 0);

  return (
    <BaseLayout title={t("dashboard")} items={[]} sections={sections}>
      {children}
    </BaseLayout>
  );
}
