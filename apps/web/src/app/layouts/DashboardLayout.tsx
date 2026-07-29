import React from "react";
import PeopleIcon from "@mui/icons-material/People";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import SecurityIcon from "@mui/icons-material/Security";
import FolderIcon from "@mui/icons-material/Folder";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import DescriptionIcon from "@mui/icons-material/Description";
import InsightsIcon from "@mui/icons-material/Insights";
import ShieldIcon from "@mui/icons-material/Shield";
import HistoryIcon from "@mui/icons-material/History";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";
import PolicyOutlinedIcon from "@mui/icons-material/PolicyOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import { Box, ButtonBase, Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { BaseLayout, NavItem } from "./BaseLayout";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../shared/hooks/useAuth";
import { hasAccess } from "../../shared/utils/access";
import { SettingsDialog } from "../../features/settings/SettingsDialog";
import { fetchDashboardRequests } from "../../features/files/files.api";

type DashboardItem = {
  label: string;
  path: string;
  icon: React.ReactNode;
  access: string;
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const canViewRequests = hasAccess(user, ["dashboard.access", "file.read"]);
  const sidebarTop = ({ collapsed }: { collapsed: boolean }) => (
    <Box sx={{ width: "100%" }}>
      <ButtonBase
        onClick={() => window.location.reload()}
        sx={{
          width: "100%",
          borderRadius: "8px",
          px: 0.5,
          py: 0.5,
          justifyContent: collapsed ? "center" : "flex-start"
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{ minWidth: collapsed ? 0 : 40, display: "flex", justifyContent: "center" }}>
            <MenuBookOutlinedIcon fontSize="small" />
          </Box>
          {!collapsed && (
            <Typography variant="subtitle1" sx={{ letterSpacing: "0.12em", fontWeight: 700 }}>
              E-LIB
            </Typography>
          )}
        </Stack>
      </ButtonBase>
    </Box>
  );

  const adminItems: DashboardItem[] = [
    { label: t("users"), path: "/dashboard/users", icon: <PeopleIcon />, access: "user.read" },
    { label: t("departments"), path: "/dashboard/departments", icon: <AccountTreeIcon />, access: "department.read" },
    { label: t("roles"), path: "/dashboard/roles", icon: <ShieldIcon />, access: "role.read" },
    { label: t("content"), path: "/dashboard/content", icon: <PolicyOutlinedIcon />, access: "content.read" },
    { label: t("appearanceNav"), path: "/dashboard/appearance", icon: <PaletteOutlinedIcon />, access: "content.read" },
    { label: t("sessions"), path: "/dashboard/sessions", icon: <HistoryIcon />, access: "session.read" },
    { label: t("audit"), path: "/dashboard/audit", icon: <SecurityIcon />, access: "audit.read" }
  ];

  const manageItems: DashboardItem[] = [
    { label: t("sections"), path: "/dashboard/sections", icon: <FolderIcon />, access: "section.read" },
    { label: t("categories"), path: "/dashboard/categories", icon: <LocalOfferOutlinedIcon />, access: "category.read" },
    { label: t("publicationRequests"), path: "/dashboard/requests", icon: <AssignmentOutlinedIcon />, access: "file.read" },
    { label: t("files"), path: "/dashboard/files", icon: <DescriptionIcon />, access: "file.read" },
    { label: t("trash"), path: "/dashboard/trash", icon: <DeleteOutlineIcon />, access: "file.trash.read" },
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

  const { data: pendingRequestsData } = useQuery({
    queryKey: ["dashboard-requests-count", "pending"],
    queryFn: () => fetchDashboardRequests({ page: 1, pageSize: 1, scope: "pending" }),
    enabled: canViewRequests,
    refetchInterval: 10000
  });

  const pendingRequestsCount = pendingRequestsData?.meta?.total ?? 0;

  const sectionsWithBadges = React.useMemo(() => {
    if (!canViewRequests) return sections;
    const badgeValue = pendingRequestsCount > 0 ? pendingRequestsCount : undefined;
    return sections.map((section) => ({
      ...section,
      items: section.items.map((item) =>
        item.path === "/dashboard/requests" ? { ...item, badge: badgeValue } : item
      )
    }));
  }, [canViewRequests, pendingRequestsCount, sections]);

  return (
    <>
      <BaseLayout
        title={t("dashboard")}
        items={[]}
        sections={sectionsWithBadges}
        settingsAction={() => setSettingsOpen(true)}
        sidebarHeader={null}
        sidebarTop={sidebarTop}
        sidebarCollapsible
      >
        {children}
      </BaseLayout>
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
