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
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";
import PolicyOutlinedIcon from "@mui/icons-material/PolicyOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { Box, ButtonBase, Chip, LinearProgress, Skeleton, Stack, Tooltip, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { BaseLayout, NavItem } from "./BaseLayout";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../shared/hooks/useAuth";
import { hasAccess } from "../../shared/utils/access";
import { fetchStorageUsage } from "../../features/stats/stats.api";
import { formatBytes } from "../../shared/utils/format";
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
  const navigate = useNavigate();
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
    { label: t("stats"), path: "/dashboard/stats", icon: <InsightsIcon />, access: "stats.read" },
    { label: t("seedData"), path: "/dashboard/seed", icon: <AutoAwesomeOutlinedIcon />, access: "section.add" }
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
  const { data: storageData, isLoading: storageIsLoading } = useQuery({
    queryKey: ["storage-usage"],
    queryFn: fetchStorageUsage,
    enabled: canViewStorage
  });

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

  // Used space against the configured quota, or against the uploads volume
  // when no quota is set. Without a denominator the bar would be meaningless,
  // so it is hidden instead of showing a fake value.
  const usedBytes = storageData?.totalBytes || 0;
  const capacityBytes = storageData?.quotaBytes || storageData?.diskTotalBytes || 0;
  const usedPercent = capacityBytes > 0 ? Math.min(100, (usedBytes / capacityBytes) * 100) : null;
  const storageColor = usedPercent === null ? "primary" : usedPercent > 90 ? "error" : usedPercent > 75 ? "warning" : "primary";
  const storageLoading = canViewStorage && storageIsLoading;

  // The widget used to be inert text; it now opens the storage tab of the
  // statistics page and reacts to hover/focus like the nav items above it.
  const openStorage = () => navigate("/dashboard/stats?tab=storage");
  const canOpenStorage = hasAccess(user, ["dashboard.access", "stats.read"]);

  const StorageSummary = ({ inTooltip = false }: { inTooltip?: boolean }) => (
    <Stack spacing={1.25} sx={{ minWidth: inTooltip ? 200 : 0 }}>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
        <Stack direction="row" spacing={1} alignItems="center">
          <StorageIcon fontSize="small" color="action" />
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: "0.16em", lineHeight: 1.2 }}>
            {t("storageUsage")}
          </Typography>
        </Stack>
        {!inTooltip && canOpenStorage && <ChevronRightIcon fontSize="small" sx={{ color: "text.secondary" }} />}
      </Stack>

      {storageLoading ? (
        <Skeleton variant="rounded" height={44} />
      ) : (
        <>
          <Stack direction="row" spacing={0.75} alignItems="baseline">
            <Typography variant="h6" sx={{ lineHeight: 1.1 }}>
              {formatBytes(usedBytes)}
            </Typography>
            {capacityBytes > 0 && (
              <Typography variant="caption" color="text.secondary">
                / {formatBytes(capacityBytes)}
              </Typography>
            )}
          </Stack>
          {usedPercent !== null && (
            <Box>
              <LinearProgress
                variant="determinate"
                value={usedPercent}
                color={storageColor}
                sx={{ height: 6, borderRadius: 999 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                {t("storageFreeHint", { value: formatBytes(storageData?.diskFreeBytes || 0) })}
              </Typography>
            </Box>
          )}
          <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ rowGap: 0.75 }}>
            <Chip size="small" label={`${t("files")}: ${storageData?.fileCount ?? 0}`} />
            <Chip size="small" label={`${t("assets")}: ${storageData?.assetCount ?? 0}`} />
          </Stack>
          {storageData?.currentBytes ? (
            <Typography variant="caption" color="text.secondary">
              {t("currentVersions")}: {formatBytes(storageData.currentBytes)}
            </Typography>
          ) : null}
        </>
      )}
    </Stack>
  );

  const sidebarContent = canViewStorage
    ? ({ collapsed }: { collapsed: boolean }) => (
        <Tooltip
          placement="right"
          title={
            collapsed ? (
              <Box sx={{ p: 0.5 }}>
                <StorageSummary inTooltip />
              </Box>
            ) : (
              ""
            )
          }
        >
          <ButtonBase
            // Not `disabled`: a disabled child swallows the hover events the
            // collapsed tooltip needs. Managers hold storage.read without
            // stats.read, so for them the card is informational only.
            component={canOpenStorage ? "button" : "div"}
            onClick={canOpenStorage ? openStorage : undefined}
            disableRipple={!canOpenStorage}
            tabIndex={canOpenStorage ? 0 : -1}
            aria-label={t("storageUsage")}
            sx={{
              width: "100%",
              display: "block",
              textAlign: "left",
              borderRadius: "10px",
              p: collapsed ? 1 : 1.5,
              border: "1px solid var(--border)",
              backgroundColor: "var(--surface-2)",
              transition: "border-color 0.2s ease, background-color 0.2s ease",
              cursor: canOpenStorage ? "pointer" : "default",
              "&:hover": canOpenStorage
                ? { borderColor: "primary.main", backgroundColor: "rgba(37, 99, 235, 0.08)" }
                : undefined
            }}
          >
            {collapsed ? (
              <Stack spacing={0.5} alignItems="center">
                <StorageIcon fontSize="small" color="action" />
                <Typography variant="caption" color="text.secondary">
                  {formatBytes(usedBytes)}
                </Typography>
                {usedPercent !== null && (
                  <LinearProgress
                    variant="determinate"
                    value={usedPercent}
                    color={storageColor}
                    sx={{ width: "100%", height: 4, borderRadius: 999 }}
                  />
                )}
              </Stack>
            ) : (
              <StorageSummary />
            )}
          </ButtonBase>
        </Tooltip>
      )
    : undefined;

  return (
    <>
      <BaseLayout
        title={t("dashboard")}
        items={[]}
        sections={sectionsWithBadges}
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
