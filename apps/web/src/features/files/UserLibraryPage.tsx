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
  Drawer,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import DeleteIcon from "@mui/icons-material/Delete";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import StarIcon from "@mui/icons-material/Star";
import SystemUpdateAltOutlinedIcon from "@mui/icons-material/SystemUpdateAltOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import CloseIcon from "@mui/icons-material/Close";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Page } from "../../shared/ui/Page";
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
import { formatUserLabel } from "../../shared/utils/userLabel";
import { FileTypeBadge, accessChipSx, extOf } from "./fileVisuals";
import {
  addUserFavorite,
  cancelUserRequest,
  createUserRequest,
  createUserUpdateRequest,
  downloadUserFile,
  downloadUserFileVersion,
  fetchDepartmentFiles,
  fetchMenu,
  fetchMyFiles,
  fetchUserFile,
  fetchUserFileVersions,
  fetchUserFavorites,
  fetchUserRequests,
  removeUserFavorite,
  uploadUserRequestAsset
} from "./files.api";

const requestSchema = z.object({
  sectionId: z.number().min(1),
  categoryId: z.number().min(1),
  accessType: z.enum(["public", "restricted", "department_closed"]),
  accessDepartmentIds: z.array(z.number()).default([]),
  accessUserIds: z.array(z.number()).default([]),
  comment: z.string().optional()
});

type RequestForm = z.infer<typeof requestSchema>;
type TranslationRow = { lang: "ru" | "en" | "uz"; title: string; description?: string | null };
type AssetRow = { lang: "ru" | "en" | "uz"; file: File | null };

const languageOptions: Array<TranslationRow["lang"]> = ["ru", "en", "uz"];

export default function UserLibraryPage({ view }: { view: "requests" | "files" | "favorites" | "department" }) {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const navigate = useNavigate();
  const canSubmitFiles = Boolean(user?.canSubmitFiles);
  const [requestsTab, setRequestsTab] = React.useState(0);
  const [requestsPage, setRequestsPage] = React.useState(1);
  const [requestsPageSize, setRequestsPageSize] = React.useState(20);
  const [requestsSearch, setRequestsSearch] = React.useState("");
  const [myFilesPage, setMyFilesPage] = React.useState(1);
  const [myFilesPageSize, setMyFilesPageSize] = React.useState(20);
  const [departmentPage, setDepartmentPage] = React.useState(1);
  const [departmentPageSize, setDepartmentPageSize] = React.useState(20);
  const [favoritesPage, setFavoritesPage] = React.useState(1);
  const [favoritesPageSize, setFavoritesPageSize] = React.useState(20);
  const [searchFiles, setSearchFiles] = React.useState("");
  const [sortFiles, setSortFiles] = React.useState<{ key: string | null; direction: "asc" | "desc" | null }>({
    key: null,
    direction: null
  });
  const [downloadTarget, setDownloadTarget] = React.useState<{
    id: number;
    versionId?: number | null;
    title: string | null;
    langs: string[];
    sizes: Record<string, number>;
  } | null>(null);
  const [detailsId, setDetailsId] = React.useState<number | null>(null);
  const [detailsRow, setDetailsRow] = React.useState<any | null>(null);
  const [submitOpen, setSubmitOpen] = React.useState(false);
  const [submitMode, setSubmitMode] = React.useState<"new" | "update">("new");
  const [initialLang, setInitialLang] = React.useState<TranslationRow["lang"]>("ru");
  const [initialFile, setInitialFile] = React.useState<File | null>(null);
  const [extraAssets, setExtraAssets] = React.useState<AssetRow[]>([]);
  const [translations, setTranslations] = React.useState<TranslationRow[]>([]);
  const [updateTarget, setUpdateTarget] = React.useState<any | null>(null);
  const [updateDetails, setUpdateDetails] = React.useState<any | null>(null);
  const [updateComment, setUpdateComment] = React.useState("");
  const [updateLoading, setUpdateLoading] = React.useState(false);
  const [cancelTarget, setCancelTarget] = React.useState<{ id: number; title?: string | null } | null>(null);
  const [requestDetails, setRequestDetails] = React.useState<any | null>(null);
  const [updateInfoTarget, setUpdateInfoTarget] = React.useState<any | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [detailsTab, setDetailsTab] = React.useState<"about" | "versions">("about");
  const muiTheme = useTheme();
  const lgUp = useMediaQuery(muiTheme.breakpoints.up("lg"));

  React.useEffect(() => {
    setDetailsTab("about");
  }, [detailsId]);

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
  const isDepartmentView = view === "department";

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
    if (!isDepartmentView) return;
    setDepartmentPage(1);
  }, [isDepartmentView, departmentPageSize, searchFiles, sortFiles.key, sortFiles.direction]);

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

  const { data: departmentFilesData, isLoading: departmentFilesLoading } = useQuery({
    queryKey: [
      "user-department-files",
      departmentPage,
      departmentPageSize,
      searchFiles,
      sortFiles.key,
      sortFiles.direction
    ],
    queryFn: () =>
      fetchDepartmentFiles({
        page: departmentPage,
        pageSize: departmentPageSize,
        q: searchFiles,
        sortBy: sortFiles.direction ? sortFiles.key || undefined : undefined,
        sortDir: sortFiles.direction || undefined
      }),
    enabled: isDepartmentView
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
  const departmentRows = departmentFilesData?.data || [];
  const departmentMeta = departmentFilesData?.meta || { page: departmentPage, pageSize: departmentPageSize, total: 0 };
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

  const handleOpenNewRequest = () => {
    setSubmitMode("new");
    setUpdateTarget(null);
    setUpdateDetails(null);
    setUpdateComment("");
    requestForm.reset(requestDefaults);
    setTranslations([{ lang: "ru", title: "", description: "" }]);
    setInitialFile(null);
    setInitialLang("ru");
    setExtraAssets([]);
    setSubmitOpen(true);
  };

  const handleOpenUpdateRequest = async (row: any) => {
    setSubmitMode("update");
    setUpdateTarget(row);
    setUpdateComment("");
    setUpdateDetails(null);
    setTranslations([]);
    setInitialFile(null);
    setInitialLang("ru");
    setExtraAssets([]);
    setSubmitOpen(true);
    setUpdateLoading(true);
    try {
      const data = await fetchUserFile(row.id);
      setUpdateDetails(data);
      const nextTranslations = (data?.translations || []).map((item: any) => ({
        lang: item.lang,
        title: item.title,
        description: item.description
      }));
      setTranslations(nextTranslations.length ? nextTranslations : [{ lang: "ru", title: "", description: "" }]);
      setInitialLang(nextTranslations[0]?.lang || "ru");
    } catch (error) {
      showToast({ message: getErrorMessage(error, t("actionFailed")), severity: "error" });
      setSubmitOpen(false);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleCloseSubmit = () => {
    setSubmitOpen(false);
    setSubmitMode("new");
    setUpdateTarget(null);
    setUpdateDetails(null);
    setUpdateComment("");
    requestForm.reset(requestDefaults);
    setInitialLang("ru");
    setInitialFile(null);
    setExtraAssets([]);
    setTranslations([]);
  };

  const handleOpenDetails = (row: any) => {
    if (!row?.id) return;
    setDetailsId(Number(row.id));
    setDetailsRow(row);
  };

  const handleCloseDetails = () => {
    setDetailsId(null);
    setDetailsRow(null);
  };

  const addExtraAsset = () => {
    const used = new Set([initialLang, ...extraAssets.map((item) => item.lang)]);
    const nextLang = languageOptions.find((lang) => !used.has(lang)) || "ru";
    setExtraAssets((prev) => [...prev, { lang: nextLang, file: null }]);
  };

  const submitNewRequest = requestForm.handleSubmit(async (values) => {
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
      const allowDepartmentAccess = values.accessType !== "public";
      const allowUserAccess = values.accessType === "restricted";
      const payload = {
        sectionId: Number(values.sectionId),
        categoryId: Number(values.categoryId),
        accessType: values.accessType,
        accessDepartmentIds: allowDepartmentAccess ? values.accessDepartmentIds : [],
        accessUserIds: allowUserAccess ? values.accessUserIds : [],
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
      navigate("/users/my-library/requests");
    } catch (error) {
      showToast({ message: getErrorMessage(error, t("actionFailed")), severity: "error" });
    } finally {
      setSubmitting(false);
    }
  });

  const submitUpdateRequest = async () => {
    if (!updateTarget?.id) return;
    setSubmitting(true);
    if (!initialFile) {
      showToast({ message: t("fileRequired"), severity: "error" });
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
        translations: normalizedTranslations,
        comment: updateComment.trim() || null
      };

      const result = await createUserUpdateRequest(updateTarget.id, payload);
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
      navigate("/users/my-library/requests");
    } catch (error) {
      showToast({ message: getErrorMessage(error, t("actionFailed")), severity: "error" });
    } finally {
      setSubmitting(false);
    }
  };

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
    return (
      <Chip
        size="small"
        label={t("requestPending")}
        sx={{ backgroundColor: "rgba(37, 99, 235, 0.12)", color: "primary.main", fontWeight: 700 }}
      />
    );
  };

  const requestTypeLabel = (requestType?: string | null) =>
    requestType === "update" ? t("requestTypeUpdate") : t("requestTypeNew");

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
        borderRadius: "8px",
        borderLeft: "4px solid",
        borderLeftColor: tone === "user" ? "info.main" : "error.main",
        backgroundColor: tone === "user" ? "rgba(37, 99, 235, 0.06)" : "rgba(210, 47, 40, 0.08)"
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

  const getAccessLabel = (accessType: string) =>
    accessType === "restricted"
      ? t("accessRestricted")
      : accessType === "department_closed"
      ? t("accessDepartmentClosed")
      : t("accessPublic");
  const accessChip = (accessType: string) => (
    <Chip
      size="small"
      label={getAccessLabel(accessType)}
      sx={{ fontWeight: 700, flexShrink: 0, ...accessChipSx(accessType) }}
    />
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
    if (isFilesView && (row.ownVersionDeletedAt || row.ownVersionId == null)) return false;
    return Boolean(row.canDownload) && langs.length > 0;
  };

  const resetFilesFilters = () => {
    setSearchFiles("");
    setSortFiles({ key: null, direction: null });
    setMyFilesPage(1);
    setDepartmentPage(1);
    setFavoritesPage(1);
  };

  const startDownload = (row: any) => {
    const langs = row.availableAssetLangs || row.availableLangs || [];
    if (!langs.length) return;
    const versionId = isFilesView ? row.ownVersionId : undefined;
    if (langs.length > 1) {
      const sizes = (row.availableAssetSizes || []).reduce<Record<string, number>>(
        (acc: Record<string, number>, item: any) => {
          acc[item.lang] = item.size;
          return acc;
        },
        {}
      );
      setDownloadTarget({ id: row.id, versionId, title: row.title, langs, sizes });
      return;
    }
    const lang = langs[0];
    if (versionId) {
      downloadVersionMutation.mutate({ id: row.id, versionId, lang, title: row.title });
    } else {
      downloadMutation.mutate({ id: row.id, lang, title: row.title });
    }
  };

  const currentLang = (i18n.language || "ru").split("-")[0];
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

  const fileRows = isFavoritesView ? favoritesRows : isDepartmentView ? departmentRows : myFilesRows;
  const fileMeta = isFavoritesView ? favoritesMeta : isDepartmentView ? departmentMeta : myFilesMeta;
  const fileLoading = isFavoritesView ? favoritesLoading : isDepartmentView ? departmentFilesLoading : myFilesLoading;
  const fileEmptyTitle = isFavoritesView ? t("favoritesEmpty") : t("noFiles");
  const fileEmptySubtitle = isFavoritesView ? t("favoritesEmptySubtitle") : t("noFilesSubtitle");
  const detailsTranslations = detailsData?.translations || [];
  const detailsAssets = detailsData?.assets || [];
  const detailsAccessDepartments = detailsData?.accessDepartments || [];
  const detailsAccessUsers = detailsData?.accessUsers || [];
  const showAccessLists = detailsData?.accessType && detailsData.accessType !== "public";
  const showAccessUsers = detailsData?.accessType === "restricted";
  const versions = versionsData?.data || [];
  const detailsTranslationsSorted = React.useMemo(() => {
    const items = [...detailsTranslations];
    return items.sort((a: any, b: any) => {
      const aCurrent = a.lang === currentLang;
      const bCurrent = b.lang === currentLang;
      if (aCurrent && !bCurrent) return -1;
      if (!aCurrent && bCurrent) return 1;
      return String(a.lang).localeCompare(String(b.lang));
    });
  }, [detailsTranslations, currentLang]);
  const detailsAssetsSorted = React.useMemo(() => {
    const items = [...detailsAssets];
    return items.sort((a: any, b: any) => {
      const aCurrent = a.lang === currentLang;
      const bCurrent = b.lang === currentLang;
      if (aCurrent && !bCurrent) return -1;
      if (!aCurrent && bCurrent) return 1;
      return String(a.lang).localeCompare(String(b.lang));
    });
  }, [detailsAssets, currentLang]);
  const titleForLang = (lang?: string | null) => {
    if (!lang) return detailsData?.title || t("file");
    return detailsTranslations.find((item: any) => item.lang === lang)?.title || detailsData?.title || t("file");
  };
  const titleForVersionLang = (version: any, lang?: string | null) => {
    const versionTranslations = version?.translations || [];
    if (lang) {
      return (
        versionTranslations.find((item: any) => item.lang === lang)?.title ||
        versionTranslations.find((item: any) => item.lang === currentLang)?.title ||
        detailsData?.title ||
        t("file")
      );
    }
    return versionTranslations.find((item: any) => item.lang === currentLang)?.title || detailsData?.title || t("file");
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

  const renderRowStatusIcons = (row: any) => {
    const items: Array<{ key: string; node: React.ReactNode }> = [];

    if (isFilesView && row.ownVersionId == null) {
      items.push({
        key: "missing",
        node: (
          <Tooltip title={t("versionMissing")}>
            <Box sx={{ display: "inline-flex", alignItems: "center" }}>
              <HelpOutlineIcon fontSize="small" sx={{ color: "text.secondary" }} />
            </Box>
          </Tooltip>
        )
      });
    }

    if (isFilesView && row.ownVersionDeletedAt) {
      items.push({
        key: "deleted",
        node: (
          <Tooltip title={t("deleted")}>
            <Box sx={{ display: "inline-flex", alignItems: "center" }}>
              <DeleteOutlineIcon fontSize="small" sx={{ color: "text.secondary" }} />
            </Box>
          </Tooltip>
        )
      });
    }

    if (isFilesView && row.updatedByOther) {
      const updatedBy = row.updatedBy?.fullName || row.updatedBy?.login || "-";
      items.push({
        key: "warning",
        node: (
          <Tooltip title={t("fileUpdatedByOther", { user: updatedBy })}>
            <span>
              <IconButton
                size="small"
                onClick={(event) => {
                  event.stopPropagation();
                  setUpdateInfoTarget(row);
                }}
              >
                <WarningAmberOutlinedIcon fontSize="small" sx={{ color: "warning.main" }} />
              </IconButton>
            </span>
          </Tooltip>
        )
      });
    }

    if (isDepartmentView && canSubmitFiles) {
      items.push({
        key: "update",
        node: (
          <Tooltip title={t("updateFile")}>
            <span>
              <IconButton
                size="small"
                onClick={(event) => {
                  event.stopPropagation();
                  handleOpenUpdateRequest(row);
                }}
              >
                <SystemUpdateAltOutlinedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )
      });
    }

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

    if (!isDownloadable(row) && !(isFilesView && (row.ownVersionDeletedAt || row.ownVersionId == null))) {
      items.push({
        key: "lock",
        node: (
          <Tooltip title={row.canDownload ? t("noAssets") : t("noAccess")}>
            <Box sx={{ display: "inline-flex", alignItems: "center" }}>
              <LockOutlinedIcon sx={{ fontSize: 16, display: "block" }} color="action" />
            </Box>
          </Tooltip>
        )
      });
    }

    return (
      <Stack direction="row" spacing={0.5} alignItems="center">
        {items.map((item) => (
          <Box key={item.key} sx={{ display: "inline-flex", alignItems: "center" }}>
            {item.node}
          </Box>
        ))}
      </Stack>
    );
  };

  const rowPaperSx = (active: boolean, clickable: boolean) => ({
    p: { xs: 1.5, md: 2 },
    borderRadius: "10px",
    border: "1px solid",
    borderColor: active ? "primary.main" : "var(--border)",
    backgroundColor: active ? "rgba(37, 99, 235, 0.04)" : "var(--surface)",
    display: "flex",
    alignItems: "center",
    gap: 2,
    flexWrap: "wrap" as const,
    cursor: clickable ? "pointer" : "default",
    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
    "&:hover": clickable
      ? { borderColor: "primary.main", boxShadow: "0 10px 20px rgba(15, 42, 90, 0.08)" }
      : undefined
  });

  const renderFileRow = (row: any) => {
    const langs = row.availableAssetLangs || row.availableLangs || [];
    const size = resolveRowSize(row);
    const canOpen = isDownloadable(row);
    const missing = isFilesView && row.ownVersionId == null;
    const metaParts = [
      row.sectionId ? (sectionsById.get(row.sectionId) as any)?.title || `#${row.sectionId}` : null,
      size === null || size === undefined ? null : formatBytes(size),
      formatDateTime(row.updatedAt)
    ].filter(Boolean);
    return (
      <Paper
        key={row.id}
        onClick={() => {
          if (!canOpen) return;
          handleOpenDetails(row);
        }}
        sx={rowPaperSx(detailsId === row.id, canOpen)}
      >
        <FileTypeBadge ext={(row.availableAssetExts || [])[0]} />
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
            >
              {missing ? t("versionMissing") : row.title || t("file")}
            </Typography>
            {accessChip(row.accessType)}
            {isFilesView && row.ownVersionDeletedAt ? <Chip size="small" label={t("deleted")} /> : null}
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
          {renderRowStatusIcons(row)}
          <Button
            size="small"
            variant="outlined"
            startIcon={<VisibilityOutlinedIcon />}
            disabled={!canOpen}
            onClick={() => handleOpenDetails(row)}
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
  };

  const renderRequestRow = (row: any) => {
    const isUpdate = row.requestType === "update";
    const tone = isUpdate ? "#0ea5e9" : "#2563eb";
    const metaParts = [
      row.sectionId ? (sectionsById.get(row.sectionId) as any)?.title || `#${row.sectionId}` : null,
      row.categoryId ? formatPath(getCategoryPath(row.categoryId)) : null,
      formatDateTime(row.createdAt)
    ].filter(Boolean);
    return (
      <Paper key={row.id} onClick={() => setRequestDetails(row)} sx={rowPaperSx(false, true)}>
        <Box
          sx={{
            width: 46,
            height: 54,
            borderRadius: "10px",
            display: "grid",
            placeItems: "center",
            backgroundColor: `${tone}1a`,
            color: tone,
            flexShrink: 0
          }}
        >
          {isUpdate ? <SystemUpdateAltOutlinedIcon /> : <AddCircleOutlineIcon />}
        </Box>
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
            >
              {row.title || t("file")}
            </Typography>
            {statusChip(row.status)}
          </Stack>
          <Typography variant="body2" color="text.secondary" noWrap sx={{ mt: 0.25 }}>
            {metaParts.join(" • ")}
          </Typography>
          <Stack direction="row" spacing={0.75} sx={{ mt: 0.75, flexWrap: "wrap", rowGap: 0.5 }}>
            <Chip
              size="small"
              label={requestTypeLabel(row.requestType)}
              sx={{ backgroundColor: "var(--surface-2)", fontWeight: 600 }}
            />
            {accessChip(row.accessType)}
          </Stack>
        </Box>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          onClick={(event) => event.stopPropagation()}
          sx={{ ml: "auto" }}
        >
          {row.status === "pending" && (
            <Button
              size="small"
              color="error"
              variant="outlined"
              onClick={() => setCancelTarget({ id: row.id, title: row.title })}
              sx={{ borderRadius: "8px" }}
            >
              {t("cancelRequest")}
            </Button>
          )}
          <Button
            size="small"
            variant="outlined"
            startIcon={<VisibilityOutlinedIcon />}
            onClick={() => setRequestDetails(row)}
            sx={{ borderRadius: "8px" }}
          >
            {t("view")}
          </Button>
        </Stack>
      </Paper>
    );
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
          {detailsData?.title || detailsRow?.title || t("file")}
        </Typography>
        {detailsRow && (
          <Tooltip title={t("favorites")}>
            <IconButton
              size="small"
              onClick={() => favoriteMutation.mutate({ id: detailsRow.id, isFavorite: Boolean(detailsRow.isFavorite) })}
            >
              {detailsRow.isFavorite ? (
                <StarIcon fontSize="small" sx={{ color: "warning.main" }} />
              ) : (
                <StarBorderIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        )}
        {detailsRow && isDownloadable(detailsRow) && (
          <Tooltip title={t("download")}>
            <IconButton size="small" onClick={() => startDownload(detailsRow)}>
              <DownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <IconButton size="small" onClick={handleCloseDetails}>
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
            {infoRow(t("section"), detailsRow?.sectionId ? (sectionsById.get(detailsRow.sectionId) as any)?.title || `#${detailsRow.sectionId}` : "-")}
            {infoRow(t("category"), detailsRow?.categoryId ? formatPath(getCategoryPath(detailsRow.categoryId)) : "-")}
            {infoRow(t("currentVersion"), detailsData?.currentVersionNumber ? `#${detailsData.currentVersionNumber}` : "-")}
            {detailsRow?.updatedByOther
              ? infoRow(
                  t("updatedBy"),
                  `${detailsRow.updatedBy?.fullName || detailsRow.updatedBy?.login || "-"}`
                )
              : null}
            {infoRow(
              t("languages"),
              detailsAssetsSorted.length === 0 ? (
                "-"
              ) : (
                <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap", rowGap: 0.5 }}>
                  {detailsAssetsSorted.map((asset: any) => (
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
              detailsAssetsSorted.length === 0 ? (
                "-"
              ) : (
                <Stack spacing={1}>
                  {detailsAssetsSorted.map((asset: any) => (
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
            {infoRow(t("access"), accessChip(detailsData?.accessType || "public"))}
            {showAccessLists && (
              <Stack spacing={1}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {t("departments")}
                  </Typography>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5, rowGap: 0.5 }}>
                    {detailsAccessDepartments.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        -
                      </Typography>
                    ) : (
                      detailsAccessDepartments.map((dept: any) => (
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
                      {detailsAccessUsers.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                          -
                        </Typography>
                      ) : (
                        detailsAccessUsers.map((item: any) => (
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
    <Page
      title={
        isRequestsView
          ? t("requests")
          : isFavoritesView
            ? t("favorites")
            : isDepartmentView
              ? t("departmentFiles")
              : t("myUploadedFiles")
      }
      subtitle={t("myLibrarySubtitle")}
      action={
        isRequestsView && canSubmitFiles ? (
          <Button variant="contained" onClick={handleOpenNewRequest}>
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
                    <Chip
                      size="small"
                      label={formatBadge(pendingRequestsCount)}
                      sx={{ backgroundColor: "rgba(37, 99, 235, 0.12)", color: "primary.main", fontWeight: 700 }}
                    />
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
            <Stack spacing={1.25}>{requestRows.map((row: any) => renderRequestRow(row))}</Stack>
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
        <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <FiltersBar>
            <SearchField value={searchFiles} onChange={setSearchFiles} placeholder={t("searchFiles")} />
            <Select
              size="small"
              value={sortFiles.direction && sortFiles.key ? `${sortFiles.key}:${sortFiles.direction}` : "updated_at:desc"}
              onChange={(event) => {
                const [key, direction] = String(event.target.value).split(":");
                setSortFiles({ key, direction: direction as "asc" | "desc" });
              }}
              sx={{ minWidth: 190, backgroundColor: "#fff", borderRadius: "8px" }}
            >
              <MenuItem value="updated_at:desc">{t("sortDateNew")}</MenuItem>
              <MenuItem value="updated_at:asc">{t("sortDateOld")}</MenuItem>
              <MenuItem value="title:asc">{t("sortTitleAsc")}</MenuItem>
              <MenuItem value="title:desc">{t("sortTitleDesc")}</MenuItem>
            </Select>
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
            <Stack spacing={1.25}>{fileRows.map((row: any) => renderFileRow(row))}</Stack>
          )}

          <PaginationBar
            page={fileMeta.page}
            pageSize={fileMeta.pageSize}
            total={fileMeta.total}
            onPageChange={isFavoritesView ? setFavoritesPage : isDepartmentView ? setDepartmentPage : setMyFilesPage}
            onPageSizeChange={isFavoritesView ? setFavoritesPageSize : isDepartmentView ? setDepartmentPageSize : setMyFilesPageSize}
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
      )}

      <Drawer
        anchor="right"
        open={Boolean(detailsId) && !lgUp}
        onClose={handleCloseDetails}
        PaperProps={{ sx: { width: { xs: "100%", sm: 420 } } }}
      >
        {renderDetailsPanel()}
      </Drawer>

      <Dialog open={!!requestDetails} onClose={() => setRequestDetails(null)} fullWidth maxWidth="sm">
        <DialogTitle>{t("requestDetails")}</DialogTitle>
        <DialogContent>
          {requestDetails && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <DetailRow label={t("title")} value={requestDetails.title || t("file")} />
              <DetailRow label={t("requestType")} value={requestTypeLabel(requestDetails.requestType)} />
              {requestDetails.requestType === "update" ? (
                <DetailRow label={t("targetFile")} value={requestDetails.targetTitle || t("file")} />
              ) : null}
              <DetailRow label={t("status")} value={statusChip(requestDetails.status)} />
              <DetailRow label={t("access")} value={accessChip(requestDetails.accessType)} />
              <CommentBlock label={t("commentFromUser")} value={requestDetails.comment} tone="user" />
              <CommentBlock label={t("commentFromAdmin")} value={getAdminComment(requestDetails)} tone="admin" />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRequestDetails(null)}>{t("cancel")}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!updateInfoTarget} onClose={() => setUpdateInfoTarget(null)} fullWidth maxWidth="sm">
        <DialogTitle>{t("fileUpdatedByOtherTitle")}</DialogTitle>
        <DialogContent>
          {updateInfoTarget && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <DetailRow label={t("file")} value={updateInfoTarget.title || t("file")} />
              <DetailRow
                label={t("updatedBy")}
                value={updateInfoTarget.updatedBy?.fullName || updateInfoTarget.updatedBy?.login || "-"}
              />
              <DetailRow
                label={t("updatedAt")}
                value={updateInfoTarget.updatedBy?.createdAt ? formatDateTime(updateInfoTarget.updatedBy.createdAt) : "-"}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUpdateInfoTarget(null)}>{t("cancel")}</Button>
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
                  if (downloadTarget?.versionId) {
                    downloadVersionMutation.mutate({
                      id: downloadTarget.id,
                      versionId: downloadTarget.versionId,
                      lang,
                      title: downloadTarget?.title
                    });
                  } else {
                    downloadMutation.mutate({ id: downloadTarget!.id, lang, title: downloadTarget?.title });
                  }
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
        <DialogTitle>{submitMode === "update" ? t("updateFileRequest") : t("submitForPublication")}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          {submitMode === "update" && updateLoading ? (
            <LoadingState rows={4} />
          ) : (
          <Stack spacing={2} sx={{ mt: 1 }}>
            {submitMode === "update" && (
              <Paper
                variant="outlined"
                sx={{ p: 2, borderRadius: "8px", backgroundColor: "rgba(37, 99, 235, 0.06)" }}
              >
                <Typography variant="subtitle2">{t("file")}</Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {updateDetails?.title || updateTarget?.title || updateDetails?.id || updateTarget?.id || "-"}
                </Typography>
              </Paper>
            )}
            {submitMode === "new" && (
              <>
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
                            {formatPath(getCategoryOptionPath(option.id))}
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
                      <MenuItem value="department_closed">{t("accessDepartmentClosed")}</MenuItem>
                    </TextField>
                  )}
                />
              </>
            )}
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
                      sx={{ border: "1px dashed", borderColor: "divider", borderRadius: "8px" }}
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
                borderRadius: "8px",
                borderStyle: "dashed",
                backgroundColor: "rgba(37, 99, 235, 0.06)"
              }}
            >
              {submitMode === "new" ? (
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
              ) : (
                <TextField
                  label={t("commentForAdmin")}
                  multiline
                  minRows={3}
                  fullWidth
                  value={updateComment}
                  onChange={(event) => setUpdateComment(event.target.value)}
                />
              )}
            </Paper>
          </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSubmit}>{t("cancel")}</Button>
          <Button
            variant="contained"
            onClick={submitMode === "update" ? submitUpdateRequest : submitNewRequest}
            disabled={createMutation.isPending || submitting}
          >
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
