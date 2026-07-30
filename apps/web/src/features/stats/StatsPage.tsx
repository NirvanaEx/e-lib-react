import React from "react";
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Grid,
  LinearProgress,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import StorageOutlinedIcon from "@mui/icons-material/StorageOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis
} from "recharts";
import { useTranslation } from "react-i18next";
import {
  downloadActivityCsv,
  fetchActivity,
  fetchLargestFiles,
  fetchLoginActivity,
  fetchStatsByDepartment,
  fetchStatsByPeriod,
  fetchStatsOverview,
  fetchStorageUsage,
  fetchTopFiles,
  fetchTopUsers
} from "./stats.api";
import { fetchUserOptions } from "../admin-users/users.api";
import { fetchDepartmentOptions } from "../departments/departments.api";
import { Page } from "../../shared/ui/Page";
import { StatCard } from "../../shared/ui/StatCard";
import { SectionCard } from "../../shared/ui/SectionCard";
import { FiltersBar } from "../../shared/ui/FiltersBar";
import { SearchField } from "../../shared/ui/SearchField";
import { DataTable } from "../../shared/ui/DataTable";
import { rowNumberColumn } from "../../shared/ui/rowNumberColumn";
import { EmptyState } from "../../shared/ui/EmptyState";
import { LoadingState } from "../../shared/ui/LoadingState";
import { PaginationBar } from "../../shared/ui/PaginationBar";
import { formatDate, formatDateTime } from "../../shared/utils/date";
import { formatBytes } from "../../shared/utils/format";
import { formatUserLabel } from "../../shared/utils/userLabel";
import { useAuth } from "../../shared/hooks/useAuth";
import { hasAccess } from "../../shared/utils/access";
import { useToast } from "../../shared/ui/ToastProvider";

type TabKey = "overview" | "activity" | "files" | "users" | "storage" | "security";

const TAB_KEYS: TabKey[] = ["overview", "activity", "files", "users", "storage", "security"];

const toDateInput = (date: Date) => date.toISOString().slice(0, 10);

type RangePreset = "all" | "30d" | "1y" | "5y" | "custom";

/**
 * Пресеты диапазона. Пустые from/to = «за всё время»: серверный applyRange
 * просто не добавляет условие по дате. Гранулярность подбираем под длину
 * диапазона, иначе на пятилетке график превратится в кашу из дневных точек.
 */
function presetRange(preset: RangePreset): { from: string; to: string; bucket: string } | null {
  if (preset === "custom") return null;
  if (preset === "all") return { from: "", to: "", bucket: "month" };

  const today = new Date();
  const start = new Date();
  if (preset === "30d") {
    start.setDate(start.getDate() - 29);
    return { from: toDateInput(start), to: toDateInput(today), bucket: "day" };
  }
  start.setFullYear(start.getFullYear() - (preset === "1y" ? 1 : 5));
  start.setDate(start.getDate() + 1);
  return { from: toDateInput(start), to: toDateInput(today), bucket: preset === "1y" ? "week" : "month" };
}

// Percentage change vs the previous window; null when there is no baseline to
// compare against (a jump from zero is not a meaningful percentage).
function deltaPercent(current: number, previous?: number | null) {
  if (previous === undefined || previous === null) return null;
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

export default function StatsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const canReadStorage = hasAccess(user, ["storage.read"]);
  const canReadAudit = hasAccess(user, ["audit.read"]);

  // The sidebar storage widget links straight to ?tab=storage.
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab") as TabKey | null;
  const [tab, setTab] = React.useState<TabKey>(
    requestedTab && TAB_KEYS.includes(requestedTab) ? requestedTab : "overview"
  );

  const changeTab = (next: TabKey) => {
    setTab(next);
    const params = new URLSearchParams(searchParams);
    if (next === "overview") params.delete("tab");
    else params.set("tab", next);
    setSearchParams(params, { replace: true });
  };
  const [rangePreset, setRangePreset] = React.useState<RangePreset>("all");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [bucket, setBucket] = React.useState("month");

  const applyPreset = (preset: RangePreset) => {
    setRangePreset(preset);
    const next = presetRange(preset);
    if (!next) return;
    setFrom(next.from);
    setTo(next.to);
    setBucket(next.bucket);
  };

  const [userId, setUserId] = React.useState<number | null>(null);
  const [userSearch, setUserSearch] = React.useState("");
  const [departmentId, setDepartmentId] = React.useState<number | null>(null);
  const [action, setAction] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [exporting, setExporting] = React.useState(false);

  const range = React.useMemo(() => ({ from: from || undefined, to: to || undefined }), [from, to]);

  React.useEffect(() => {
    setPage(1);
  }, [from, to, userId, departmentId, action, search, pageSize]);

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ["stats-overview", range],
    queryFn: () => fetchStatsOverview(range)
  });

  const { data: period } = useQuery({
    queryKey: ["stats-period", range, bucket],
    queryFn: () => fetchStatsByPeriod({ ...range, bucket })
  });

  const { data: topFiles, isLoading: topFilesLoading } = useQuery({
    queryKey: ["stats-top-files", range],
    queryFn: () => fetchTopFiles({ ...range, limit: 20 })
  });

  const { data: topUsers, isLoading: topUsersLoading } = useQuery({
    queryKey: ["stats-top-users", range],
    queryFn: () => fetchTopUsers({ ...range, limit: 20 })
  });

  const { data: byDepartment } = useQuery({
    queryKey: ["stats-by-department", range],
    queryFn: () => fetchStatsByDepartment(range)
  });

  const activityFilters = React.useMemo(
    () => ({
      ...range,
      page,
      pageSize,
      userId: userId || undefined,
      departmentId: departmentId || undefined,
      action: action === "all" ? undefined : action,
      q: search || undefined
    }),
    [range, page, pageSize, userId, departmentId, action, search]
  );

  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ["stats-activity", activityFilters],
    queryFn: () => fetchActivity(activityFilters),
    enabled: tab === "activity"
  });

  const { data: storage, isLoading: storageLoading } = useQuery({
    queryKey: ["storage-usage"],
    queryFn: fetchStorageUsage,
    enabled: canReadStorage && tab === "storage"
  });

  const { data: largest } = useQuery({
    queryKey: ["storage-largest"],
    queryFn: () => fetchLargestFiles({ limit: 10 }),
    enabled: canReadStorage && tab === "storage"
  });

  const { data: logins, isLoading: loginsLoading } = useQuery({
    queryKey: ["stats-logins", range],
    queryFn: () => fetchLoginActivity({ ...range, limit: 50 }),
    enabled: canReadAudit && tab === "security"
  });

  // Managers reach this page with stats.read but without user.read, so the
  // filters use the option endpoints (file.access.update) rather than the full
  // admin lists.
  const canFilterByPeople = hasAccess(user, ["file.access.update"]);

  const { data: usersData } = useQuery({
    queryKey: ["user-options", userSearch],
    queryFn: () => fetchUserOptions({ page: 1, pageSize: 50, q: userSearch }),
    enabled: canFilterByPeople && tab === "activity"
  });

  const { data: departmentsData } = useQuery({
    queryKey: ["department-options"],
    queryFn: () => fetchDepartmentOptions({ page: 1, pageSize: 200 }),
    enabled: canFilterByPeople && tab === "activity"
  });

  const userOptions = usersData?.data || [];
  const departmentOptions = departmentsData?.data || [];

  const chartData = (period?.data || []).map((row: any) => ({
    bucket: formatDate(row.bucket),
    downloads: row.downloads,
    views: row.views
  }));

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await downloadActivityCsv({ ...activityFilters, page: undefined, pageSize: undefined });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `activity_${from || "all"}_${to || "all"}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (_err) {
      showToast({ message: t("actionFailed"), severity: "error" });
    } finally {
      setExporting(false);
    }
  };

  const actionChip = (value: string) =>
    value === "download" ? (
      <Chip size="small" color="primary" variant="outlined" icon={<DownloadIcon />} label={t("download")} />
    ) : (
      <Chip size="small" variant="outlined" icon={<VisibilityOutlinedIcon />} label={t("view")} />
    );

  const tabs: { key: TabKey; label: string; visible: boolean }[] = [
    { key: "overview", label: t("statsTabOverview"), visible: true },
    { key: "activity", label: t("statsTabActivity"), visible: true },
    { key: "files", label: t("statsTabFiles"), visible: true },
    { key: "users", label: t("statsTabUsers"), visible: true },
    { key: "storage", label: t("statsTabStorage"), visible: canReadStorage },
    { key: "security", label: t("statsTabSecurity"), visible: canReadAudit }
  ];

  const usedBytes = storage?.totalBytes || 0;
  const capacityBytes = storage?.quotaBytes || storage?.diskTotalBytes || 0;
  const usedPercent = capacityBytes > 0 ? Math.min(100, (usedBytes / capacityBytes) * 100) : 0;

  return (
    <Page title={t("stats")} subtitle={t("statsSubtitle")}>
      <FiltersBar
        actions={
          tab === "activity" ? (
            <Button
              variant="outlined"
              startIcon={<FileDownloadOutlinedIcon />}
              onClick={handleExport}
              disabled={exporting}
            >
              {t("exportCsv")}
            </Button>
          ) : undefined
        }
      >
        <TextField
          select
          size="small"
          label={t("dateRange")}
          value={rangePreset}
          onChange={(event) => applyPreset(event.target.value as RangePreset)}
          sx={{ minWidth: 170 }}
        >
          <MenuItem value="all">{t("rangeAllTime")}</MenuItem>
          <MenuItem value="30d">{t("rangeLast30Days")}</MenuItem>
          <MenuItem value="1y">{t("rangeLastYear")}</MenuItem>
          <MenuItem value="5y">{t("rangeLast5Years")}</MenuItem>
          <MenuItem value="custom">{t("rangeCustom")}</MenuItem>
        </TextField>
        <TextField
          type="date"
          size="small"
          label={t("from")}
          value={from}
          onChange={(event) => {
            setFrom(event.target.value);
            setRangePreset("custom");
          }}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          type="date"
          size="small"
          label={t("to")}
          value={to}
          onChange={(event) => {
            setTo(event.target.value);
            setRangePreset("custom");
          }}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          select
          size="small"
          label={t("bucket")}
          value={bucket}
          onChange={(event) => setBucket(event.target.value)}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="day">{t("day")}</MenuItem>
          <MenuItem value="week">{t("week")}</MenuItem>
          <MenuItem value="month">{t("month")}</MenuItem>
        </TextField>
        {tab === "activity" && (
          <>
            <TextField
              select
              size="small"
              label={t("action")}
              value={action}
              onChange={(event) => setAction(event.target.value)}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="all">{t("allActions")}</MenuItem>
              <MenuItem value="download">{t("download")}</MenuItem>
              <MenuItem value="view">{t("view")}</MenuItem>
            </TextField>
            {canFilterByPeople && (
              <>
                <Autocomplete
                  options={userOptions}
                  getOptionLabel={(option: any) => formatUserLabel(option)}
                  value={userOptions.find((item: any) => item.id === userId) || null}
                  isOptionEqualToValue={(option: any, value: any) => option.id === value.id}
                  onChange={(_, value: any | null) => setUserId(value ? value.id : null)}
                  onInputChange={(_, value) => setUserSearch(value)}
                  renderInput={(params) => <TextField {...params} size="small" label={t("user")} />}
                  sx={{ minWidth: 220 }}
                />
                <Autocomplete
                  options={departmentOptions}
                  getOptionLabel={(option: any) => option.path || option.name || ""}
                  value={departmentOptions.find((item: any) => item.id === departmentId) || null}
                  isOptionEqualToValue={(option: any, value: any) => option.id === value.id}
                  onChange={(_, value: any | null) => setDepartmentId(value ? value.id : null)}
                  renderInput={(params) => <TextField {...params} size="small" label={t("department")} />}
                  sx={{ minWidth: 200 }}
                />
              </>
            )}
            <SearchField value={search} onChange={setSearch} placeholder={t("searchActivity")} />
          </>
        )}
      </FiltersBar>

      <Box sx={{ borderBottom: "1px solid var(--border)", mb: 2 }}>
        <Tabs value={tab} onChange={(_, value) => changeTab(value)} variant="scrollable" scrollButtons="auto">
          {tabs
            .filter((item) => item.visible)
            .map((item) => (
              <Tab key={item.key} value={item.key} label={item.label} sx={{ textTransform: "none", fontWeight: 600 }} />
            ))}
        </Tabs>
      </Box>

      {tab === "overview" && (
        <>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                label={t("totalDownloads")}
                value={overview?.downloads ?? 0}
                icon={<DownloadIcon fontSize="small" />}
                delta={deltaPercent(overview?.downloads ?? 0, overview?.previous?.downloads)}
                deltaTooltip={t("vsPreviousPeriod")}
                hint={t("uniqueUsersCount", { count: overview?.downloadUsers ?? 0 })}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                label={t("totalViews")}
                value={overview?.views ?? 0}
                icon={<VisibilityOutlinedIcon fontSize="small" />}
                delta={deltaPercent(overview?.views ?? 0, overview?.previous?.views)}
                deltaTooltip={t("vsPreviousPeriod")}
                hint={t("uniqueUsersCount", { count: overview?.viewUsers ?? 0 })}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                label={t("activeUsers")}
                value={overview?.activeUsers ?? 0}
                icon={<PeopleAltOutlinedIcon fontSize="small" />}
                hint={t("ofTotalUsers", { count: overview?.totalUsers ?? 0 })}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                label={t("newFiles")}
                value={overview?.newFiles ?? 0}
                icon={<DescriptionOutlinedIcon fontSize="small" />}
                hint={t("ofTotalFiles", { count: overview?.totalFiles ?? 0 })}
              />
            </Grid>
          </Grid>

          <SectionCard title={t("activityByPeriod")} subtitle={t("activityByPeriodHint")}>
            {overviewLoading ? (
              <LoadingState rows={3} />
            ) : chartData.length === 0 ? (
              <EmptyState title={t("noData")} />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="downloadsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <ChartTooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    name={t("downloads")}
                    dataKey="downloads"
                    stroke="#2563eb"
                    strokeWidth={2}
                    fill="url(#downloadsFill)"
                  />
                  <Area
                    type="monotone"
                    name={t("views")}
                    dataKey="views"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    fill="url(#viewsFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </SectionCard>

          <SectionCard title={t("byDepartment")} subtitle={t("byDepartmentHint")} disablePadding>
            {(byDepartment?.data || []).length === 0 ? (
              <Box sx={{ p: 2.5, pt: 0 }}>
                <EmptyState title={t("noData")} />
              </Box>
            ) : (
              <DataTable
                rows={(byDepartment?.data || []).map((row: any, index: number) => ({
                  ...row,
                  id: row.departmentId ?? `none-${index}`
                }))}
                columns={[
                  rowNumberColumn({ total: byDepartment?.data?.length || 0, order: "asc" }),
                  {
                    key: "department",
                    label: t("department"),
                    render: (row: any) => row.department || t("withoutDepartment")
                  },
                  { key: "downloads", label: t("downloads"), align: "right" },
                  { key: "views", label: t("views"), align: "right" },
                  { key: "users", label: t("users"), align: "right" }
                ]}
              />
            )}
          </SectionCard>
        </>
      )}

      {tab === "activity" && (
        <>
          <SectionCard title={t("activityFeed")} subtitle={t("activityFeedHint")} disablePadding>
            {activityLoading ? (
              <Box sx={{ p: 2.5 }}>
                <LoadingState rows={6} />
              </Box>
            ) : (activity?.data || []).length === 0 ? (
              <Box sx={{ p: 2.5, pt: 0 }}>
                <EmptyState title={t("noData")} subtitle={t("activityEmptyHint")} />
              </Box>
            ) : (
              <DataTable
                rows={activity?.data || []}
                columns={[
                  rowNumberColumn({
                    total: activity?.meta?.total || 0,
                    page: activity?.meta?.page || page,
                    pageSize: activity?.meta?.pageSize || pageSize
                  }),
                  {
                    key: "createdAt",
                    label: t("time"),
                    width: 150,
                    render: (row: any) => formatDateTime(row.createdAt)
                  },
                  {
                    key: "action",
                    label: t("action"),
                    width: 130,
                    render: (row: any) => actionChip(row.action)
                  },
                  {
                    key: "user",
                    label: t("user"),
                    cellWrap: true,
                    render: (row: any) => (row.user ? formatUserLabel(row.user) : "-")
                  },
                  {
                    key: "department",
                    label: t("department"),
                    cellWrap: true,
                    render: (row: any) => row.user?.department || "-"
                  },
                  {
                    key: "file",
                    label: t("file"),
                    cellWrap: true,
                    render: (row: any) => row.file?.title || (row.file ? `#${row.file.id}` : "-")
                  },
                  {
                    key: "versionNumber",
                    label: t("versionLabel"),
                    width: 90,
                    align: "center",
                    render: (row: any) => (row.versionNumber ? `v${row.versionNumber}` : "-")
                  },
                  {
                    key: "lang",
                    label: t("language"),
                    width: 90,
                    align: "center",
                    render: (row: any) => (row.lang ? String(row.lang).toUpperCase() : "-")
                  },
                  {
                    key: "ip",
                    label: t("ip"),
                    width: 130,
                    render: (row: any) =>
                      row.userAgent ? (
                        <Tooltip title={row.userAgent}>
                          <span>{row.ip || "-"}</span>
                        </Tooltip>
                      ) : (
                        row.ip || "-"
                      )
                  }
                ]}
              />
            )}
          </SectionCard>
          <PaginationBar
            page={activity?.meta?.page || page}
            pageSize={activity?.meta?.pageSize || pageSize}
            total={activity?.meta?.total || 0}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </>
      )}

      {tab === "files" && (
        <SectionCard title={t("topFiles")} subtitle={t("topFilesHint")} disablePadding>
          {topFilesLoading ? (
            <Box sx={{ p: 2.5 }}>
              <LoadingState rows={6} />
            </Box>
          ) : (topFiles?.data || []).length === 0 ? (
            <Box sx={{ p: 2.5, pt: 0 }}>
              <EmptyState title={t("noData")} />
            </Box>
          ) : (
            <DataTable
              rows={(topFiles?.data || []).map((row: any) => ({ ...row, id: row.fileItemId }))}
              columns={[
                rowNumberColumn({ total: topFiles?.data?.length || 0, order: "asc" }),
                {
                  key: "title",
                  label: t("title"),
                  cellWrap: true,
                  render: (row: any) => row.title || `#${row.fileItemId}`
                },
                { key: "downloads", label: t("downloads"), align: "right", width: 130 },
                { key: "views", label: t("views"), align: "right", width: 130 },
                { key: "uniqueUsers", label: t("uniqueUsers"), align: "right", width: 150 },
                {
                  key: "lastActivity",
                  label: t("lastActivity"),
                  width: 160,
                  render: (row: any) => formatDateTime(row.lastActivity)
                }
              ]}
            />
          )}
        </SectionCard>
      )}

      {tab === "users" && (
        <SectionCard title={t("topUsers")} subtitle={t("topUsersHint")} disablePadding>
          {topUsersLoading ? (
            <Box sx={{ p: 2.5 }}>
              <LoadingState rows={6} />
            </Box>
          ) : (topUsers?.data || []).length === 0 ? (
            <Box sx={{ p: 2.5, pt: 0 }}>
              <EmptyState title={t("noData")} />
            </Box>
          ) : (
            <DataTable
              rows={(topUsers?.data || []).map((row: any) => ({ ...row, id: row.userId }))}
              columns={[
                rowNumberColumn({ total: topUsers?.data?.length || 0, order: "asc" }),
                {
                  key: "login",
                  label: t("user"),
                  cellWrap: true,
                  render: (row: any) => formatUserLabel(row)
                },
                {
                  key: "department",
                  label: t("department"),
                  cellWrap: true,
                  render: (row: any) => row.department || "-"
                },
                { key: "downloads", label: t("downloads"), align: "right", width: 130 },
                { key: "views", label: t("views"), align: "right", width: 130 },
                { key: "uniqueFiles", label: t("uniqueFiles"), align: "right", width: 140 },
                {
                  key: "lastActivity",
                  label: t("lastActivity"),
                  width: 160,
                  render: (row: any) => formatDateTime(row.lastActivity)
                }
              ]}
            />
          )}
        </SectionCard>
      )}

      {tab === "storage" && canReadStorage && (
        <>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                label={t("storageUsed")}
                value={formatBytes(storage?.totalBytes || 0)}
                icon={<StorageOutlinedIcon fontSize="small" />}
                hint={t("assetsCount", { count: storage?.assetCount ?? 0 })}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                label={t("currentVersions")}
                value={formatBytes(storage?.currentBytes || 0)}
                icon={<DescriptionOutlinedIcon fontSize="small" />}
                hint={t("documentsCount", { count: storage?.fileCount ?? 0 })}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard label={t("trashSize")} value={formatBytes(storage?.trashedBytes || 0)} hint={t("trashSizeHint")} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                label={t("diskFree")}
                value={formatBytes(storage?.diskFreeBytes || 0)}
                hint={
                  storage?.diskTotalBytes
                    ? t("ofDiskTotal", { total: formatBytes(storage.diskTotalBytes) })
                    : undefined
                }
              />
            </Grid>
          </Grid>

          <SectionCard title={t("storageUsage")} subtitle={storage?.quotaBytes ? t("quotaHint") : t("diskHint")}>
            {storageLoading ? (
              <LoadingState rows={2} />
            ) : (
              <Stack spacing={1}>
                <LinearProgress
                  variant="determinate"
                  value={usedPercent}
                  sx={{ height: 10, borderRadius: 999 }}
                  color={usedPercent > 90 ? "error" : usedPercent > 75 ? "warning" : "primary"}
                />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">
                    {formatBytes(usedBytes)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {capacityBytes > 0 ? formatBytes(capacityBytes) : t("unknown")}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ rowGap: 1, pt: 1 }}>
                  {(storage?.byType || []).map((row: any) => (
                    <Chip
                      key={row.ext}
                      size="small"
                      variant="outlined"
                      label={`${String(row.ext).toUpperCase()}: ${formatBytes(row.bytes)} (${row.count})`}
                    />
                  ))}
                </Stack>
              </Stack>
            )}
          </SectionCard>

          <SectionCard title={t("largestFiles")} subtitle={t("largestFilesHint")} disablePadding>
            {(largest?.data || []).length === 0 ? (
              <Box sx={{ p: 2.5, pt: 0 }}>
                <EmptyState title={t("noData")} />
              </Box>
            ) : (
              <DataTable
                rows={(largest?.data || []).map((row: any) => ({ ...row, id: row.fileItemId }))}
                columns={[
                  rowNumberColumn({ total: largest?.data?.length || 0, order: "asc" }),
                  {
                    key: "title",
                    label: t("title"),
                    cellWrap: true,
                    render: (row: any) => row.title || `#${row.fileItemId}`
                  },
                  { key: "versionCount", label: t("versions"), align: "right", width: 120 },
                  {
                    key: "bytes",
                    label: t("fileSize"),
                    align: "right",
                    width: 140,
                    render: (row: any) => formatBytes(row.bytes)
                  }
                ]}
              />
            )}
          </SectionCard>
        </>
      )}

      {tab === "security" && canReadAudit && (
        <>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={4}>
              <StatCard
                label={t("successfulLogins")}
                value={logins?.successCount ?? 0}
                icon={<ShieldOutlinedIcon fontSize="small" />}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <StatCard label={t("failedLogins")} value={logins?.failureCount ?? 0} hint={t("failedLoginsHint")} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <StatCard label={t("failedLoginIps")} value={logins?.failureIps ?? 0} />
            </Grid>
          </Grid>

          <SectionCard title={t("recentFailedLogins")} subtitle={t("recentFailedLoginsHint")} disablePadding>
            {loginsLoading ? (
              <Box sx={{ p: 2.5 }}>
                <LoadingState rows={6} />
              </Box>
            ) : (logins?.recentFailures || []).length === 0 ? (
              <Box sx={{ p: 2.5, pt: 0 }}>
                <EmptyState title={t("noData")} subtitle={t("noFailedLogins")} />
              </Box>
            ) : (
              <DataTable
                rows={logins?.recentFailures || []}
                columns={[
                  rowNumberColumn({ total: (logins?.recentFailures || []).length }),
                  {
                    key: "createdAt",
                    label: t("time"),
                    width: 160,
                    render: (row: any) => formatDateTime(row.createdAt)
                  },
                  { key: "login", label: t("login"), cellWrap: true },
                  {
                    key: "fullName",
                    label: t("user"),
                    cellWrap: true,
                    render: (row: any) => row.fullName || "-"
                  },
                  {
                    key: "reason",
                    label: t("reason"),
                    width: 180,
                    render: (row: any) => t(`loginReason_${row.reason || "unknown"}`, { defaultValue: row.reason || "-" })
                  },
                  { key: "ip", label: t("ip"), width: 140 }
                ]}
              />
            )}
          </SectionCard>
        </>
      )}
    </Page>
  );
}
