import React from "react";
import FolderIcon from "@mui/icons-material/Folder";
import CategoryIcon from "@mui/icons-material/Category";
import DescriptionIcon from "@mui/icons-material/Description";
import DeleteIcon from "@mui/icons-material/Delete";
import InsightsIcon from "@mui/icons-material/Insights";
import SecurityIcon from "@mui/icons-material/Security";
import { BaseLayout } from "./BaseLayout";

export default function ManageLayout({ children }: { children: React.ReactNode }) {
  const items = [
    { label: "Sections", path: "/manage/sections", icon: <FolderIcon /> },
    { label: "Categories", path: "/manage/categories", icon: <CategoryIcon /> },
    { label: "Files", path: "/manage/files", icon: <DescriptionIcon /> },
    { label: "Trash", path: "/manage/trash", icon: <DeleteIcon /> },
    { label: "Stats", path: "/manage/stats", icon: <InsightsIcon /> },
    { label: "Audit", path: "/manage/audit", icon: <SecurityIcon /> }
  ];
  return (
    <BaseLayout title="Manage" items={items}>
      {children}
    </BaseLayout>
  );
}
