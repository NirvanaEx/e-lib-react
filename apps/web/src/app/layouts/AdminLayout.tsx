import React from "react";
import PeopleIcon from "@mui/icons-material/People";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import HistoryIcon from "@mui/icons-material/History";
import SecurityIcon from "@mui/icons-material/Security";
import { BaseLayout } from "./BaseLayout";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const items = [
    { label: "Users", path: "/admin/users", icon: <PeopleIcon /> },
    { label: "Departments", path: "/admin/departments", icon: <AccountTreeIcon /> },
    { label: "Sessions", path: "/admin/sessions", icon: <HistoryIcon /> },
    { label: "Audit", path: "/admin/audit", icon: <SecurityIcon /> }
  ];
  return (
    <BaseLayout title="Admin" items={items}>
      {children}
    </BaseLayout>
  );
}
