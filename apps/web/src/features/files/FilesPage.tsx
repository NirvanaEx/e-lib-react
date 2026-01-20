import React from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
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
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import PublicIcon from "@mui/icons-material/Public";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { fetchFiles, fetchFile, fetchVersions, createFile, deleteFile, uploadAsset, downloadUserFile } from "./files.api";
import { fetchSections } from "../sections/sections.api";
import { fetchCategories } from "../categories/categories.api";
import { fetchDepartmentOptions } from "../departments/departments.api";
import { fetchUserOptions } from "../admin-users/users.api";
import { DataTable } from "../../shared/ui/DataTable";
import { Page } from "../../shared/ui/Page";
import { EmptyState } from "../../shared/ui/EmptyState";
import { LoadingState } from "../../shared/ui/LoadingState";
import { FiltersBar } from "../../shared/ui/FiltersBar";
import { PaginationBar } from "../../shared/ui/PaginationBar";
import { SearchField } from "../../shared/ui/SearchField";
import { ConfirmDialog } from "../../shared/ui/ConfirmDialog";
import { TranslationsEditor } from "../../shared/ui/TranslationsEditor";
import { useToast } from "../../shared/ui/ToastProvider";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { getErrorMessage } from "../../shared/utils/errors";
import { buildPathMap, formatPath } from "../../shared/utils/tree";
import { getFilenameFromDisposition } from "../../shared/utils/download";
import { formatBytes } from "../../shared/utils/format";
import { FileDetailsPanel } from "./FileDetailsPanel";
import { formatDateTime } from "../../shared/utils/date";
import { formatUserLabel } from "../../shared/utils/userLabel";

const schema = z.object({
  sectionId: z.number().min(1),
  categoryId: z.number().min(1),
  accessType: z.enum(["public", "restricted", "department_closed"]),
  accessDepartmentIds: z.array(z.number()).optional(),
  accessUserIds: z.array(z.number()).optional()
});

type FormValues = z.infer<typeof schema>;

type FileRow = {
  id: number;
  title: string | null;
  sectionId: number;
  categoryId: number;
  createdAt?: string | null;
  updatedAt?: string | null;
  currentAssetSize?: number | null;
  availableAssetSizes?: Array<{ lang: string; size: number }>;
  accessType: string;
  currentVersionId?: number | null;
  availableLangs?: string[];
  availableAssetLangs?: string[];
};

type SectionOption = { id: number; title?: string | null };

type CategoryOption = { id: number; title?: string | null; depth?: number; parentId?: number | null };

type DepartmentOption = { id: number; name: string; parent_id?: number | null; depth?: number };

const defaultValues: FormValues = {
  sectionId: 0,
  categoryId: 0,
  accessType: "public",
  accessDepartmentIds: [],
  accessUserIds: []
};

export default function FilesPage() {
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const [confirmTrash, setConfirmTrash] = React.useState<number | null>(null);
  const [detailsId, setDetailsId] = React.useState<number | null>(null);
  const [infoId, setInfoId] = React.useState<number | null>(null);
  const [translations, setTranslations] = React.useState<any[]>([]);
  const [initialFile, setInitialFile] = React.useState<File | null>(null);
  const [initialLang, setInitialLang] = React.useState("ru");
  const [extraAssets, setExtraAssets] = React.useState<Array<{ lang: string; file: File | null }>>([]);
  const [downloadTarget, setDownloadTarget] = React.useState<{
    id: number;
    title: string | null;
    langs: string[];
    sizes: Record<string, number>;
  } | null>(null);
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [sort, setSort] = React.useState<{ key: string | null; direction: "asc" | "desc" | null }>({
    key: null,
    direction: null
  });
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { t, i18n } = useTranslation();

  React.useEffect(() => {
    setPage(1);
  }, [search, pageSize, sort.key, sort.direction]);

  const { data, isLoading } = useQuery({
    queryKey: ["files", page, pageSize, search, sort.key, sort.direction],
    queryFn: () =>
      fetchFiles({
        page,
        pageSize,
        q: search,
        sortBy: sort.direction ? sort.key || undefined : undefined,
        sortDir: sort.direction || undefined
      })
  });
  const { data: infoFile, isLoading: infoLoading } = useQuery({
    queryKey: ["file", infoId],
    queryFn: () => fetchFile(infoId as number),
    enabled: !!infoId
  });
  const { data: infoVersions } = useQuery({
    queryKey: ["versions", infoId],
    queryFn: () => fetchVersions(infoId as number),
    enabled: !!infoId
  });

  const { data: sectionsData } = useQuery({
    queryKey: ["sections", "options", 200],
    queryFn: () => fetchSections({ page: 1, pageSize: 200 })
  });

  const { data: departmentsData } = useQuery({
    queryKey: ["departments", "options", 200],
    queryFn: () => fetchDepartmentOptions({ page: 1, pageSize: 200 })
  });

  const { data: usersData } = useQuery({
    queryKey: ["users", "options", "file-access"],
    queryFn: () => fetchUserOptions({ page: 1, pageSize: 100 })
  });

  const sections: SectionOption[] = sectionsData?.data || [];
  const departments: DepartmentOption[] = departmentsData?.data || [];
  const users = usersData?.data || [];
  const departmentsById = React.useMemo(
    () => new Map(departments.map((department) => [department.id, department])),
    [departments]
  );
  const usersById = React.useMemo(() => new Map(users.map((user: any) => [user.id, user])), [users]);

  const { control, handleSubmit, watch, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues
  });

  const accessType = watch("accessType");

  const { data: categoriesData } = useQuery({
    queryKey: ["categories", "options", 500],
    queryFn: () => fetchCategories({ page: 1, pageSize: 500 })
  });

  const categories: CategoryOption[] = categoriesData?.data || [];

  const sectionTitleById = React.useMemo(() => {
    const map = new Map<number, string>();
    sections.forEach((section) => {
      map.set(section.id, section.title || `#${section.id}`);
    });
    return map;
  }, [sections]);

  const formatSectionLabel = (sectionId: number) => sectionTitleById.get(sectionId) || `#${sectionId}`;

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

  const departmentPathById = React.useMemo(
    () =>
      buildPathMap(
        departments,
        (item) => item.id,
        (item) => item.parent_id ?? null,
        (item) => item.name
      ),
    [departments]
  );

  const getCategoryPath = (id: number) => categoryPathById.get(id) || [`#${id}`];
  const getDepartmentPath = (id: number) => departmentPathById.get(id) || [`#${id}`];

  const sortedCategories = React.useMemo(() => {
    const items = [...categories];
    return items.sort((a, b) =>
      formatPath(getCategoryPath(a.id)).localeCompare(formatPath(getCategoryPath(b.id)), undefined, {
        numeric: true,
        sensitivity: "base"
      })
    );
  }, [categories, getCategoryPath]);

  const sortedDepartments = React.useMemo(() => {
    const items = [...departments];
    return items.sort((a, b) =>
      formatPath(getDepartmentPath(a.id)).localeCompare(formatPath(getDepartmentPath(b.id)), undefined, {
        numeric: true,
        sensitivity: "base"
      })
    );
  }, [departments, getDepartmentPath]);

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

  const languageOptions = ["ru", "en", "uz"];
  const currentLang = (i18n.language || "ru").split("-")[0];
  const infoTranslations = infoFile?.translations || [];
  const infoTranslationsSorted = React.useMemo(() => {
    const items = [...infoTranslations];
    return items.sort((a: any, b: any) => {
      const aCurrent = a.lang === currentLang;
      const bCurrent = b.lang === currentLang;
      if (aCurrent && !bCurrent) return -1;
      if (!aCurrent && bCurrent) return 1;
      return String(a.lang).localeCompare(String(b.lang));
    });
  }, [infoTranslations, currentLang]);
  const currentVersion = React.useMemo(() => {
    const versions = infoVersions?.data || [];
    return versions.find((item: any) => item.id === infoFile?.currentVersionId) || null;
  }, [infoVersions, infoFile]);
  const infoAssets = React.useMemo(() => {
    const items = [...(currentVersion?.assets || [])];
    return items.sort((a: any, b: any) => {
      const aCurrent = a.lang === currentLang;
      const bCurrent = b.lang === currentLang;
      if (aCurrent && !bCurrent) return -1;
      if (!aCurrent && bCurrent) return 1;
      return String(a.lang).localeCompare(String(b.lang));
    });
  }, [currentVersion, currentLang]);
  const infoDepartments = React.useMemo(() => {
    const ids = infoFile?.accessDepartmentIds || [];
    return ids.map((id: number) => departmentsById.get(id)?.name || `#${id}`);
  }, [infoFile, departmentsById]);
  const infoUsers = React.useMemo(() => {
    const ids = infoFile?.accessUserIds || [];
    return ids.map((id: number) => {
      const user = usersById.get(id);
      return user ? formatUserLabel(user) : `#${id}`;
    });
  }, [infoFile, usersById]);
  const showInfoAccessLists = infoFile?.accessType && infoFile.accessType !== "public";
  const showInfoUsers = infoFile?.accessType === "restricted";
  const infoTitleForLang = (lang?: string | null) =>
    infoTranslations.find((item: any) => item.lang === lang)?.title || infoFile?.title || "file";

  const resolveRowSize = (row: FileRow) => {
    const sizes = row.availableAssetSizes || [];
    const direct = sizes.find((item) => item.lang === currentLang)?.size;
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
  const accessIcon = (accessType: string) => (
    <Tooltip title={getAccessLabel(accessType)}>
      <Box sx={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
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

  const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <Stack direction="row" spacing={2} alignItems="flex-start">
      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 140 }}>
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Stack>
  );

  const pickVersionTitle = (version: any) => {
    const translations = version?.translations || [];
    return (
      translations.find((item: any) => item.lang === currentLang)?.title ||
      translations.find((item: any) => item.lang === "ru")?.title ||
      translations[0]?.title ||
      "-"
    );
  };

  const pickVersionDescription = (version: any) => {
    const translations = version?.translations || [];
    return (
      translations.find((item: any) => item.lang === currentLang)?.description ||
      translations.find((item: any) => item.lang === "ru")?.description ||
      translations[0]?.description ||
      "-"
    );
  };

  const createMutation = useMutation({
    mutationFn: createFile
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      showToast({ message: t("fileTrashed"), severity: "success" });
    },
    onError: (error) => showToast({ message: getErrorMessage(error, t("actionFailed")), severity: "error" })
  });

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
    },
    onError: (error) => showToast({ message: getErrorMessage(error, t("actionFailed")), severity: "error" })
  });

  const rows: FileRow[] = data?.data || [];
  const meta = data?.meta || { page, pageSize, total: 0 };

  const handleOpenCreate = () => {
    reset(defaultValues);
    setTranslations([{ lang: "ru", title: "", description: "" }]);
    setInitialFile(null);
    setInitialLang("ru");
    setExtraAssets([]);
    setOpen(true);
  };

  const addExtraAsset = () => {
    const used = new Set([initialLang, ...extraAssets.map((item) => item.lang)]);
    const nextLang = languageOptions.find((lang) => !used.has(lang)) || "ru";
    setExtraAssets((prev) => [...prev, { lang: nextLang, file: null }]);
  };

  const onSubmit = async (values: FormValues) => {
    if (!initialFile) {
      showToast({ message: t("fileRequired"), severity: "error" });
      return;
    }
    if (!values.sectionId) {
      showToast({ message: t("selectSectionError"), severity: "error" });
      return;
    }
    if (!values.categoryId) {
      showToast({ message: t("selectCategoryError"), severity: "error" });
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
      return;
    }

    const payload = {
      sectionId: Number(values.sectionId),
      categoryId: Number(values.categoryId),
      accessType: values.accessType,
      accessDepartmentIds: values.accessType !== "public" ? values.accessDepartmentIds : [],
      accessUserIds: values.accessType === "restricted" ? values.accessUserIds : [],
      translations: normalizedTranslations
    };

    try {
      const extraWithFile = extraAssets.filter((item) => item.file);
      if (extraWithFile.length !== extraAssets.length) {
        showToast({ message: t("selectFileForLang"), severity: "error" });
        return;
      }
      const usedLangs = new Set([initialLang]);
      for (const item of extraWithFile) {
        if (usedLangs.has(item.lang)) {
          showToast({ message: t("languageDuplicate"), severity: "error" });
          return;
        }
        usedLangs.add(item.lang);
      }

      const result = await createMutation.mutateAsync(payload);
      if (initialFile && result?.currentVersionId) {
        const form = new FormData();
        form.append("lang", initialLang);
        form.append("file", initialFile);
        await uploadAsset(result.id, result.currentVersionId, form);
        for (const item of extraWithFile) {
          const extraForm = new FormData();
          extraForm.append("lang", item.lang);
          extraForm.append("file", item.file as File);
          await uploadAsset(result.id, result.currentVersionId, extraForm);
        }
      }
      queryClient.invalidateQueries({ queryKey: ["files"] });
      setOpen(false);
      reset(defaultValues);
      setTranslations([]);
      setInitialFile(null);
      setExtraAssets([]);
      showToast({ message: t("fileCreated"), severity: "success" });
    } catch (error) {
      showToast({ message: getErrorMessage(error, t("actionFailed")), severity: "error" });
    }
  };

  return (
    <Page
      title={t("files")}
      subtitle={t("filesSubtitle")}
      action={
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
          {t("newFile")}
        </Button>
      }
    >
      <FiltersBar>
        <SearchField value={search} onChange={setSearch} placeholder={t("searchFiles")} />
      </FiltersBar>

      {isLoading ? (
        <LoadingState rows={6} />
      ) : rows.length === 0 ? (
        <EmptyState title={t("filesEmpty")} subtitle={t("filesEmptySubtitle")} action={{ label: t("newFile"), onClick: handleOpenCreate }} />
      ) : (
        <DataTable
          rows={rows}
          onRowClick={(row) => setInfoId(row.id)}
          sort={sort}
          onSortChange={(key, direction) =>
            setSort(direction ? { key, direction } : { key: null, direction: null })
          }columns={[
            {
              key: "title",
              label: t("title"),
              sortable: true,
              sortKey: "title",
              render: (row) => row.title || t("file")
            },
            {
              key: "section",
              label: t("section"),
              render: (row) => formatSectionLabel(row.sectionId)
            },
            {
              key: "category",
              label: t("category"),
              render: (row) => renderPath(getCategoryPath(row.categoryId)),
              sortable: true,
              sortKey: "category",
            },
            {
              key: "accessType",
              label: t("access"),
              align: "center",
              width: 48,
              render: (row) => accessIcon(row.accessType)
            },
            {
              key: "langs",
              label: t("languages"),
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
                const disabled = langs.length === 0;
                const sizes = (row.availableAssetSizes || []).reduce<Record<string, number>>((acc, item) => {
                  acc[item.lang] = item.size;
                  return acc;
                }, {});
                return (
                  <Tooltip title={disabled ? t("noAssets") : t("download")}>
                    <span>
                      <IconButton
                        size="small"
                        disabled={disabled}
                        color={disabled ? "default" : "primary"}
                        sx={disabled ? undefined : { backgroundColor: "rgba(29, 77, 79, 0.12)" }}
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
            },
            {
              key: "actions",
              label: t("actions"),
              align: "right",
              sortable: false,
              width: 96,
              render: (row) => (
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Tooltip title={t("edit")}>
                    <IconButton
                      size="small"
                      onClick={(event) => {
                        event.stopPropagation();
                        setDetailsId(row.id);
                      }}
                    >
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t("moveToTrash")}>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(event) => {
                        event.stopPropagation();
                        setConfirmTrash(row.id);
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              )
            }
          ]}
        />
      )}

      <PaginationBar
        page={meta.page}
        pageSize={meta.pageSize}
        total={meta.total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{t("newFile")}</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent sx={{ pt: 1 }}>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Controller
                control={control}
                name="sectionId"
                render={({ field }) => (
                  <Autocomplete
                    options={sections}
                    getOptionLabel={(option) => option.title || `#${option.id}`}
                    renderOption={(props, option) => {
                      const { key, ...optionProps } = props;
                      return (
                        <li key={option.id} {...optionProps}>
                          {option.title || `#${option.id}`}
                        </li>
                      );
                    }}
                    value={sections.find((section) => section.id === field.value) || null}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    onChange={(_, value) => field.onChange(value ? value.id : 0)}
                    renderInput={(params) => <TextField {...params} label={t("section")} required />}
                  />
                )}
              />
              {sections.length === 0 && (
                <Button size="small" onClick={() => navigate("/dashboard/sections")}>
                  {t("createSection")}
                </Button>
              )}
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <Autocomplete
                    options={sortedCategories}
                    getOptionLabel={(option) => formatPath(getCategoryPath(option.id))}
                    renderOption={(props, option) => {
                      const { key, ...optionProps } = props;
                      return (
                        <li key={option.id} {...optionProps}>
                          {renderPath(getCategoryPath(option.id))}
                        </li>
                      );
                    }}
                    value={sortedCategories.find((cat) => cat.id === field.value) || null}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    onChange={(_, value) => field.onChange(value ? value.id : 0)}
                    renderInput={(params) => <TextField {...params} label={t("category")} required />}
                  />
                )}
              />
              {categories.length === 0 && (
                <Button size="small" onClick={() => navigate("/dashboard/categories")}>
                  {t("createCategory")}
                </Button>
              )}
                <Controller
                  control={control}
                  name="accessType"
                  render={({ field }) => (
                    <TextField
                      select
                      label={t("access")}
                      value={field.value}
                      onChange={(event) => field.onChange(event.target.value)}
                    >
                      <MenuItem value="public">{t("accessPublic")}</MenuItem>
                      <MenuItem value="restricted">{t("accessRestricted")}</MenuItem>
                      <MenuItem value="department_closed">{t("accessDepartmentClosed")}</MenuItem>
                    </TextField>
                  )}
                />
              {accessType !== "public" && (
                <Stack spacing={2}>
                  <Controller
                    control={control}
                    name="accessDepartmentIds"
                    render={({ field }) => (
                      <Autocomplete
                        multiple
                        options={sortedDepartments}
                        getOptionLabel={(option: DepartmentOption) => formatPath(getDepartmentPath(option.id))}
                        renderOption={(props, option: any) => {
                          const { key, ...optionProps } = props;
                          return (
                            <li key={option.id} {...optionProps}>
                              {renderPath(getDepartmentPath(option.id))}
                            </li>
                          );
                        }}
                        value={sortedDepartments.filter((dept) => field.value?.includes(dept.id))}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        onChange={(_, value) => field.onChange(value.map((item) => item.id))}
                        renderInput={(params) => <TextField {...params} label={t("allowedDepartments")} />}
                      />
                    )}
                  />
                  {accessType === "restricted" && (
                    <Controller
                      control={control}
                      name="accessUserIds"
                      render={({ field }) => (
                        <Autocomplete
                          multiple
                          options={users}
                          getOptionLabel={(option: any) => formatUserLabel(option)}
                          renderOption={(props, option: any) => {
                            const { key, ...optionProps } = props;
                            return (
                              <li key={option.id} {...optionProps}>
                                {formatUserLabel(option)}
                              </li>
                            );
                          }}
                          value={users.filter((user: any) => field.value?.includes(user.id))}
                          isOptionEqualToValue={(option: any, value: any) => option.id === value.id}
                          onChange={(_, value) => field.onChange(value.map((item: any) => item.id))}
                          renderInput={(params) => <TextField {...params} label={t("allowedUsers")} />}
                        />
                      )}
                    />
                  )}
                </Stack>
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
                    onChange={(event) => setInitialLang(event.target.value)}
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
                  <Button size="small" onClick={addExtraAsset}>
                    {t("addLanguageFile")}
                  </Button>
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
                        const next = event.target.value;
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
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>{t("cancel")}</Button>
            <Button type="submit" variant="contained" disabled={createMutation.isPending}>
              {t("create")}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <ConfirmDialog
        open={!!confirmTrash}
        title={t("confirmTrash")}
        description={t("confirmTrashFile")}
        confirmLabel={t("moveToTrash")}
        onConfirm={() => {
          if (confirmTrash) {
            deleteMutation.mutate(confirmTrash);
            setConfirmTrash(null);
          }
        }}
        onCancel={() => setConfirmTrash(null)}
      />

      <Dialog open={!!infoId} onClose={() => setInfoId(null)} fullWidth maxWidth="md">
        <DialogTitle>{infoFile?.title || t("file")}</DialogTitle>
        <DialogContent dividers>
          {infoLoading ? (
            <Typography color="text.secondary">{t("loading")}</Typography>
          ) : (
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {t("description")}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {infoFile?.description || "-"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {t("details")}
                </Typography>
                <Stack spacing={1}>
                  <DetailRow
                    label={t("createdBy")}
                    value={infoFile?.createdBy ? formatUserLabel(infoFile.createdBy) : "-"}
                  />
                  <DetailRow
                    label={t("createdAt")}
                    value={infoFile?.createdAt ? formatDateTime(infoFile.createdAt) : "-"}
                  />
                </Stack>
              </Box>
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="subtitle2">{t("access")}</Typography>
                  {accessIcon(infoFile?.accessType || "public")}
                </Stack>
                {showInfoAccessLists && (
                  <Stack spacing={1}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {t("departments")}
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 0.5 }}>
                        {infoDepartments.length === 0 ? (
                          <Typography variant="body2" color="text.secondary">
                            -
                          </Typography>
                        ) : (
                          infoDepartments.map((name) => <Chip key={name} size="small" label={name} />)
                        )}
                      </Stack>
                    </Box>
                    {showInfoUsers && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {t("users")}
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 0.5 }}>
                          {infoUsers.length === 0 ? (
                            <Typography variant="body2" color="text.secondary">
                              -
                            </Typography>
                          ) : (
                            infoUsers.map((name) => <Chip key={name} size="small" label={name} />)
                          )}
                        </Stack>
                      </Box>
                    )}
                  </Stack>
                )}
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {t("currentVersion")}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {currentVersion?.version_number ? `#${currentVersion.version_number}` : "-"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {t("titlesByLanguage")}
                </Typography>
                <Stack spacing={1}>
                  {infoTranslationsSorted.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      -
                    </Typography>
                  ) : (
                    infoTranslationsSorted.map((item: any) => (
                      <Stack key={item.lang} direction="row" spacing={1.5} alignItems="flex-start">
                        <Chip
                          size="small"
                          label={item.lang.toUpperCase()}
                          color={item.lang === currentLang ? "primary" : "default"}
                          variant={item.lang === currentLang ? "filled" : "outlined"}
                        />
                        <Box>
                          <Typography variant="body2">{item.title}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.description || "-"}
                          </Typography>
                        </Box>
                      </Stack>
                    ))
                  )}
                </Stack>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {t("availableLanguages")}
                </Typography>
                <Stack spacing={1}>
                  {infoAssets.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      -
                    </Typography>
                  ) : (
                    infoAssets.map((asset: any) => (
                      <Stack key={asset.id} direction="row" spacing={1} alignItems="center">
                        <Chip size="small" label={asset.lang.toUpperCase()} />
                        <Typography variant="body2" sx={{ flex: 1 }}>
                          {asset.originalName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatBytes(asset.size)}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() =>
                            downloadMutation.mutate({ id: infoId as number, lang: asset.lang, title: infoTitleForLang(asset.lang) })
                          }
                        >
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    ))
                  )}
                </Stack>
              </Box>
              <Accordion sx={{ borderRadius: 2, border: "1px solid var(--border)", boxShadow: "none" }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2 }}>
                  <Typography variant="subtitle2">{t("archiveVersions")}</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0, px: 2, pb: 2 }}>
                  {(infoVersions?.data || []).length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      {t("noHistory")}
                    </Typography>
                  ) : (
                    <Stack spacing={1.5}>
                      {(infoVersions?.data || []).map((version: any) => (
                        <Paper key={version.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                          <Stack spacing={1}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Chip size="small" label={`v${version.version_number}`} />
                              {infoFile?.currentVersionId === version.id && (
                                <Chip size="small" color="success" label={t("current")} />
                              )}
                              {version.deleted_at && <Chip size="small" color="warning" label={t("deleted")} />}
                              <Typography variant="caption" color="text.secondary">
                                {formatDateTime(version.created_at)}
                              </Typography>
                            </Stack>
                            <Typography variant="caption" color="text.secondary">
                              {t("createdBy")}: {version.createdBy?.fullName || version.createdBy?.login || "-"}
                            </Typography>
                            <Typography variant="body2">{pickVersionTitle(version)}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {pickVersionDescription(version)}
                            </Typography>
                          </Stack>
                        </Paper>
                      ))}
                    </Stack>
                  )}
                </AccordionDetails>
              </Accordion>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInfoId(null)}>{t("cancel")}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!detailsId} onClose={() => setDetailsId(null)} fullWidth maxWidth="lg" scroll="paper">
        <DialogContent sx={{ pt: 2 }}>
          {detailsId && <FileDetailsPanel fileId={detailsId} variant="dialog" />}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsId(null)}>{t("cancel")}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!downloadTarget} onClose={() => setDownloadTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>{t("download")}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={1} sx={{ mt: 1 }}>
            {(downloadTarget?.langs || []).map((lang) => (
              <Button
                key={lang}
                variant="outlined"
                onClick={() => {
                  if (!downloadTarget) return;
                  downloadMutation.mutate({ id: downloadTarget.id, lang, title: downloadTarget.title });
                  setDownloadTarget(null);
                }}
              >
                {downloadTarget?.sizes?.[lang]
                  ? `${lang.toUpperCase()} · ${formatBytes(downloadTarget.sizes[lang])}`
                  : lang.toUpperCase()}
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
