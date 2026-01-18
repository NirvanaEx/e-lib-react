import React from "react";
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import DeleteIcon from "@mui/icons-material/Delete";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import StarIcon from "@mui/icons-material/Star";
import PublicIcon from "@mui/icons-material/Public";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Page } from "../../shared/ui/Page";
import { DataTable } from "../../shared/ui/DataTable";
import { PaginationBar } from "../../shared/ui/PaginationBar";
import { FiltersBar } from "../../shared/ui/FiltersBar";
import { SearchField } from "../../shared/ui/SearchField";
import { EmptyState } from "../../shared/ui/EmptyState";
import { LoadingState } from "../../shared/ui/LoadingState";
import { ConfirmDialog } from "../../shared/ui/ConfirmDialog";
import { TranslationsEditor } from "../../shared/ui/TranslationsEditor";
import { useToast } from "../../shared/ui/ToastProvider";
import { useAuth } from "../../shared/hooks/useAuth";
import { formatDateTime } from "../../shared/utils/date";
import { formatBytes } from "../../shared/utils/format";
import { getFilenameFromDisposition } from "../../shared/utils/download";
import { buildPathMap, formatPath } from "../../shared/utils/tree";
import { getErrorMessage } from "../../shared/utils/errors";
import {
  addUserFavorite,
  cancelUserRequest,
  createUserRequest,
  downloadUserFile,
  fetchMenu,
  fetchMyFiles,
  fetchUserFavorites,
  fetchUserRequests,
  removeUserFavorite,
  uploadUserRequestAsset
} from "./files.api";

const requestSchema = z.object({
  sectionId: z.number().min(1),
  categoryId: z.number().min(1),
  accessType: z.enum(["public", "restricted"]),
  accessDepartmentIds: z.array(z.number()).default([]),
  accessUserIds: z.array(z.number()).default([]),
  comment: z.string().optional()
});

type RequestForm = z.infer<typeof requestSchema>;
type TranslationRow = { lang: "ru" | "en" | "uz"; title: string; description?: string | null };
type AssetRow = { lang: "ru" | "en" | "uz"; file: File | null };

const languageOptions: Array<TranslationRow["lang"]> = ["ru", "en", "uz"];

export default function UserLibraryPage({ view }: { view: "requests" | "files" | "favorites" }) {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canSubmitFiles = Boolean(user?.canSubmitFiles);
  const [requestsTab, setRequestsTab] = React.useState(0);
  const [requestsPage, setRequestsPage] = React.useState(1);
  const [requestsPageSize, setRequestsPageSize] = React.useState(20);
  const [requestsSearch, setRequestsSearch] = React.useState("");
  const [myFilesPage, setMyFilesPage] = React.useState(1);
  const [myFilesPageSize, setMyFilesPageSize] = React.useState(20);
  const [favoritesPage, setFavoritesPage] = React.useState(1);
  const [favoritesPageSize, setFavoritesPageSize] = React.useState(20);
  const [searchFiles, setSearchFiles] = React.useState("");
  const [sortFiles, setSortFiles] = React.useState<{ key: string | null; direction: "asc" | "desc" | null }>({
    key: null,
    direction: null
  });
  const [downloadTarget, setDownloadTarget] = React.useState<{
    id: number;
    title: string | null;
    langs: string[];
    sizes: Record<string, number>;
  } | null>(null);
  const [submitOpen, setSubmitOpen] = React.useState(false);
  const [initialLang, setInitialLang] = React.useState<TranslationRow["lang"]>("ru");
  const [initialFile, setInitialFile] = React.useState<File | null>(null);
  const [extraAssets, setExtraAssets] = React.useState<AssetRow[]>([]);
  const [translations, setTranslations] = React.useState<TranslationRow[]>([]);
  const [cancelTarget, setCancelTarget] = React.useState<{ id: number; title?: string | null } | null>(null);
  const [requestDetails, setRequestDetails] = React.useState<any | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const requestDefaults: RequestForm = React.useMemo(
    () => ({
      sectionId: 0,
      categoryId: 0,
      accessType: "restricted",
      accessDepartmentIds: user?.departmentId ? [user.departmentId] : [],
      accessUserIds: [],
      comment: ""
    }),
    [user?.departmentId]
  );

  const requestForm = useForm<RequestForm>({
    resolver: zodResolver(requestSchema),
    defaultValues: requestDefaults
  });

  const isRequestsView = view === "requests";
  const isFavoritesView = view === "favorites";
  const isFilesView = view === "files";

  React.useEffect(() => {
    if (!isRequestsView) return;
    setRequestsPage(1);
  }, [isRequestsView, requestsTab, requestsPageSize, requestsSearch]);

  React.useEffect(() => {
    if (!isRequestsView) {
      setRequestDetails(null);
    }
  }, [isRequestsView]);

  React.useEffect(() => {
    if (!isFilesView) return;
    setMyFilesPage(1);
  }, [isFilesView, myFilesPageSize, searchFiles, sortFiles.key, sortFiles.direction]);

  React.useEffect(() => {
    if (!isFavoritesView) return;
    setFavoritesPage(1);
  }, [isFavoritesView, favoritesPageSize, searchFiles, sortFiles.key, sortFiles.direction]);

  const { data: menuData } = useQuery({ queryKey: ["user-menu-all"], queryFn: () => fetchMenu() });
  const sections = menuData?.sections || [];
  const categories = menuData?.categories || [];
  const sectionsById = React.useMemo(() => new Map(sections.map((item: any) => [item.id, item])), [sections]);
  const categoriesById = React.useMemo(() => new Map(categories.map((item: any) => [item.id, item])), [categories]);

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

  const requestsScope = requestsTab === 0 ? "pending" : "history";
  const { data: requestsData, isLoading: requestsLoading } = useQuery({
    queryKey: ["user-requests", requestsScope, requestsPage, requestsPageSize, requestsSearch],
    queryFn: () =>
      fetchUserRequests({ page: requestsPage, pageSize: requestsPageSize, scope: requestsScope, q: requestsSearch }),
    enabled: isRequestsView
  });

  const { data: pendingRequestsCountData } = useQuery({
    queryKey: ["user-requests-count", "pending", requestsSearch],
    queryFn: () => fetchUserRequests({ page: 1, pageSize: 1, scope: "pending", q: requestsSearch }),
    enabled: isRequestsView
  });

  const { data: historyRequestsCountData } = useQuery({
    queryKey: ["user-requests-count", "history", requestsSearch],
    queryFn: () => fetchUserRequests({ page: 1, pageSize: 1, scope: "history", q: requestsSearch }),
    enabled: isRequestsView
  });

  const { data: myFilesData, isLoading: myFilesLoading } = useQuery({
    queryKey: ["user-my-files", myFilesPage, myFilesPageSize, searchFiles, sortFiles.key, sortFiles.direction],
    queryFn: () =>
      fetchMyFiles({
        page: myFilesPage,
        pageSize: myFilesPageSize,
        q: searchFiles,
        sortBy: sortFiles.direction ? sortFiles.key || undefined : undefined,
        sortDir: sortFiles.direction || undefined
      }),
    enabled: isFilesView
  });

  const { data: favoritesData, isLoading: favoritesLoading } = useQuery({
    queryKey: ["user-favorites", favoritesPage, favoritesPageSize, searchFiles, sortFiles.key, sortFiles.direction],
    queryFn: () =>
      fetchUserFavorites({
        page: favoritesPage,
        pageSize: favoritesPageSize,
        q: searchFiles,
        sortBy: sortFiles.direction ? sortFiles.key || undefined : undefined,
        sortDir: sortFiles.direction || undefined
      }),
    enabled: isFavoritesView
  });

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
  const getCategoryOptionPath = (id: number) => categoryPathById.get(id) || [`#${id}`];
  const sortedCategories = React.useMemo(() => {
    const items = [...categories];
    return items.sort((a: any, b: any) =>
      formatPath(getCategoryOptionPath(a.id)).localeCompare(formatPath(getCategoryOptionPath(b.id)), undefined, {
        numeric: true,
        sensitivity: "base"
      })
    );
  }, [categories, getCategoryOptionPath]);

  const sortedSections = React.useMemo(() => {
    const items = [...sections];
    return items.sort((a: any, b: any) =>
      (a.title || `#${a.id}`).localeCompare(b.title || `#${b.id}`, undefined, {
        numeric: true,
        sensitivity: "base"
      })
    );
  }, [sections]);

  const requestRows = requestsData?.data || [];
  const requestMeta = requestsData?.meta || { page: requestsPage, pageSize: requestsPageSize, total: 0 };
  const pendingRequestsCount = pendingRequestsCountData?.meta?.total ?? 0;
  const historyRequestsCount = historyRequestsCountData?.meta?.total ?? 0;
  const formatBadge = (count: number) => (count > 9 ? "9+" : String(count));

  const myFilesRows = myFilesData?.data || [];
  const myFilesMeta = myFilesData?.meta || { page: myFilesPage, pageSize: myFilesPageSize, total: 0 };
  const favoritesRows = favoritesData?.data || [];
  const favoritesMeta = favoritesData?.meta || { page: favoritesPage, pageSize: favoritesPageSize, total: 0 };

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
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user-files"] });
      queryClient.invalidateQueries({ queryKey: ["user-my-files"] });
      queryClient.invalidateQueries({ queryKey: ["user-favorites"] });
      showToast({
        message: variables.isFavorite ? t("favoriteRemoved") : t("favoriteAdded"),
        severity: "success"
      });
    },
    onError: (error) => {
      queryClient.invalidateQueries({ queryKey: ["user-files"] });
      queryClient.invalidateQueries({ queryKey: ["user-my-files"] });
      queryClient.invalidateQueries({ queryKey: ["user-favorites"] });
      showToast({ message: getErrorMessage(error, t("actionFailed")), severity: "error" });
    }
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => cancelUserRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-requests"] });
      setCancelTarget(null);
      showToast({ message: t("requestCancelled"), severity: "success" });
    },
    onError: (error) => showToast({ message: getErrorMessage(error, t("actionFailed")), severity: "error" })
  });

  const createMutation = useMutation({ mutationFn: createUserRequest });

  const handleOpenSubmit = () => {
    requestForm.reset(requestDefaults);
    setTranslations([{ lang: "ru", title: "", description: "" }]);
    setInitialFile(null);
    setInitialLang("ru");
    setExtraAssets([]);
    setSubmitOpen(true);
  };

  const handleCloseSubmit = () => {
    setSubmitOpen(false);
    requestForm.reset(requestDefaults);
    setInitialLang("ru");
    setInitialFile(null);
    setExtraAssets([]);
    setTranslations([]);
  };

  const addExtraAsset = () => {
    const used = new Set([initialLang, ...extraAssets.map((item) => item.lang)]);
    const nextLang = languageOptions.find((lang) => !used.has(lang)) || "ru";
    setExtraAssets((prev) => [...prev, { lang: nextLang, file: null }]);
  };

  const handleSubmitRequest = requestForm.handleSubmit(async (values) => {
    setSubmitting(true);
    if (!initialFile) {
      showToast({ message: t("fileRequired"), severity: "error" });
      setSubmitting(false);
      return;
    }
    if (!values.sectionId) {
      showToast({ message: t("selectSectionError"), severity: "error" });
      setSubmitting(false);
      return;
    }
    if (!values.categoryId) {
      showToast({ message: t("selectCategoryError"), severity: "error" });
      setSubmitting(false);
      return;
    }

    const normalizedTranslations = translations
      .map((item) => ({
        lang: item.lang,
        title: (item.title || "").trim(),
        description: (item.description || "").trim() || null
      }))
      .filter((item) => item.title.length > 0);

    if (normalizedTranslations.length === 0) {
      showToast({ message: t("translationsRequired"), severity: "error" });
      setSubmitting(false);
      return;
    }

    const extraWithFile = extraAssets.filter((item) => item.file);
    if (extraWithFile.length !== extraAssets.length) {
      showToast({ message: t("selectFileForLang"), severity: "error" });
      setSubmitting(false);
      return;
    }
    const usedLangs = new Set([initialLang]);
    for (const item of extraWithFile) {
      if (usedLangs.has(item.lang)) {
        showToast({ message: t("languageDuplicate"), severity: "error" });
        setSubmitting(false);
        return;
      }
      usedLangs.add(item.lang);
    }

    try {
      const payload = {
        sectionId: Number(values.sectionId),
        categoryId: Number(values.categoryId),
        accessType: values.accessType,
        accessDepartmentIds: values.accessType === "restricted" ? values.accessDepartmentIds : [],
        accessUserIds: values.accessType === "restricted" ? values.accessUserIds : [],
        translations: normalizedTranslations,
        comment: values.comment?.trim() || null
      };

      const result = await createMutation.mutateAsync(payload);
      const requestId = result.id;
      if (requestId) {
        const form = new FormData();
        form.append("lang", initialLang);
        form.append("file", initialFile);
        await uploadUserRequestAsset(requestId, form);
        for (const item of extraWithFile) {
          const extraForm = new FormData();
          extraForm.append("lang", item.lang);
          extraForm.append("file", item.file as File);
          await uploadUserRequestAsset(requestId, extraForm);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["user-requests"] });
      setSubmitOpen(false);
      showToast({ message: t("requestCreated"), severity: "success" });
    } catch (error) {
      showToast({ message: getErrorMessage(error, t("actionFailed")), severity: "error" });
    } finally {
      setSubmitting(false);
    }
  });

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

  const getAdminComment = (row: any) => row?.adminComment ?? row?.rejectionReason ?? null;

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

  const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <Stack direction="row" spacing={2} alignItems="flex-start">
      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 140 }}>
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Stack>
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

  const resolveRowSize = (row: any) => {
    const sizes = row.availableAssetSizes || [];
    const currentLang = (i18n.language || "ru").split("-")[0];
    const direct = sizes.find((item: any) => item.lang === currentLang)?.size;
    if (direct !== undefined) return direct;
    if (sizes.length === 1) return sizes[0].size;
    return row.currentAssetSize ?? null;
  };

  const isDownloadable = (row: any) => {
    const langs = row.availableAssetLangs || row.availableLangs || [];
    return Boolean(row.canDownload) && langs.length > 0;
  };

  const resetFilesFilters = () => {
    setSearchFiles("");
    setSortFiles({ key: null, direction: null });
    setMyFilesPage(1);
    setFavoritesPage(1);
  };

  const downloadLangsSorted = React.useMemo(() => {
    if (!downloadTarget?.langs) return [];
    const currentLang = (i18n.language || "ru").split("-")[0];
    const items = [...downloadTarget.langs];
    return items.sort((a, b) => {
      const aCurrent = a === currentLang;
      const bCurrent = b === currentLang;
      if (aCurrent && !bCurrent) return -1;
      if (!aCurrent && bCurrent) return 1;
      return a.localeCompare(b);
    });
  }, [downloadTarget, i18n.language]);

  const fileRows = isFavoritesView ? favoritesRows : myFilesRows;
  const fileMeta = isFavoritesView ? favoritesMeta : myFilesMeta;
  const fileLoading = isFavoritesView ? favoritesLoading : myFilesLoading;
  const fileEmptyTitle = isFavoritesView ? t("favoritesEmpty") : t("noFiles");
  const fileEmptySubtitle = isFavoritesView ? t("favoritesEmptySubtitle") : t("noFilesSubtitle");

  return (
    <Page
      title={isRequestsView ? t("requests") : isFavoritesView ? t("favorites") : t("myUploadedFiles")}
      subtitle={t("myLibrarySubtitle")}
      action={
        isRequestsView && canSubmitFiles ? (
          <Button variant="contained" onClick={handleOpenSubmit}>
            {t("submitForPublication")}
          </Button>
        ) : undefined
      }
    >
      {isRequestsView ? (
        <Box>
          <Box sx={{ mb: 2 }}>
            <Tabs value={requestsTab} onChange={(_, next) => setRequestsTab(next)}>
              <Tab
                label={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <span>{t("pending")}</span>
                    <Chip size="small" label={formatBadge(pendingRequestsCount)} color="warning" />
                  </Stack>
                }
              />
              <Tab
                label={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <span>{t("history")}</span>
                    <Chip size="small" label={formatBadge(historyRequestsCount)} />
                  </Stack>
                }
              />
            </Tabs>
          </Box>

          <FiltersBar>
            <SearchField value={requestsSearch} onChange={setRequestsSearch} placeholder={t("searchRequests")} />
          </FiltersBar>

          {requestsLoading ? (
            <LoadingState rows={6} />
          ) : requestRows.length === 0 ? (
            <EmptyState title={t("requestsEmpty")} subtitle={t("requestsEmptySubtitle")} />
          ) : (
            <DataTable
              rows={requestRows}
              sortIconVariant="chevron"
              onRowClick={(row) => setRequestDetails(row)}
              columns={[
                {
                  key: "title",
                  label: t("title"),
                  render: (row) => row.title || t("file"),
                  sortValue: (row) => row.title || "",
                  minWidth: 300
                },
                {
                  key: "section",
                  label: t("section"),
                  render: (row) => {
                    const item = row.sectionId ? sectionsById.get(row.sectionId) : null;
                    return item?.title || (row.sectionId ? `#${row.sectionId}` : "-");
                  },
                  minWidth: 120,
                  sortValue: (row) => {
                    const item = row.sectionId ? sectionsById.get(row.sectionId) : null;
                    return item?.title || (row.sectionId ? `#${row.sectionId}` : "");
                  }
                },
                {
                  key: "category",
                  label: t("category"),
                  render: (row) => (row.categoryId ? renderPath(getCategoryPath(row.categoryId)) : "-"),
                  sortValue: (row) => (row.categoryId ? getCategoryPath(row.categoryId).join(" / ") : ""),
                  minWidth: 260
                },
                {
                  key: "accessType",
                  label: t("access"),
                  align: "center",
                  width: 48,
                  render: (row) => accessIcon(row.accessType),
                  sortValue: (row) => row.accessType
                },
                {
                  key: "status",
                  label: t("status"),
                  render: (row) => statusChip(row.status),
                  sortValue: (row) => row.status,
                  width: 120
                },
                {
                  key: "createdAt",
                  label: t("createdAt"),
                  render: (row) => formatDateTime(row.createdAt),
                  sortValue: (row) => new Date(row.createdAt).getTime(),
                  width: 120
                },
                {
                  key: "updatedAt",
                  label: t("updatedAt"),
                  render: (row) => formatDateTime(row.updatedAt || row.resolvedAt),
                  sortValue: (row) => new Date(row.updatedAt || row.resolvedAt || row.createdAt).getTime(),
                  width: 120
                },
                {
                  key: "actions",
                  label: t("actions"),
                  align: "right",
                  sortable: false,
                  width: 140,
                  render: (row) =>
                    row.status === "pending" ? (
                      <Button
                        size="small"
                        color="error"
                        onClick={(event) => {
                          event.stopPropagation();
                          setCancelTarget({ id: row.id, title: row.title });
                        }}
                      >
                        {t("cancelRequest")}
                      </Button>
                    ) : (
                      "-"
                    )
                }
              ]}
            />
          )}

          <PaginationBar
            page={requestMeta.page}
            pageSize={requestMeta.pageSize}
            total={requestMeta.total}
            onPageChange={setRequestsPage}
            onPageSizeChange={setRequestsPageSize}
          />
        </Box>
      ) : (
        <Box>
          <FiltersBar>
            <SearchField value={searchFiles} onChange={setSearchFiles} placeholder={t("searchFiles")} />
            <Tooltip title={t("resetFilters")}>
              <span>
                <IconButton size="small" onClick={resetFilesFilters}>
                  <RestartAltIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </FiltersBar>

          {fileLoading ? (
            <LoadingState rows={6} />
          ) : fileRows.length === 0 ? (
            <EmptyState title={fileEmptyTitle} subtitle={fileEmptySubtitle} />
          ) : (
            <DataTable
              rows={fileRows}
              sort={sortFiles}
              onSortChange={(key, direction) =>
                setSortFiles(direction ? { key, direction } : { key: null, direction: null })
              }
              sortIconVariant="chevron"
              columns={[
                {
                  key: "favorite",
                  label: "",
                  align: "center",
                  sortable: false,
                  width: 32,
                  headerSx: { pl: 1, pr: 0.25 },
                  cellSx: { pl: 1.5, pr: 0.25 },
                  render: (row) => (
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
                },
                {
                  key: "lock",
                  label: "",
                  align: "left",
                  sortable: false,
                  width: 32,
                  headerSx: { pl: 0.5, pr: 0.25 },
                  cellSx: { pl: 0.5, pr: 0.25 },
                  render: (row) => {
                    if (isDownloadable(row)) return null;
                    const tooltip = row.canDownload ? t("noAssets") : t("noAccess");
                    return (
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-start", width: "100%" }}>
                        <Tooltip title={tooltip}>
                          <Box component="span" sx={{ display: "inline-flex", alignItems: "center" }}>
                            <LockOutlinedIcon sx={{ fontSize: 16, display: "block" }} color="action" />
                          </Box>
                        </Tooltip>
                      </Box>
                    );
                  }
                },
                {
                  key: "title",
                  label: t("title"),
                  sortable: true,
                  sortKey: "title",
                  minWidth: 320,
                  render: (row) => (
                    <Box component="span" sx={{ color: "text.primary" }}>
                      {row.title || t("file")}
                    </Box>
                  )
                },
                {
                  key: "section",
                  label: t("section"),
                  minWidth: 120,
                  render: (row) => {
                    const item = row.sectionId ? sectionsById.get(row.sectionId) : null;
                    return item?.title || (row.sectionId ? `#${row.sectionId}` : "-");
                  }
                },
                {
                  key: "category",
                  label: t("category"),
                  render: (row) => (row.categoryId ? renderPath(getCategoryPath(row.categoryId)) : "-"),
                  sortable: true,
                  sortKey: "category",
                  minWidth: 280
                },
                {
                  key: "accessType",
                  label: t("access"),
                  align: "center",
                  width: 48,
                  render: (row) => (
                    <Tooltip title={row.accessType === "restricted" ? t("accessRestricted") : t("accessPublic")}>
                      <Box sx={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
                        {row.accessType === "restricted" ? (
                          <GroupOutlinedIcon fontSize="small" sx={{ color: "warning.main" }} />
                        ) : (
                          <PublicIcon fontSize="small" sx={{ color: "success.main" }} />
                        )}
                      </Box>
                    </Tooltip>
                  )
                },
                {
                  key: "langs",
                  label: t("languages"),
                  minWidth: 100,
                  render: (row) => {
                    const langs = row.availableAssetLangs || row.availableLangs || [];
                    return (
                      <Stack direction="row" spacing={1}>
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
                  width: 80,
                  render: (row) => {
                    const size = resolveRowSize(row);
                    return size === null || size === undefined ? "-" : formatBytes(size);
                  },
                  sortable: true,
                  sortKey: "size"
                },
                {
                  key: "createdAt",
                  label: t("createdAt"),
                  width: 120,
                  render: (row) => formatDateTime(row.createdAt),
                  sortable: true,
                  sortKey: "created_at"
                },
                {
                  key: "updatedAt",
                  label: t("updatedAt"),
                  width: 120,
                  render: (row) => formatDateTime(row.updatedAt),
                  sortable: true,
                  sortKey: "updated_at"
                },
                {
                  key: "download",
                  label: t("download"),
                  align: "center",
                  width: 56,
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
                            sx={{ backgroundColor: "rgba(29, 77, 79, 0.12)" }}
                            onClick={() => {
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
          )}

          <PaginationBar
            page={fileMeta.page}
            pageSize={fileMeta.pageSize}
            total={fileMeta.total}
            onPageChange={isFavoritesView ? setFavoritesPage : setMyFilesPage}
            onPageSizeChange={isFavoritesView ? setFavoritesPageSize : setMyFilesPageSize}
          />
        </Box>
      )}

      <Dialog open={!!requestDetails} onClose={() => setRequestDetails(null)} fullWidth maxWidth="sm">
        <DialogTitle>{t("requestDetails")}</DialogTitle>
        <DialogContent>
          {requestDetails && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <DetailRow label={t("title")} value={requestDetails.title || t("file")} />
              <DetailRow label={t("status")} value={statusChip(requestDetails.status)} />
              <DetailRow label={t("access")} value={accessIcon(requestDetails.accessType)} />
              <CommentBlock label={t("commentFromUser")} value={requestDetails.comment} tone="user" />
              <CommentBlock label={t("commentFromAdmin")} value={getAdminComment(requestDetails)} tone="admin" />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRequestDetails(null)}>{t("cancel")}</Button>
        </DialogActions>
      </Dialog>

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

      <Dialog open={submitOpen} onClose={handleCloseSubmit} fullWidth maxWidth="md">
        <DialogTitle>{t("submitForPublication")}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Controller
              control={requestForm.control}
              name="sectionId"
              render={({ field }) => (
                <Autocomplete
                  options={sortedSections}
                  getOptionLabel={(option: any) => option.title || `#${option.id}`}
                  renderOption={(props, option: any) => {
                    const { key, ...optionProps } = props;
                    return (
                      <li key={option.id} {...optionProps}>
                        {option.title || `#${option.id}`}
                      </li>
                    );
                  }}
                  value={sortedSections.find((section: any) => section.id === field.value) || null}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  onChange={(_, value) => field.onChange(value ? value.id : 0)}
                  renderInput={(params) => <TextField {...params} label={t("section")} required />}
                />
              )}
            />
            <Controller
              control={requestForm.control}
              name="categoryId"
              render={({ field }) => (
                <Autocomplete
                  options={sortedCategories}
                  getOptionLabel={(option: any) => formatPath(getCategoryOptionPath(option.id))}
                  renderOption={(props, option: any) => {
                    const { key, ...optionProps } = props;
                    return (
                      <li key={option.id} {...optionProps}>
                        {renderPath(getCategoryOptionPath(option.id))}
                      </li>
                    );
                  }}
                  value={sortedCategories.find((cat: any) => cat.id === field.value) || null}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  onChange={(_, value) => field.onChange(value ? value.id : 0)}
                  renderInput={(params) => <TextField {...params} label={t("category")} required />}
                />
              )}
            />
            <Controller
              control={requestForm.control}
              name="accessType"
              render={({ field }) => (
                <TextField select label={t("access")} value={field.value} onChange={(event) => field.onChange(event.target.value)}>
                  <MenuItem value="public">{t("accessPublic")}</MenuItem>
                  <MenuItem value="restricted">{t("accessRestricted")}</MenuItem>
                </TextField>
              )}
            />
            <TranslationsEditor
              value={translations}
              onChange={setTranslations}
              showDescription
              titleLabel={t("title")}
              descriptionLabel={t("description")}
              helperText={t("translationsHint")}
              requiredTitle
            />
            <Stack spacing={1}>
              <Typography variant="subtitle2">{t("file")} *</Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
                <TextField
                  select
                  label={t("language")}
                  value={initialLang}
                  onChange={(event) => setInitialLang(event.target.value as TranslationRow["lang"])}
                  sx={{ minWidth: 140 }}
                >
                  <MenuItem value="ru">RU</MenuItem>
                  <MenuItem value="en">EN</MenuItem>
                  <MenuItem value="uz">UZ</MenuItem>
                </TextField>
                <Button component="label" variant="outlined">
                  {t("selectFile")}
                  <input type="file" hidden onChange={(event) => setInitialFile(event.target.files?.[0] || null)} />
                </Button>
                <Typography variant="caption" color="text.secondary">
                  {initialFile ? initialFile.name : t("noFileSelected")}
                </Typography>
              </Stack>
            </Stack>
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle2">{t("additionalFiles")}</Typography>
                <Tooltip title={t("addLanguageFile")}>
                  <span>
                    <IconButton
                      size="small"
                      onClick={addExtraAsset}
                      sx={{ border: "1px dashed", borderColor: "divider", borderRadius: 2 }}
                    >
                      <AddCircleOutlineIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
              {extraAssets.map((item, index) => (
                <Stack
                  key={`${item.lang}-${index}`}
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  alignItems={{ sm: "center" }}
                >
                  <TextField
                    select
                    label={t("language")}
                    value={item.lang}
                    onChange={(event) => {
                      const next = event.target.value as TranslationRow["lang"];
                      setExtraAssets((prev) =>
                        prev.map((entry, idx) => (idx === index ? { ...entry, lang: next } : entry))
                      );
                    }}
                    sx={{ minWidth: 140 }}
                  >
                    {languageOptions.map((lang) => (
                      <MenuItem key={lang} value={lang}>
                        {lang.toUpperCase()}
                      </MenuItem>
                    ))}
                  </TextField>
                  <Button component="label" variant="outlined">
                    {t("selectFile")}
                    <input
                      type="file"
                      hidden
                      onChange={(event) => {
                        const file = event.target.files?.[0] || null;
                        setExtraAssets((prev) =>
                          prev.map((entry, idx) => (idx === index ? { ...entry, file } : entry))
                        );
                      }}
                    />
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    {item.file ? item.file.name : t("noFileSelected")}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => setExtraAssets((prev) => prev.filter((_, idx) => idx !== index))}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2,
                borderStyle: "dashed",
                backgroundColor: "rgba(29, 77, 79, 0.06)"
              }}
            >
              <Controller
                control={requestForm.control}
                name="comment"
                render={({ field }) => (
                  <TextField
                    label={t("commentForAdmin")}
                    multiline
                    minRows={3}
                    fullWidth
                    {...field}
                  />
                )}
              />
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSubmit}>{t("cancel")}</Button>
          <Button variant="contained" onClick={handleSubmitRequest} disabled={createMutation.isPending || submitting}>
            {t("submitRequest")}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!cancelTarget}
        title={t("cancelRequest")}
        description={t("cancelRequestConfirm")}
        confirmLabel={t("cancelRequest")}
        onConfirm={() => {
          if (cancelTarget) {
            cancelMutation.mutate(cancelTarget.id);
          }
        }}
        onCancel={() => setCancelTarget(null)}
      />
    </Page>
  );
}
