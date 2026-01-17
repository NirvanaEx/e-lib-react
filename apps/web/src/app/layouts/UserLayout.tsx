import React from "react";
import DescriptionIcon from "@mui/icons-material/Description";
import SettingsIcon from "@mui/icons-material/Settings";
import { BaseLayout } from "./BaseLayout";

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const items = [
    { label: "Files", path: "/user/files", icon: <DescriptionIcon /> },
    { label: "Settings", path: "/user/settings", icon: <SettingsIcon /> }
  ];
  return (
    <BaseLayout title="User" items={items}>
      {children}
    </BaseLayout>
  );
}
