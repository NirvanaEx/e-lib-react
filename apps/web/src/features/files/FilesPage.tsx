import React from "react";
import {
  Autocomplete,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { fetchFiles, createFile, deleteFile } from "./files.api";
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

const schema = z.object({
  sectionId: z.number().min(1),
  categoryId: z.number().min(1),
  accessType: z.enum(["public", "restricted"]),
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
  accessType: string;
  currentVersionId?: number | null;
  availableLangs?: string[];
};

type SectionOption = { id: number; title?: string | null };

type CategoryOption = { id: number; title?: string | null; depth?: number };

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
  const [translations, setTranslations] = React.useState<any[]>([]);
  const [initialFile, setInitialFile] = React.useState<File | null>(null);
  const [initialLang, setInitialLang] = React.useState("ru");
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [sortBy, setSortBy] = React.useState("created_at");
  const [sortDir, setSortDir] = React.useState("desc");
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { t } = useTranslation();

  React.useEffect(() => {
    setPage(1);
  }, [search, pageSize, sortBy, sortDir]);

  const { data, isLoading } = useQuery({
    queryKey: ["files", page, pageSize, search, sortBy, sortDir],
    queryFn: () => fetchFiles({ page, pageSize, q: search, sortBy, sortDir })
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
  const departments = departmentsData?.data || [];
  const users = usersData?.data || [];

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

  const categoryInfoById = React.useMemo(() => {
    const map = new Map<number, { title: string; depth: number }>();
    categories.forEach((category) => {
      map.set(category.id, {
        title: category.title || `#${category.id}`,
        depth: category.depth || 1
      });
    });
    return map;
  }, [categories]);

  const formatSectionLabel = (sectionId: number) => sectionTitleById.get(sectionId) || `#${sectionId}`;

  const formatCategoryLabel = (categoryId: number) => {
    const category = categoryInfoById.get(categoryId);
    if (!category) return `#${categoryId}`;
    const prefix = "- ".repeat(Math.max(0, category.depth - 1));
    return `${prefix}${category.title}`;
  };

  const formatCreatedAt = (value?: string | null) => (value ? new Date(value).toLocaleDateString() : "-");

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

  const rows: FileRow[] = data?.data || [];
  const meta = data?.meta || { page, pageSize, total: 0 };

  const handleOpenCreate = () => {
    reset(defaultValues);
    setTranslations([{ lang: "ru", title: "", description: "" }]);
    setInitialFile(null);
    setInitialLang("ru");
    setOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
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
      accessDepartmentIds: values.accessType === "restricted" ? values.accessDepartmentIds : [],
      accessUserIds: values.accessType === "restricted" ? values.accessUserIds : [],
      translations: normalizedTranslations
    };

    try {
      const result = await createMutation.mutateAsync(payload);
      if (initialFile && result?.currentVersionId) {
        const form = new FormData();
        form.append("lang", initialLang);
        form.append("file", initialFile);
        await uploadAsset(result.id, result.currentVersionId, form);
      }
      queryClient.invalidateQueries({ queryKey: ["files"] });
      setOpen(false);
      reset(defaultValues);
      setTranslations([]);
      setInitialFile(null);
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
        <Select size="small" value={sortBy} onChange={(event) => setSortBy(String(event.target.value))}>
          <MenuItem value="created_at">{t("sortByDate")}</MenuItem>
          <MenuItem value="title">{t("sortByTitle")}</MenuItem>
        </Select>
        <Select size="small" value={sortDir} onChange={(event) => setSortDir(String(event.target.value))}>
          <MenuItem value="desc">{t("desc")}</MenuItem>
          <MenuItem value="asc">{t("asc")}</MenuItem>
        </Select>
      </FiltersBar>

      {isLoading ? (
        <LoadingState rows={6} />
      ) : rows.length === 0 ? (
        <EmptyState title={t("filesEmpty")} subtitle={t("filesEmptySubtitle")} action={{ label: t("newFile"), onClick: handleOpenCreate }} />
      ) : (
        <DataTable
          rows={rows}
          columns={[
            { key: "title", label: t("title") },
            {
              key: "section",
              label: t("section"),
              render: (row) => formatSectionLabel(row.sectionId)
            },
            {
              key: "category",
              label: t("category"),
              render: (row) => formatCategoryLabel(row.categoryId)
            },
            {
              key: "accessType",
              label: t("access"),
              render: (row) => (
                <Chip size="small" label={row.accessType === "restricted" ? t("accessRestricted") : t("accessPublic")} />
              )
            },
            {
              key: "langs",
              label: t("languages"),
              render: (row) => (
                <Stack direction="row" spacing={1}>
                  {(row.availableLangs || []).map((lang: string) => (
                    <Chip key={lang} size="small" label={lang.toUpperCase()} />
                  ))}
                </Stack>
              )
            },
            {
              key: "createdAt",
              label: t("createdAt"),
              render: (row) => formatCreatedAt(row.createdAt)
            },
            {
              key: "actions",
              label: t("actions"),
              align: "right",
              render: (row) => (
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Tooltip title={t("open")}>
                    <IconButton size="small" onClick={() => navigate(`/dashboard/files/${row.id}`)}>
                      <OpenInNewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t("moveToTrash")}>
                    <IconButton size="small" color="error" onClick={() => setConfirmTrash(row.id)}>
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
                    renderInput={(params) => <TextField {...params} label={t("section")} />}
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
                    options={categories}
                    getOptionLabel={(option) => `${"- ".repeat(Math.max(0, (option.depth || 1) - 1))}${option.title || `#${option.id}`}`}
                    renderOption={(props, option) => {
                      const { key, ...optionProps } = props;
                      const label = `${"- ".repeat(Math.max(0, (option.depth || 1) - 1))}${option.title || `#${option.id}`}`;
                      return (
                        <li key={option.id} {...optionProps}>
                          {label}
                        </li>
                      );
                    }}
                    value={categories.find((cat) => cat.id === field.value) || null}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    onChange={(_, value) => field.onChange(value ? value.id : 0)}
                    renderInput={(params) => <TextField {...params} label={t("category")} />}
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
                  </TextField>
                )}
              />
              {accessType === "restricted" && (
                <Stack spacing={2}>
                  <Controller
                    control={control}
                    name="accessDepartmentIds"
                    render={({ field }) => (
                      <Autocomplete
                        multiple
                        options={departments}
                        getOptionLabel={(option: any) => option.name}
                        renderOption={(props, option: any) => {
                          const { key, ...optionProps } = props;
                          return (
                            <li key={option.id} {...optionProps}>
                              {option.name}
                            </li>
                          );
                        }}
                        value={departments.filter((dept: any) => field.value?.includes(dept.id))}
                        isOptionEqualToValue={(option: any, value: any) => option.id === value.id}
                        onChange={(_, value) => field.onChange(value.map((item: any) => item.id))}
                        renderInput={(params) => <TextField {...params} label={t("allowedDepartments")} />}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name="accessUserIds"
                    render={({ field }) => (
                      <Autocomplete
                        multiple
                        options={users}
                        getOptionLabel={(option: any) => option.login}
                        renderOption={(props, option: any) => {
                          const { key, ...optionProps } = props;
                          return (
                            <li key={option.id} {...optionProps}>
                              {option.login}
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
                </Stack>
              )}
              <TranslationsEditor
                value={translations}
                onChange={setTranslations}
                showDescription
                titleLabel={t("title")}
                descriptionLabel={t("description")}
                helperText={t("translationsHint")}
              />
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
    </Page>
  );
}
