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
    { label: t("sections"), path: "/manage/sections", icon: <FolderIcon /> },
    { label: t("categories"), path: "/manage/categories", icon: <CategoryIcon /> },
    { label: t("files"), path: "/manage/files", icon: <DescriptionIcon /> },
    { label: t("trash"), path: "/manage/trash", icon: <DeleteIcon /> },
    { label: t("stats"), path: "/manage/stats", icon: <InsightsIcon /> },
    { label: t("audit"), path: "/manage/audit", icon: <SecurityIcon /> }
  ];
  return (
    <BaseLayout title={t("manage")} items={items}>
      {children}
    </BaseLayout>
  );
}
