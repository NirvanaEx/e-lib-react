import React from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import DownloadIcon from "@mui/icons-material/Download";
import PublicIcon from "@mui/icons-material/Public";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Page } from "../../shared/ui/Page";
import { DataTable } from "../../shared/ui/DataTable";
import { EmptyState } from "../../shared/ui/EmptyState";
import { LoadingState } from "../../shared/ui/LoadingState";
import { FiltersBar } from "../../shared/ui/FiltersBar";
import { PaginationBar } from "../../shared/ui/PaginationBar";
import { SearchField } from "../../shared/ui/SearchField";
import { useToast } from "../../shared/ui/ToastProvider";
import { buildPathMap } from "../../shared/utils/tree";
import { formatDateTime } from "../../shared/utils/date";
import { formatBytes } from "../../shared/utils/format";
import { getErrorMessage } from "../../shared/utils/errors";
import { getFilenameFromDisposition } from "../../shared/utils/download";
import { fetchSections } from "../sections/sections.api";
import { fetchCategories } from "../categories/categories.api";
import {
  approveDashboardRequest,
  fetchDashboardRequestAssets,
  fetchDashboardRequests,
  rejectDashboardRequest,
  downloadDashboardRequestAsset
} from "./files.api";

type RequestRow = {
  id: number;
  title?: string | null;
  description?: string | null;
  sectionId?: number | null;
  categoryId?: number | null;
  accessType: string;
  status: string;
  comment?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  resolvedAt?: string | null;
  availableLangs?: string[];
  createdBy?: {
    login?: string | null;
    fullName?: string | null;
    department?: string | null;
  } | null;
};

type SectionOption = { id: number; title?: string | null };
type CategoryOption = { id: number; title?: string | null; parentId?: number | null };

const autoRefreshMs = 10000;

export default function FileRequestsPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [search, setSearch] = React.useState("");
  const [detailsTarget, setDetailsTarget] = React.useState<RequestRow | null>(null);
  const [rejectTarget, setRejectTarget] = React.useState<RequestRow | null>(null);
  const [rejectReason, setRejectReason] = React.useState("");

  const scope = tab === 0 ? "pending" : "history";

  React.useEffect(() => {
    setPage(1);
  }, [tab, pageSize, search]);

  const { data: requestsData, isLoading } = useQuery({
    queryKey: ["dashboard-requests", scope, page, pageSize, search],
    queryFn: () => fetchDashboardRequests({ page, pageSize, scope, q: search }),
    refetchInterval: autoRefreshMs
  });

  const { data: pendingCountData } = useQuery({
    queryKey: ["dashboard-requests-count", "pending", search],
    queryFn: () => fetchDashboardRequests({ page: 1, pageSize: 1, scope: "pending", q: search }),
    refetchInterval: autoRefreshMs
  });

  const { data: historyCountData } = useQuery({
    queryKey: ["dashboard-requests-count", "history", search],
    queryFn: () => fetchDashboardRequests({ page: 1, pageSize: 1, scope: "history", q: search }),
    refetchInterval: autoRefreshMs
  });

  const pendingCount = pendingCountData?.meta?.total ?? 0;
  const historyCount = historyCountData?.meta?.total ?? 0;

  const { data: sectionsData } = useQuery({
    queryKey: ["sections", "options", 200],
    queryFn: () => fetchSections({ page: 1, pageSize: 200 })
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["categories", "options", 500],
    queryFn: () => fetchCategories({ page: 1, pageSize: 500 })
  });

  const sections: SectionOption[] = sectionsData?.data || [];
  const categories: CategoryOption[] = categoriesData?.data || [];
  const sectionTitleById = React.useMemo(
    () => new Map(sections.map((section) => [section.id, section.title || `#${section.id}`])),
    [sections]
  );

  const categoryPathById = React.useMemo(
    () =>
      buildPathMap(
        categories,
        (item) => item.id,
        (item) => item.parentId ?? null,
        (item) => item.title || `#${item.id}`
      ),
    [categories]
  );

  const getCategoryPath = (id: number) => categoryPathById.get(id) || [`#${id}`];

  const renderPath = (segments: string[]) => (
    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexWrap: "wrap" }}>
      {segments.map((segment, index) => (
        <React.Fragment key={`${segment}-${index}`}>
          {index > 0 && <ChevronRightIcon fontSize="small" sx={{ color: "text.disabled" }} />}
          <Box component="span" sx={{ minWidth: 0 }}>
            {segment}
          </Box>
        </React.Fragment>
      ))}
    </Stack>
  );

  const rows: RequestRow[] = requestsData?.data || [];
  const meta = requestsData?.meta || { page, pageSize, total: 0 };
  const { data: assetsData, isLoading: assetsLoading } = useQuery({
    queryKey: ["dashboard-request-assets", detailsTarget?.id],
    queryFn: () => fetchDashboardRequestAssets(detailsTarget?.id as number),
    enabled: Boolean(detailsTarget?.id)
  });
  const assets = assetsData?.data || [];

  const formatBadge = (count: number) => (count > 9 ? "9+" : String(count));

  const accessChip = (accessType: string) => (
    <Chip
      size="small"
      variant="outlined"
      sx={{
        borderColor: accessType === "restricted" ? "warning.main" : "success.main",
        color: accessType === "restricted" ? "warning.main" : "success.main",
        fontWeight: 600
      }}
      label={accessType === "restricted" ? t("accessRestricted") : t("accessPublic")}
    />
  );

  const accessIcon = (accessType: string) => (
    <Tooltip title={accessType === "restricted" ? t("accessRestricted") : t("accessPublic")}>
      <Box sx={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
        {accessType === "restricted" ? (
          <GroupOutlinedIcon fontSize="small" sx={{ color: "warning.main" }} />
        ) : (
          <PublicIcon fontSize="small" sx={{ color: "success.main" }} />
        )}
      </Box>
    </Tooltip>
  );

  const getAdminComment = (row: RequestRow) => (row as any)?.adminComment ?? row.rejectionReason ?? null;

  const CommentBlock = ({
    label,
    value,
    tone
  }: {
    label: string;
    value?: string | null;
    tone: "user" | "admin";
  }) => (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        borderRadius: 2,
        borderLeft: "4px solid",
        borderLeftColor: tone === "user" ? "info.main" : "error.main",
        backgroundColor: tone === "user" ? "rgba(29, 77, 79, 0.06)" : "rgba(210, 47, 40, 0.08)"
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
        {label}
      </Typography>
      <Typography variant="body2">{value || t("noComment")}</Typography>
    </Paper>
  );

  const statusChip = (status: string) => {
    if (status === "approved") {
      return <Chip size="small" color="success" label={t("requestApproved")} />;
    }
    if (status === "rejected") {
      return <Chip size="small" color="error" label={t("requestRejected")} />;
    }
    if (status === "canceled") {
      return <Chip size="small" label={t("requestCancelled")} />;
    }
    return <Chip size="small" color="warning" label={t("requestPending")} />;
  };

  const approveMutation = useMutation({
    mutationFn: (id: number) => approveDashboardRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-requests"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-requests-count"] });
      setDetailsTarget(null);
      showToast({ message: t("requestApproved"), severity: "success" });
    },
    onError: (error) => showToast({ message: getErrorMessage(error, t("actionFailed")), severity: "error" })
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string | null }) =>
      rejectDashboardRequest(id, { reason: reason || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-requests"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-requests-count"] });
      setRejectTarget(null);
      setRejectReason("");
      setDetailsTarget(null);
      showToast({ message: t("requestRejected"), severity: "success" });
    },
    onError: (error) => showToast({ message: getErrorMessage(error, t("actionFailed")), severity: "error" })
  });

  const openReject = (row: RequestRow) => {
    setRejectTarget(row);
    setRejectReason("");
    setDetailsTarget(null);
  };

  const downloadMutation = useMutation({
    mutationFn: ({ requestId, assetId }: { requestId: number; assetId: number; filename?: string | null }) =>
      downloadDashboardRequestAsset(requestId, assetId),
    onSuccess: (response, variables) => {
      const filename =
        getFilenameFromDisposition(response.headers?.["content-disposition"]) ||
        variables.filename ||
        "file";
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename || "file";
      link.click();
      window.URL.revokeObjectURL(url);
    },
    onError: (error) => showToast({ message: getErrorMessage(error, t("actionFailed")), severity: "error" })
  });

  const pendingColumns = [
    {
      key: "login",
      label: t("login"),
      render: (row: RequestRow) => row.createdBy?.login || "-",
      sortValue: (row: RequestRow) => row.createdBy?.login || ""
    },
    {
      key: "user",
      label: t("user"),
      width: 180,
      render: (row: RequestRow) => row.createdBy?.fullName || row.createdBy?.login || "-",
      sortValue: (row: RequestRow) => row.createdBy?.fullName || row.createdBy?.login || ""
    },
    {
      key: "title",
      label: t("title"),
      render: (row: RequestRow) => row.title || t("file"),
      sortValue: (row: RequestRow) => row.title || ""
    },
    {
      key: "department",
      label: t("department"),
      width: 180,
      render: (row: RequestRow) => row.createdBy?.department || "-",
      sortValue: (row: RequestRow) => row.createdBy?.department || ""
    },
    {
      key: "section",
      label: t("section"),
      width: 160,
      render: (row: RequestRow) => (row.sectionId ? sectionTitleById.get(row.sectionId) || `#${row.sectionId}` : "-"),
      sortValue: (row: RequestRow) => (row.sectionId ? sectionTitleById.get(row.sectionId) || `#${row.sectionId}` : "")
    },
    {
      key: "category",
      label: t("category"),
      render: (row: RequestRow) => (row.categoryId ? renderPath(getCategoryPath(row.categoryId)) : "-"),
      sortValue: (row: RequestRow) => (row.categoryId ? getCategoryPath(row.categoryId).join(" / ") : "")
    },
    {
      key: "access",
      label: t("access"),
      align: "center",
      width: 48,
      render: (row: RequestRow) => accessIcon(row.accessType),
      sortValue: (row: RequestRow) => row.accessType
    },
    {
      key: "createdAt",
      label: t("createdAt"),
      render: (row: RequestRow) => formatDateTime(row.createdAt),
      sortValue: (row: RequestRow) => new Date(row.createdAt).getTime()
    },
    {
      key: "actions",
      label: t("actions"),
      align: "right",
      sortable: false,
      width: 96,
      render: (row: RequestRow) => (
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Tooltip title={t("approve")}>
            <IconButton
              size="small"
              color="success"
              onClick={(event) => {
                event.stopPropagation();
                setDetailsTarget(row);
              }}
            >
              <CheckCircleOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t("reject")}>
            <IconButton
              size="small"
              color="error"
              onClick={(event) => {
                event.stopPropagation();
                openReject(row);
              }}
            >
              <HighlightOffIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      )
    }
  ];

  const historyColumns = [
    {
      key: "login",
      label: t("login"),
      render: (row: RequestRow) => row.createdBy?.login || "-",
      sortValue: (row: RequestRow) => row.createdBy?.login || ""
    },
    {
      key: "user",
      label: t("user"),
      width: 180,
      render: (row: RequestRow) => row.createdBy?.fullName || row.createdBy?.login || "-",
      sortValue: (row: RequestRow) => row.createdBy?.fullName || row.createdBy?.login || ""
    },
    {
      key: "title",
      label: t("title"),
      render: (row: RequestRow) => row.title || t("file"),
      sortValue: (row: RequestRow) => row.title || ""
    },
    {
      key: "department",
      label: t("department"),
      width: 180,
      render: (row: RequestRow) => row.createdBy?.department || "-",
      sortValue: (row: RequestRow) => row.createdBy?.department || ""
    },
    {
      key: "section",
      label: t("section"),
      width: 160,
      render: (row: RequestRow) => (row.sectionId ? sectionTitleById.get(row.sectionId) || `#${row.sectionId}` : "-"),
      sortValue: (row: RequestRow) => (row.sectionId ? sectionTitleById.get(row.sectionId) || `#${row.sectionId}` : "")
    },
    {
      key: "category",
      label: t("category"),
      render: (row: RequestRow) => (row.categoryId ? renderPath(getCategoryPath(row.categoryId)) : "-"),
      sortValue: (row: RequestRow) => (row.categoryId ? getCategoryPath(row.categoryId).join(" / ") : "")
    },
    {
      key: "access",
      label: t("access"),
      align: "center",
      width: 48,
      render: (row: RequestRow) => accessIcon(row.accessType),
      sortValue: (row: RequestRow) => row.accessType
    },
    {
      key: "status",
      label: t("status"),
      render: (row: RequestRow) => statusChip(row.status),
      sortValue: (row: RequestRow) => row.status
    },
    {
      key: "resolvedAt",
      label: t("updatedAt"),
      render: (row: RequestRow) => formatDateTime(row.resolvedAt || row.updatedAt || row.createdAt),
      sortValue: (row: RequestRow) => new Date(row.resolvedAt || row.updatedAt || row.createdAt).getTime()
    }
  ];

  const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <Stack direction="row" spacing={2} alignItems="flex-start">
      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 140 }}>
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Stack>
  );

  return (
    <Page title={t("publicationRequests")} subtitle={t("publicationRequestsSubtitle")}>
      <Box sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_, next) => setTab(next)}>
          <Tab
            label={
              <Stack direction="row" spacing={1} alignItems="center">
                <span>{t("pending")}</span>
                <Chip size="small" label={formatBadge(pendingCount)} color="warning" />
              </Stack>
            }
          />
          <Tab
            label={
              <Stack direction="row" spacing={1} alignItems="center">
                <span>{t("history")}</span>
                <Chip size="small" label={formatBadge(historyCount)} />
              </Stack>
            }
          />
        </Tabs>
      </Box>

      <FiltersBar>
        <SearchField value={search} onChange={setSearch} placeholder={t("searchRequests")} />
      </FiltersBar>

      {isLoading ? (
        <LoadingState rows={6} />
      ) : rows.length === 0 ? (
        <EmptyState title={t("requestsEmpty")} subtitle={t("requestsEmptySubtitle")} />
      ) : (
        <DataTable
          rows={rows}
          columns={scope === "pending" ? pendingColumns : historyColumns}
          sortIconVariant="chevron"
          onRowClick={(row) => setDetailsTarget(row)}/>
      )}

      <PaginationBar
        page={meta.page}
        pageSize={meta.pageSize}
        total={meta.total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      <Dialog open={!!detailsTarget} onClose={() => setDetailsTarget(null)} fullWidth maxWidth="sm">
        <DialogTitle>{t("requestDetails")}</DialogTitle>
        <DialogContent>
          {detailsTarget && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <DetailRow label={t("title")} value={detailsTarget.title || t("file")} />
              {detailsTarget.description ? (
                <DetailRow label={t("description")} value={detailsTarget.description} />
              ) : null}
              <DetailRow
                label={t("user")}
                value={detailsTarget.createdBy?.fullName || detailsTarget.createdBy?.login || "-"}
              />
              <DetailRow label={t("login")} value={detailsTarget.createdBy?.login || "-"} />
              <DetailRow label={t("department")} value={detailsTarget.createdBy?.department || "-"} />
              <DetailRow
                label={t("section")}
                value={
                  detailsTarget.sectionId
                    ? sectionTitleById.get(detailsTarget.sectionId) || `#${detailsTarget.sectionId}`
                    : "-"
                }
              />
              <DetailRow
                label={t("category")}
                value={detailsTarget.categoryId ? renderPath(getCategoryPath(detailsTarget.categoryId)) : "-"}
              />
              <DetailRow label={t("access")} value={accessChip(detailsTarget.accessType)} />
              <DetailRow label={t("status")} value={statusChip(detailsTarget.status)} />
              <CommentBlock label={t("commentFromUser")} value={detailsTarget.comment} tone="user" />
              <CommentBlock label={t("commentFromAdmin")} value={getAdminComment(detailsTarget)} tone="admin" />
              <DetailRow
                label={t("availableLanguages")}
                value={
                  detailsTarget.availableLangs && detailsTarget.availableLangs.length > 0 ? (
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {detailsTarget.availableLangs.map((lang) => (
                        <Chip key={lang} size="small" label={lang.toUpperCase()} />
                      ))}
                    </Stack>
                  ) : (
                    "-"
                  )
                }
              />
              <DetailRow label={t("createdAt")} value={formatDateTime(detailsTarget.createdAt)} />
              <DetailRow
                label={t("assets")}
                value={
                  assetsLoading ? (
                    <Typography variant="body2" color="text.secondary">
                      {t("loading")}
                    </Typography>
                  ) : assets.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      {t("noAssets")}
                    </Typography>
                  ) : (
                    <Stack spacing={1}>
                      {assets.map((asset: any) => (
                        <Stack key={asset.id} direction="row" spacing={2} alignItems="center">
                          <Chip size="small" label={asset.lang?.toUpperCase() || "-"} />
                          <Typography variant="body2">{asset.originalName || "-"}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {asset.size ? formatBytes(asset.size) : "-"}
                          </Typography>
                          <Tooltip title={t("download")}>
                            <IconButton
                              size="small"
                              onClick={() =>
                                detailsTarget &&
                                downloadMutation.mutate({
                                  requestId: detailsTarget.id,
                                  assetId: asset.id,
                                  filename: asset.originalName
                                })
                              }
                            >
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      ))}
                    </Stack>
                  )
                }
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsTarget(null)}>{t("cancel")}</Button>
          {detailsTarget?.status === "pending" && (
            <>
              <Button
                variant="contained"
                onClick={() => detailsTarget && approveMutation.mutate(detailsTarget.id)}
                disabled={approveMutation.isPending}
              >
                {t("approve")}
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={() => detailsTarget && openReject(detailsTarget)}
                disabled={rejectMutation.isPending}
              >
                {t("reject")}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      <Dialog open={!!rejectTarget} onClose={() => setRejectTarget(null)} fullWidth maxWidth="sm">
        <DialogTitle>{t("reject")}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {rejectTarget?.title || t("file")}
            </Typography>
            <TextField
              label={t("rejectReason")}
              placeholder={t("rejectReasonHint")}
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              multiline
              minRows={3}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectTarget(null)}>{t("cancel")}</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() =>
              rejectTarget &&
              rejectMutation.mutate({ id: rejectTarget.id, reason: rejectReason.trim() || null })
            }
            disabled={rejectMutation.isPending}
          >
            {t("reject")}
          </Button>
        </DialogActions>
      </Dialog>
    </Page>
  );
}
