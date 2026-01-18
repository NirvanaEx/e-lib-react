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
import StorageIcon from "@mui/icons-material/Storage";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import { Box, ButtonBase, Chip, Stack, Tooltip, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { BaseLayout, NavItem } from "./BaseLayout";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../shared/hooks/useAuth";
import { hasAccess } from "../../shared/utils/access";
import { fetchStorageUsage } from "../../features/stats/stats.api";
import { formatBytes } from "../../shared/utils/format";
import { SettingsDialog } from "../../features/settings/SettingsDialog";

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
  const sidebarTop = ({ collapsed }: { collapsed: boolean }) => (
    <Box sx={{ width: "100%" }}>
      <ButtonBase
        onClick={() => window.location.reload()}
        sx={{
          width: "100%",
          borderRadius: 2,
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
    { label: t("sessions"), path: "/dashboard/sessions", icon: <HistoryIcon />, access: "session.read" },
    { label: t("audit"), path: "/dashboard/audit", icon: <SecurityIcon />, access: "audit.read" }
  ];

  const manageItems: DashboardItem[] = [
    { label: t("sections"), path: "/dashboard/sections", icon: <FolderIcon />, access: "section.read" },
    { label: t("categories"), path: "/dashboard/categories", icon: <LocalOfferOutlinedIcon />, access: "category.read" },
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

  const canViewStorage = hasAccess(user, ["dashboard.access", "storage.read"]);
  const { data: storageData } = useQuery({
    queryKey: ["storage-usage"],
    queryFn: fetchStorageUsage,
    enabled: canViewStorage
  });

  const StorageSummary = () => (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1} alignItems="center">
        <StorageIcon fontSize="small" color="action" />
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: "0.16em" }}>
          {t("storageUsage")}
        </Typography>
      </Stack>
      <Stack spacing={0.5}>
        <Typography variant="h6">{formatBytes(storageData?.totalBytes || 0)}</Typography>
        <Typography variant="caption" color="text.secondary">
          {t("storageUsed")}
        </Typography>
      </Stack>
      <Stack direction="row" spacing={1} flexWrap="wrap">
        <Chip size="small" label={`${t("files")}: ${storageData?.fileCount ?? 0}`} />
        <Chip size="small" label={`${t("assets")}: ${storageData?.assetCount ?? 0}`} />
      </Stack>
      {storageData?.currentBytes ? (
        <Typography variant="caption" color="text.secondary">
          {t("currentVersions")}: {formatBytes(storageData.currentBytes)}
        </Typography>
      ) : null}
    </Stack>
  );

  const sidebarContent = canViewStorage
    ? ({ collapsed }: { collapsed: boolean }) =>
        collapsed ? (
          <Tooltip
            placement="right"
            title={
              <Box sx={{ p: 1 }}>
                <StorageSummary />
              </Box>
            }
          >
            <Stack spacing={0.5} alignItems="center">
              <StorageIcon fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary">
                {formatBytes(storageData?.totalBytes || 0)}
              </Typography>
            </Stack>
          </Tooltip>
        ) : (
          <Box>
            <StorageSummary />
          </Box>
        )
    : undefined;

  return (
    <>
      <BaseLayout
        title={t("dashboard")}
        items={[]}
        sections={sections}
        sidebarFooter={sidebarContent}
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
