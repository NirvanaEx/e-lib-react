import React from "react";
import FolderIcon from "@mui/icons-material/Folder";
import CategoryIcon from "@mui/icons-material/Category";
import DescriptionIcon from "@mui/icons-material/Description";
import DeleteIcon from "@mui/icons-material/Delete";
import InsightsIcon from "@mui/icons-material/Insights";
import SecurityIcon from "@mui/icons-material/Security";
import { BaseLayout } from "./BaseLayout";
import { useTranslation } from "react-i18next";

export default function ManageLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const items = [
    { label: t("sections"), path: "/dashboard/sections", icon: <FolderIcon /> },
    { label: t("categories"), path: "/dashboard/categories", icon: <CategoryIcon /> },
    { label: t("files"), path: "/dashboard/files", icon: <DescriptionIcon /> },
    { label: t("trash"), path: "/dashboard/trash", icon: <DeleteIcon /> },
    { label: t("stats"), path: "/dashboard/stats", icon: <InsightsIcon /> },
    { label: t("audit"), path: "/dashboard/audit", icon: <SecurityIcon /> }
  ];
  return (
    <BaseLayout title={t("dashboard")} items={items}>
      {children}
    </BaseLayout>
  );
}
