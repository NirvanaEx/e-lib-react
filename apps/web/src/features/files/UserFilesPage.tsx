import React from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import StarIcon from "@mui/icons-material/Star";
import PublicIcon from "@mui/icons-material/Public";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import CloseIcon from "@mui/icons-material/Close";
import ViewListIcon from "@mui/icons-material/ViewList";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import BalanceOutlinedIcon from "@mui/icons-material/BalanceOutlined";
import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";
import FlightOutlinedIcon from "@mui/icons-material/FlightOutlined";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import GridViewOutlinedIcon from "@mui/icons-material/GridViewOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addUserFavorite,
  downloadUserFile,
  downloadUserFileVersion,
  fetchMenu,
  fetchUserFavorites,
  fetchUserFile,
  fetchUserFileVersions,
  fetchUserFiles,
  removeUserFavorite
} from "./files.api";
import { DataTable } from "../../shared/ui/DataTable";
import { Page } from "../../shared/ui/Page";
import { EmptyState } from "../../shared/ui/EmptyState";
import { LoadingState } from "../../shared/ui/LoadingState";
import { FiltersBar } from "../../shared/ui/FiltersBar";
import { PaginationBar } from "../../shared/ui/PaginationBar";
import { useTranslation } from "react-i18next";
import { formatBytes } from "../../shared/utils/format";
import { formatDateTime } from "../../shared/utils/date";
import { getFilenameFromDisposition } from "../../shared/utils/download";
import { getErrorMessage } from "../../shared/utils/errors";
import { useSearchParams } from "react-router-dom";
import { useToast } from "../../shared/ui/ToastProvider";
import { formatUserLabel } from "../../shared/utils/userLabel";
import { sharedLibraryTableLayout } from "./fileTableLayout";
import { formatPath } from "../../shared/utils/tree";
import { LibraryIcon } from "../../shared/ui/iconLibrary";
import { FileTypeBadge, accessChipSx, extOf } from "./fileVisuals";

const sectionIcons = [
  BalanceOutlinedIcon,
  AccountBalanceOutlinedIcon,
  FlightOutlinedIcon,
  ArticleOutlinedIcon,
  MenuBookOutlinedIcon,
  DescriptionOutlinedIcon
];
const sectionTones = ["#2563eb", "#7c3aed", "#0ea5e9", "#0d9488", "#d97706", "#db2777"];

export default function UserFilesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const search = searchParams.get("q") || "";
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [sort, setSort] = React.useState<{ key: string | null; direction: "asc" | "desc" | null }>({
    key: null,
    direction: null
  });
  const [viewMode, setViewMode] = React.useState<"table" | "cards">(() => {
    const stored = localStorage.getItem("shared-library-view");
    return stored === "table" ? "table" : "cards";
  });
  const muiTheme = useTheme();
  const lgUp = useMediaQuery(muiTheme.breakpoints.up("lg"));
  const [detailsTab, setDetailsTab] = React.useState<"about" | "versions">("about");
  const [downloadTarget, setDownloadTarget] = React.useState<{
    id: number;
    title: string | null;
    langs: string[];
    sizes: Record<string, number>;
  } | null>(null);
  const [detailsId, setDetailsId] = React.useState<number | null>(null);
  const [favoriteOverrides, setFavoriteOverrides] = React.useState<Record<string, boolean>>({});
  const sectionId = Number(searchParams.get("sectionId") || 0) || undefined;
  const categoryId = Number(searchParams.get("categoryId") || 0) || undefined;
  const sectionIds = searchParams.get("sectionIds") || undefined;
  const categoryIds = searchParams.get("categoryIds") || undefined;
  const departmentIds = searchParams.get("departmentIds") || undefined;

  React.useEffect(() => {
    setPage(1);
  }, [search, pageSize, sort.key, sort.direction, sectionId, categoryId, sectionIds, categoryIds, departmentIds]);

  React.useEffect(() => {
    localStorage.setItem("shared-library-view", viewMode);
  }, [viewMode]);

  React.useEffect(() => {
    setDetailsTab("about");
  }, [detailsId]);

  const resetFilters = () => {
    setSort({ key: null, direction: null });
    setPage(1);
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const setSectionFilter = (nextSectionId: number | null) => {
    const params = new URLSearchParams(searchParams);
    if (nextSectionId) {
      params.set("sectionId", String(nextSectionId));
    } else {
      params.delete("sectionId");
    }
    setSearchParams(params, { replace: true });
  };

  const { data, isLoading } = useQuery({
    queryKey: [
      "user-files",
      page,
      pageSize,
      search,
      sort.key,
      sort.direction,
      sectionId,
      categoryId,
      sectionIds,
      categoryIds,
      departmentIds
    ],
    queryFn: () =>
      fetchUserFiles({
        page,
        pageSize,
        q: search,
        sortBy: sort.direction ? sort.key || undefined : undefined,
        sortDir: sort.direction || undefined,
        sectionId,
        categoryId,
        sectionIds,
        categoryIds,
        departmentIds
      })
  });
  const { data: favoritesData } = useQuery({
    queryKey: ["user-favorites", "ids"],
    queryFn: () => fetchUserFavorites({ page: 1, pageSize: 1000 })
  });
  const { data: detailsData, isLoading: detailsLoading } = useQuery({
    queryKey: ["user-file-details", detailsId],
    queryFn: () => fetchUserFile(detailsId as number),
    enabled: !!detailsId
  });
  const allowVersionAccess = detailsData?.allowVersionAccess ?? true;
  const { data: versionsData, isLoading: versionsLoading } = useQuery({
    queryKey: ["user-file-versions", detailsId],
    queryFn: () => fetchUserFileVersions(detailsId as number),
    enabled: Boolean(detailsId && detailsData && allowVersionAccess)
  });
  const { data: menuData } = useQuery({ queryKey: ["user-menu-all"], queryFn: () => fetchMenu() });

  const rows = data?.data || [];
  const meta = data?.meta || { page, pageSize, total: 0 };
  const favoriteIds = React.useMemo(() => {
    if (!favoritesData?.data) return null;
    return new Set(favoritesData.data.map((item: any) => Number(item.id)));
  }, [favoritesData]);
  const displayRows = React.useMemo(() => {
    return rows.map((row: any) => {
      const id = Number(row.id);
      const override = favoriteOverrides[String(id)];
      if (override !== undefined) {
        return { ...row, isFavorite: override };
      }
      const isFavorite = favoriteIds ? favoriteIds.has(id) || Boolean(row.isFavorite) : Boolean(row.isFavorite);
      return { ...row, isFavorite };
    });
  }, [rows, favoriteIds, favoriteOverrides]);

  React.useEffect(() => {
    if (!favoriteIds) return;
    setFavoriteOverrides((prev) => {
      let changed = false;
      const next: Record<string, boolean> = {};
      for (const [key, value] of Object.entries(prev)) {
        const id = Number(key);
        if (favoriteIds.has(id) !== value) {
          next[key] = value;
        } else {
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [favoriteIds]);
  const sections = menuData?.sections || [];
  const categories = menuData?.categories || [];
  const sectionsById = React.useMemo(() => new Map(sections.map((item: any) => [item.id, item])), [sections]);
  const categoriesById = React.useMemo(() => new Map(categories.map((item: any) => [item.id, item])), [categories]);
  const formatSectionLabel = (sectionId: number) => sectionsById.get(sectionId)?.title || `#${sectionId}`;
  const translations = detailsData?.translations || [];
  const assets = detailsData?.assets || [];
  const accessDepartments = detailsData?.accessDepartments || [];
  const accessUsers = detailsData?.accessUsers || [];
  const showAccessLists = detailsData?.accessType && detailsData.accessType !== "public";
  const showAccessUsers = detailsData?.accessType === "restricted";
  const versions = versionsData?.data || [];
  const currentLang = (i18n.language || "ru").split("-")[0];
  const translationsSorted = React.useMemo(() => {
    const items = [...translations];
    return items.sort((a: any, b: any) => {
      const aCurrent = a.lang === currentLang;
      const bCurrent = b.lang === currentLang;
      if (aCurrent && !bCurrent) return -1;
      if (!aCurrent && bCurrent) return 1;
      return String(a.lang).localeCompare(String(b.lang));
    });
  }, [translations, currentLang]);
  const assetsSorted = React.useMemo(() => {
    const items = [...assets];
    return items.sort((a: any, b: any) => {
      const aCurrent = a.lang === currentLang;
      const bCurrent = b.lang === currentLang;
      if (aCurrent && !bCurrent) return -1;
      if (!aCurrent && bCurrent) return 1;
      return String(a.lang).localeCompare(String(b.lang));
    });
  }, [assets, currentLang]);
  const downloadLangsSorted = React.useMemo(() => {
    if (!downloadTarget?.langs) return [];
    const items = [...downloadTarget.langs];
    return items.sort((a, b) => {
      const aCurrent = a === currentLang;
      const bCurrent = b === currentLang;
      if (aCurrent && !bCurrent) return -1;
      if (!aCurrent && bCurrent) return 1;
      return a.localeCompare(b);
    });
  }, [downloadTarget, currentLang]);
  const titleForLang = (lang?: string | null) => {
    if (!lang) return detailsData?.title || "file";
    return translations.find((item: any) => item.lang === lang)?.title || detailsData?.title || "file";
  };
  const titleForVersionLang = (version: any, lang?: string | null) => {
    const versionTranslations = version?.translations || [];
    if (lang) {
      return (
        versionTranslations.find((item: any) => item.lang === lang)?.title ||
        versionTranslations.find((item: any) => item.lang === currentLang)?.title ||
        detailsData?.title ||
        "file"
      );
    }
    return versionTranslations.find((item: any) => item.lang === currentLang)?.title || detailsData?.title || "file";
  };
  const descriptionForVersion = (version: any) => {
    const versionTranslations = version?.translations || [];
    return (
      versionTranslations.find((item: any) => item.lang === currentLang)?.description ||
      versionTranslations.find((item: any) => item.lang === "ru")?.description ||
      versionTranslations[0]?.description ||
      null
    );
  };

  const getCategoryPath = (id: number) => {
    const segments: string[] = [];
    let current = categoriesById.get(id);
    while (current) {
      segments.unshift(current.title || `#${current.id}`);
      current = current.parentId ? categoriesById.get(current.parentId) : null;
    }
    return segments.length ? segments : [`#${id}`];
  };

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

  const downloadMutation = useMutation({
    mutationFn: ({ id, lang }: { id: number; lang?: string | null; title?: string | null }) =>
      downloadUserFile(id, lang || undefined),
    onSuccess: (response, variables) => {
      const blob = response.data;
      const filename =
        getFilenameFromDisposition(response.headers?.["content-disposition"]) ||
        `${variables.title || "file"}${variables.lang ? `_${variables.lang.toUpperCase()}` : ""}`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  });

  const downloadVersionMutation = useMutation({
    mutationFn: ({ id, versionId, lang }: { id: number; versionId: number; lang?: string | null; title?: string | null }) =>
      downloadUserFileVersion(id, versionId, lang || undefined),
    onSuccess: (response, variables) => {
      const blob = response.data;
      const filename =
        getFilenameFromDisposition(response.headers?.["content-disposition"]) ||
        `${variables.title || "file"}${variables.lang ? `_${variables.lang.toUpperCase()}` : ""}`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  });

  const updateFavoriteCaches = (id: number, nextValue: boolean) => {
    const updateRows = (data: any, removeWhenFalse = false) => {
      if (!data?.data) return data;
      const updated = data.data
        .map((item: any) => (Number(item.id) === id ? { ...item, isFavorite: nextValue } : item))
        .filter((item: any) => !(removeWhenFalse && !item.isFavorite));
      return { ...data, data: updated };
    };
    queryClient.setQueriesData({ queryKey: ["user-files"] }, (data) => updateRows(data));
    queryClient.setQueriesData({ queryKey: ["user-my-files"] }, (data) => updateRows(data));
    queryClient.setQueriesData({ queryKey: ["user-favorites"] }, (data) => updateRows(data, true));
  };

  const favoriteMutation = useMutation({
    mutationFn: ({ id, isFavorite }: { id: number; isFavorite: boolean }) =>
      isFavorite ? removeUserFavorite(id) : addUserFavorite(id),
    onMutate: ({ id, isFavorite }) => {
      updateFavoriteCaches(id, !isFavorite);
      const key = String(id);
      const previousOverride = favoriteOverrides[key];
      setFavoriteOverrides((prev) => ({ ...prev, [key]: !isFavorite }));
      return { id, previousOverride };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user-files"] });
      queryClient.invalidateQueries({ queryKey: ["user-favorites"] });
      queryClient.invalidateQueries({ queryKey: ["user-my-files"] });
      showToast({
        message: variables.isFavorite ? t("favoriteRemoved") : t("favoriteAdded"),
        severity: "success"
      });
    },
    onError: (error, _variables, context) => {
      if (context) {
        setFavoriteOverrides((prev) => {
          const next = { ...prev };
          const key = String(context.id);
          if (context.previousOverride === undefined) {
            delete next[key];
          } else {
            next[key] = context.previousOverride;
          }
          return next;
        });
      }
      queryClient.invalidateQueries({ queryKey: ["user-files"] });
      queryClient.invalidateQueries({ queryKey: ["user-favorites"] });
      queryClient.invalidateQueries({ queryKey: ["user-my-files"] });
      showToast({ message: getErrorMessage(error, t("actionFailed")), severity: "error" });
    }
  });


  const resolveRowSize = (row: any) => {
    const sizes = row.availableAssetSizes || [];
    const currentLang = (i18n.language || "ru").split("-")[0];
    const direct = sizes.find((item: any) => item.lang === currentLang)?.size;
    if (direct !== undefined) return direct;
    if (sizes.length === 1) return sizes[0].size;
    return row.currentAssetSize ?? null;
  };

  const getAccessLabel = (accessType: string) =>
    accessType === "restricted"
      ? t("accessRestricted")
      : accessType === "department_closed"
      ? t("accessDepartmentClosed")
      : t("accessPublic");
  const accessIcon = (accessType: string, align: "center" | "start" = "center") => (
    <Tooltip title={getAccessLabel(accessType)}>
      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: align === "start" ? "flex-start" : "center",
          width: align === "start" ? "auto" : "100%"
        }}
      >
        {accessType === "public" ? (
          <PublicIcon fontSize="small" sx={{ color: "success.main" }} />
        ) : (
          <GroupOutlinedIcon
            fontSize="small"
            sx={{ color: accessType === "department_closed" ? "info.main" : "warning.main" }}
          />
        )}
      </Box>
    </Tooltip>
  );

  const isDownloadable = (row: any) => {
    const langs = row.availableAssetLangs || row.availableLangs || [];
    return Boolean(row.canDownload) && langs.length > 0;
  };

  const renderStatusIcons = (row: any, variant: "table" | "card" = "table") => {
    const items: Array<{ key: string; node: React.ReactNode }> = [];

    items.push({
      key: "favorite",
      node: (
        <Tooltip title={t("favorites")}>
          <IconButton
            size="small"
            onClick={(event) => {
              event.stopPropagation();
              favoriteMutation.mutate({ id: row.id, isFavorite: Boolean(row.isFavorite) });
            }}
          >
            {row.isFavorite ? (
              <StarIcon fontSize="small" sx={{ color: "warning.main" }} />
            ) : (
              <StarBorderIcon fontSize="small" sx={{ color: "text.disabled" }} />
            )}
          </IconButton>
        </Tooltip>
      )
    });

    if (!isDownloadable(row)) {
      const tooltip = row.canDownload ? t("noAssets") : t("noAccess");
      items.push({
        key: "lock",
        node: (
          <Tooltip title={tooltip}>
            <Box sx={{ display: "inline-flex", alignItems: "center" }}>
              <LockOutlinedIcon sx={{ fontSize: 16, display: "block" }} color="action" />
            </Box>
          </Tooltip>
        )
      });
    }

    if (!items.length) return null;

    const justifyContent = variant === "card" ? "flex-end" : "center";
    const width = variant === "card" ? "auto" : "100%";

    return (
      <Stack direction="row" spacing={0.5} alignItems="center" justifyContent={justifyContent} sx={{ width }}>
        {items.map((item) => (
          <Box key={item.key} sx={{ display: "inline-flex", alignItems: "center" }}>
            {item.node}
          </Box>
        ))}
      </Stack>
    );
  };

  const activeRow = React.useMemo(
    () => displayRows.find((row: any) => Number(row.id) === detailsId) || null,
    [displayRows, detailsId]
  );

  const startDownload = (row: any) => {
    const langs = row.availableAssetLangs || row.availableLangs || [];
    if (!langs.length) return;
    if (langs.length > 1) {
      const sizes = (row.availableAssetSizes || []).reduce<Record<string, number>>(
        (acc: Record<string, number>, item: any) => {
          acc[item.lang] = item.size;
          return acc;
        },
        {}
      );
      setDownloadTarget({ id: row.id, title: row.title, langs, sizes });
      return;
    }
    downloadMutation.mutate({ id: row.id, lang: langs[0], title: row.title });
  };

  const infoRow = (label: string, value: React.ReactNode) => (
    <Box sx={{ display: "grid", gridTemplateColumns: "128px 1fr", columnGap: 1.5, alignItems: "start" }}>
      <Typography variant="body2" color="text.secondary">
        {label}:
      </Typography>
      <Box sx={{ minWidth: 0 }}>
        {typeof value === "string" ? <Typography variant="body2">{value}</Typography> : value}
      </Box>
    </Box>
  );

  const renderDetailsPanel = () => (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ p: 2, pb: 1.5 }}>
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 700, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {detailsData?.title || activeRow?.title || t("file")}
        </Typography>
        {activeRow && (
          <Tooltip title={t("favorites")}>
            <IconButton
              size="small"
              onClick={() => favoriteMutation.mutate({ id: activeRow.id, isFavorite: Boolean(activeRow.isFavorite) })}
            >
              {activeRow.isFavorite ? (
                <StarIcon fontSize="small" sx={{ color: "warning.main" }} />
              ) : (
                <StarBorderIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        )}
        {activeRow && isDownloadable(activeRow) && (
          <Tooltip title={t("download")}>
            <IconButton size="small" onClick={() => startDownload(activeRow)}>
              <DownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <IconButton size="small" onClick={() => setDetailsId(null)}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>
      <Tabs
        value={detailsTab}
        onChange={(_event, value) => setDetailsTab(value)}
        sx={{
          px: 1,
          borderBottom: "1px solid var(--border)",
          minHeight: 40,
          "& .MuiTab-root": { minHeight: 40, textTransform: "none", fontWeight: 600 }
        }}
      >
        <Tab value="about" label={t("aboutDocument")} />
        {allowVersionAccess ? <Tab value="versions" label={t("archiveVersions")} /> : null}
      </Tabs>
      <Box sx={{ p: 2, overflow: "auto", flex: 1, minHeight: 0 }}>
        {detailsLoading ? (
          <Typography variant="body2" color="text.secondary">
            {t("loading")}
          </Typography>
        ) : detailsTab === "about" ? (
          <Stack spacing={1.75}>
            {infoRow(t("title"), detailsData?.title || "-")}
            {infoRow(t("section"), activeRow?.sectionId ? formatSectionLabel(activeRow.sectionId) : "-")}
            {infoRow(t("category"), activeRow?.categoryId ? formatPath(getCategoryPath(activeRow.categoryId)) : "-")}
            {infoRow(t("currentVersion"), detailsData?.currentVersionNumber ? `#${detailsData.currentVersionNumber}` : "-")}
            {infoRow(
              t("languages"),
              assetsSorted.length === 0 ? (
                "-"
              ) : (
                <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap", rowGap: 0.5 }}>
                  {assetsSorted.map((asset: any) => (
                    <Chip
                      key={asset.id}
                      size="small"
                      label={asset.lang.toUpperCase()}
                      color={asset.lang === currentLang ? "primary" : "default"}
                      variant={asset.lang === currentLang ? "filled" : "outlined"}
                    />
                  ))}
                </Stack>
              )
            )}
            {infoRow(
              t("fileLabel"),
              assetsSorted.length === 0 ? (
                "-"
              ) : (
                <Stack spacing={1}>
                  {assetsSorted.map((asset: any) => (
                    <Stack
                      key={asset.id}
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      onClick={() =>
                        downloadMutation.mutate({
                          id: detailsId as number,
                          lang: asset.lang,
                          title: titleForLang(asset.lang)
                        })
                      }
                      sx={{ cursor: "pointer", "&:hover .file-name": { textDecoration: "underline" } }}
                    >
                      <FileTypeBadge ext={extOf(asset.original_name)} small />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          className="file-name"
                          variant="body2"
                          sx={{
                            color: "primary.main",
                            fontWeight: 600,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap"
                          }}
                        >
                          {asset.original_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatBytes(asset.size)}
                        </Typography>
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              )
            )}
            {infoRow(t("owner"), detailsData?.createdBy ? formatUserLabel(detailsData.createdBy) : "-")}
            {infoRow(
              t("access"),
              <Chip
                size="small"
                label={getAccessLabel(detailsData?.accessType || "public")}
                sx={{ fontWeight: 700, ...accessChipSx(detailsData?.accessType || "public") }}
              />
            )}
            {showAccessLists && (
              <Stack spacing={1}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {t("departments")}
                  </Typography>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5, rowGap: 0.5 }}>
                    {accessDepartments.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        -
                      </Typography>
                    ) : (
                      accessDepartments.map((dept: any) => (
                        <Chip key={dept.id} size="small" label={dept.path || dept.name} />
                      ))
                    )}
                  </Stack>
                </Box>
                {showAccessUsers && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {t("users")}
                    </Typography>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5, rowGap: 0.5 }}>
                      {accessUsers.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                          -
                        </Typography>
                      ) : (
                        accessUsers.map((item: any) => (
                          <Chip key={item.id} size="small" label={formatUserLabel(item)} />
                        ))
                      )}
                    </Stack>
                  </Box>
                )}
              </Stack>
            )}
            {infoRow(t("description"), detailsData?.description || "-")}
          </Stack>
        ) : versionsLoading ? (
          <Typography variant="body2" color="text.secondary">
            {t("loading")}
          </Typography>
        ) : versions.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t("noHistory")}
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {versions.map((version: any) => (
              <Paper key={version.id} variant="outlined" sx={{ p: 1.5, borderRadius: "8px" }}>
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip size="small" label={`v${version.versionNumber}`} />
                    {detailsData?.currentVersionId === version.id && (
                      <Chip size="small" color="success" label={t("current")} />
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {formatDateTime(version.createdAt)}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {t("createdBy")}: {version.createdBy ? formatUserLabel(version.createdBy) : "-"}
                  </Typography>
                  <Typography variant="body2">{titleForVersionLang(version)}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {descriptionForVersion(version) || "-"}
                  </Typography>
                  {(version.assets || []).length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      {t("noAssets")}
                    </Typography>
                  ) : (
                    (version.assets || []).map((asset: any) => (
                      <Stack key={asset.id} direction="row" spacing={1} alignItems="center">
                        <Chip size="small" label={asset.lang.toUpperCase()} />
                        <Typography
                          variant="body2"
                          sx={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        >
                          {asset.originalName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatBytes(asset.size)}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() =>
                            downloadVersionMutation.mutate({
                              id: detailsId as number,
                              versionId: version.id,
                              lang: asset.lang,
                              title: titleForVersionLang(version, asset.lang)
                            })
                          }
                        >
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    ))
                  )}
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );

  return (
    <Page title={t("sharedLibrary")} subtitle={t("userFilesSubtitle")}>
      {sections.length > 0 && (
        <Box
          sx={{
            display: "grid",
            gap: 1.5,
            mb: 2,
            gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(auto-fill, minmax(160px, 1fr))" }
          }}
        >
          {[{ id: null, title: t("allSections") }, ...sections].map((section: any, index: number) => {
            const FallbackIcon = section.id === null ? GridViewOutlinedIcon : sectionIcons[(index - 1) % sectionIcons.length];
            const tone =
              section.id === null ? "#475569" : section.iconColor || sectionTones[(index - 1) % sectionTones.length];
            const active = section.id === null ? !sectionId : section.id === sectionId;
            return (
              <Paper
                key={section.id ?? "all"}
                onClick={() => setSectionFilter(section.id)}
                sx={{
                  p: 1.5,
                  borderRadius: "10px",
                  cursor: "pointer",
                  border: "1px solid",
                  borderColor: active ? "primary.main" : "var(--border)",
                  backgroundColor: active ? "rgba(37, 99, 235, 0.06)" : "var(--surface)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 1.25,
                  transition: "border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease",
                  "&:hover": {
                    borderColor: "primary.main",
                    transform: "translateY(-2px)",
                    boxShadow: "0 10px 20px rgba(15, 42, 90, 0.08)"
                  }
                }}
              >
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    borderRadius: "8px",
                    display: "grid",
                    placeItems: "center",
                    backgroundColor: `${tone}1a`,
                    color: tone
                  }}
                >
                  <LibraryIcon name={section.icon} fallback={FallbackIcon} fontSize="small" />
                </Box>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden"
                  }}
                >
                  {section.title || `#${section.id}`}
                </Typography>
              </Paper>
            );
          })}
        </Box>
      )}

      <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
      <FiltersBar
        actions={
          <ToggleButtonGroup
            size="small"
            exclusive
            value={viewMode}
            onChange={(_event, value) => value && setViewMode(value)}
          >
            <ToggleButton value="cards" aria-label={t("viewCards")}>
              <Tooltip title={t("viewCards")}>
                <ViewModuleIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="table" aria-label={t("viewTable")}>
              <Tooltip title={t("viewTable")}>
                <ViewListIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
        }
      >
        <Select
          size="small"
          value={sort.direction && sort.key ? `${sort.key}:${sort.direction}` : "updated_at:desc"}
          onChange={(event) => {
            const [key, direction] = String(event.target.value).split(":");
            setSort({ key, direction: direction as "asc" | "desc" });
          }}
          sx={{ minWidth: 190, backgroundColor: "var(--surface)", borderRadius: "8px" }}
        >
          <MenuItem value="updated_at:desc">{t("sortDateNew")}</MenuItem>
          <MenuItem value="updated_at:asc">{t("sortDateOld")}</MenuItem>
          <MenuItem value="title:asc">{t("sortTitleAsc")}</MenuItem>
          <MenuItem value="title:desc">{t("sortTitleDesc")}</MenuItem>
        </Select>
        <Tooltip title={t("resetFilters")}>
          <span>
            <IconButton size="small" onClick={resetFilters}>
              <RestartAltIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </FiltersBar>

      {isLoading ? (
        <LoadingState rows={6} />
      ) : displayRows.length === 0 ? (
        <EmptyState title={t("noFiles")} subtitle={t("noFilesSubtitle")} />
      ) : viewMode === "table" ? (
        <DataTable
          rows={displayRows}
          onRowClick={(row) => {
            if (!isDownloadable(row)) return;
            setDetailsId(row.id);
          }}
          sort={sort}
          onSortChange={(key, direction) =>
            setSort(direction ? { key, direction } : { key: null, direction: null })
          }
          sortIconVariant="chevron"
          tableLayout="fixed"
          containerSx={{ overflow: "hidden" }}
          columns={[
            {
              key: "status",
              label: "",
              align: "center",
              sortable: false,
              ...sharedLibraryTableLayout.status,
              render: (row) => renderStatusIcons(row)
            },
            {
              key: "title",
              label: t("title"),
              sortable: true,
              sortKey: "title",
              ...sharedLibraryTableLayout.title,
              render: (row) => (
                <Box component="span" sx={{ color: "text.primary" }}>
                  {row.title || t("file")}
                </Box>
              )
            },
            {
              key: "section",
              label: t("section"),
              ...sharedLibraryTableLayout.section,
              render: (row) => {
                const item = row.sectionId ? sectionsById.get(row.sectionId) : null;
                return item?.title || (row.sectionId ? `#${row.sectionId}` : "-");
              }
            },
            {
              key: "category",
              label: t("category"),
              ...sharedLibraryTableLayout.category,
              render: (row) => (row.categoryId ? renderPath(getCategoryPath(row.categoryId)) : "-"),
              sortable: true,
              sortKey: "category",
            },
            {
              key: "accessType",
              label: t("access"),
              align: "center",
              ...sharedLibraryTableLayout.accessType,
              render: (row) => accessIcon(row.accessType)
            },
            {
              key: "langs",
              label: t("languages"),
              ...sharedLibraryTableLayout.langs,
              render: (row) => {
                const langs = row.availableAssetLangs || row.availableLangs || [];
                if (langs.length === 0) return "-";
                return (
                  <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 0.5 }}>
                    {langs.map((lang: string) => (
                      <Chip key={lang} size="small" label={lang.toUpperCase()} />
                    ))}
                  </Stack>
                );
              }
            },
            {
              key: "size",
              label: t("fileSize"),
              ...sharedLibraryTableLayout.size,
              render: (row) => {
                const size = resolveRowSize(row);
                return size === null || size === undefined ? "-" : formatBytes(size);
              },
              sortable: true,
              sortKey: "size"
            },
            {
              key: "updatedAt",
              label: t("updatedAt"),
              ...sharedLibraryTableLayout.updatedAt,
              render: (row) => formatDateTime(row.updatedAt),
              sortable: true,
              sortKey: "updated_at"
            },
            {
              key: "download",
              label: t("download"),
              align: "center",
              ...sharedLibraryTableLayout.download,
              render: (row) => {
                const langs = row.availableAssetLangs || row.availableLangs || [];
                if (!isDownloadable(row)) return "-";
                const sizes = (row.availableAssetSizes || []).reduce<Record<string, number>>((acc: Record<string, number>, item: any) => {
                  acc[item.lang] = item.size;
                  return acc;
                }, {});
                return (
                  <Tooltip title={t("download")}>
                    <span>
                      <IconButton
                        size="small"
                        color="primary"
                        sx={{ backgroundColor: "rgba(37, 99, 235, 0.12)" }}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (langs.length > 1) {
                            setDownloadTarget({ id: row.id, title: row.title, langs, sizes });
                            return;
                          }
                          const lang = langs[0];
                          downloadMutation.mutate({ id: row.id, lang, title: row.title });
                        }}
                      >
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                );
              }
            }
          ]}
        />
      ) : (
        <Stack spacing={1.25}>
          {displayRows.map((row: any) => {
            const langs = row.availableAssetLangs || row.availableLangs || [];
            const size = resolveRowSize(row);
            const canOpen = isDownloadable(row);
            const metaParts = [
              row.sectionId ? formatSectionLabel(row.sectionId) : null,
              size === null || size === undefined ? null : formatBytes(size),
              formatDateTime(row.updatedAt)
            ].filter(Boolean);
            return (
              <Paper
                key={row.id}
                onClick={() => {
                  if (!canOpen) return;
                  setDetailsId(row.id);
                }}
                sx={{
                  p: { xs: 1.5, md: 2 },
                  borderRadius: "10px",
                  border: "1px solid",
                  borderColor: detailsId === row.id ? "primary.main" : "var(--border)",
                  backgroundColor: detailsId === row.id ? "rgba(37, 99, 235, 0.04)" : "var(--surface)",
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  flexWrap: "wrap",
                  cursor: canOpen ? "pointer" : "default",
                  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                  "&:hover": canOpen
                    ? { borderColor: "primary.main", boxShadow: "0 10px 20px rgba(15, 42, 90, 0.08)" }
                    : undefined
                }}
              >
                <FileTypeBadge ext={(row.availableAssetExts || [])[0]} />
                <Box sx={{ flex: 1, minWidth: 220 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                    >
                      {row.title || t("file")}
                    </Typography>
                    <Chip
                      size="small"
                      label={getAccessLabel(row.accessType)}
                      sx={{ fontWeight: 700, flexShrink: 0, ...accessChipSx(row.accessType) }}
                    />
                  </Stack>
                  <Typography variant="body2" color="text.secondary" noWrap sx={{ mt: 0.25 }}>
                    {metaParts.join(" • ")}
                  </Typography>
                  <Stack direction="row" spacing={0.75} sx={{ mt: 0.75, flexWrap: "wrap", rowGap: 0.5 }}>
                    {row.categoryId ? (
                      <Chip
                        size="small"
                        label={formatPath(getCategoryPath(row.categoryId))}
                        sx={{ backgroundColor: "var(--surface-2)", fontWeight: 600 }}
                      />
                    ) : null}
                    {langs.map((lang: string) => (
                      <Chip key={lang} size="small" variant="outlined" label={lang.toUpperCase()} />
                    ))}
                  </Stack>
                </Box>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  onClick={(event) => event.stopPropagation()}
                  sx={{ ml: "auto" }}
                >
                  {renderStatusIcons(row, "card")}
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<VisibilityOutlinedIcon />}
                    disabled={!canOpen}
                    onClick={() => setDetailsId(row.id)}
                    sx={{ borderRadius: "8px" }}
                  >
                    {t("view")}
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    disabled={!canOpen}
                    onClick={() => startDownload(row)}
                    sx={{ borderRadius: "8px", boxShadow: "none" }}
                  >
                    {t("download")}
                  </Button>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}

      <PaginationBar
        page={meta.page}
        pageSize={meta.pageSize}
        total={meta.total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
      </Box>

      {lgUp && detailsId ? (
        <Paper
          sx={{
            width: 400,
            flexShrink: 0,
            position: "sticky",
            top: 88,
            maxHeight: "calc(100vh - 112px)",
            borderRadius: "10px",
            border: "1px solid var(--border)",
            backgroundColor: "var(--surface)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden"
          }}
        >
          {renderDetailsPanel()}
        </Paper>
      ) : null}
      </Box>

      <Drawer
        anchor="right"
        open={Boolean(detailsId) && !lgUp}
        onClose={() => setDetailsId(null)}
        PaperProps={{ sx: { width: { xs: "100%", sm: 420 } } }}
      >
        {renderDetailsPanel()}
      </Drawer>

      <Dialog open={!!downloadTarget} onClose={() => setDownloadTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>{t("download")}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5}>
            {downloadLangsSorted.map((lang) => (
              <Button
                key={lang}
                variant="outlined"
                onClick={() => {
                  downloadMutation.mutate({ id: downloadTarget!.id, lang, title: downloadTarget?.title });
                  setDownloadTarget(null);
                }}
                sx={{ justifyContent: "space-between" }}
              >
                <span>{lang.toUpperCase()}</span>
                <Typography variant="caption" color="text.secondary">
                  {formatBytes(downloadTarget?.sizes?.[lang] || 0)}
                </Typography>
              </Button>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDownloadTarget(null)}>{t("cancel")}</Button>
        </DialogActions>
      </Dialog>

    </Page>
  );
}
