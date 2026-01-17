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
  Stack,
  TextField,
  Tooltip
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { fetchSections } from "../sections/sections.api";
import { fetchCategories, createCategory, deleteCategory, fetchCategory, updateCategory } from "./categories.api";
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
import { getErrorMessage } from "../../shared/utils/errors";
import { useNavigate } from "react-router-dom";

const schema = z.object({
  sectionId: z.number().min(1),
  parentId: z.number().nullable().optional()
});

type FormValues = z.infer<typeof schema>;

type CategoryRow = {
  id: number;
  sectionId: number;
  parentId: number | null;
  depth: number;
  title: string | null;
  availableLangs?: string[];
};

type SectionOption = { id: number; title?: string | null };

const defaultValues: FormValues = {
  sectionId: 0,
  parentId: null
};

export default function CategoriesPage() {
  const [open, setOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<number | null>(null);
  const [translations, setTranslations] = React.useState<any[]>([]);
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [sectionFilter, setSectionFilter] = React.useState<number | null>(null);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();

  React.useEffect(() => {
    setPage(1);
  }, [search, pageSize, sectionFilter]);

  const { data, isLoading } = useQuery({
    queryKey: ["categories", page, pageSize, search, sectionFilter],
    queryFn: () => fetchCategories({ page, pageSize, q: search, sectionId: sectionFilter || undefined })
  });

  const { data: sectionsData } = useQuery({
    queryKey: ["sections", "options", 200],
    queryFn: () => fetchSections({ page: 1, pageSize: 200 })
  });

  const { data: categoryDetails } = useQuery({
    queryKey: ["category", editingId],
    queryFn: () => fetchCategory(editingId as number),
    enabled: !!editingId
  });

  const sections: SectionOption[] = sectionsData?.data || [];

  const { control, handleSubmit, reset, watch } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues
  });

  const formSectionId = watch("sectionId");

  const { data: parentOptionsData } = useQuery({
    queryKey: ["categories", "options", formSectionId],
    queryFn: () => fetchCategories({ page: 1, pageSize: 500, sectionId: formSectionId || undefined }),
    enabled: !!formSectionId
  });

  React.useEffect(() => {
    if (categoryDetails) {
      reset({
        sectionId: categoryDetails.sectionId,
        parentId: categoryDetails.parentId || null
      });
      setTranslations(categoryDetails.translations.map((item: any) => ({ lang: item.lang, title: item.title })));
    }
  }, [categoryDetails, reset]);

  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setOpen(false);
      setTranslations([]);
      showToast({ message: t("categoryCreated"), severity: "success" });
    },
    onError: (error) => showToast({ message: getErrorMessage(error, t("actionFailed")), severity: "error" })
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => updateCategory(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setOpen(false);
      setEditingId(null);
      setTranslations([]);
      showToast({ message: t("categoryUpdated"), severity: "success" });
    },
    onError: (error) => showToast({ message: getErrorMessage(error, t("actionFailed")), severity: "error" })
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      showToast({ message: t("categoryDeleted"), severity: "success" });
    },
    onError: (error) => showToast({ message: getErrorMessage(error, t("actionFailed")), severity: "error" })
  });

  const rows: CategoryRow[] = data?.data || [];
  const meta = data?.meta || { page, pageSize, total: 0 };

  const parentOptions: CategoryRow[] = parentOptionsData?.data || [];
  const filteredParentOptions = editingId
    ? parentOptions.filter((cat) => cat.id !== editingId)
    : parentOptions;

  const handleOpenCreate = () => {
    setEditingId(null);
    reset(defaultValues);
    setTranslations([{ lang: "ru", title: "" }]);
    setOpen(true);
  };

  const handleOpenEdit = (id: number) => {
    setEditingId(id);
    setOpen(true);
  };

  const onSubmit = (values: FormValues) => {
    const normalizedTranslations = translations
      .map((item) => ({
        lang: item.lang,
        title: (item.title || "").trim()
      }))
      .filter((item) => item.title.length > 0);

    if (normalizedTranslations.length === 0) {
      showToast({ message: t("translationsRequired"), severity: "error" });
      return;
    }

    const payload = {
      sectionId: values.sectionId,
      parentId: values.parentId || null,
      translations: normalizedTranslations
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <Page
      title={t("categories")}
      subtitle={t("categoriesSubtitle")}
      action={
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
          {t("newCategory")}
        </Button>
      }
    >
      <FiltersBar>
        <SearchField value={search} onChange={setSearch} placeholder={t("searchCategories")} />
        <Autocomplete
          options={sections}
          getOptionLabel={(option) => option.title || `#${option.id}`}
          value={sections.find((section) => section.id === sectionFilter) || null}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          onChange={(_, value) => setSectionFilter(value ? value.id : null)}
          renderInput={(params) => <TextField {...params} size="small" label={t("section")} />}
          sx={{ minWidth: 200 }}
        />
      </FiltersBar>

      {isLoading ? (
        <LoadingState rows={6} />
      ) : rows.length === 0 ? (
        <EmptyState title={t("categoriesEmpty")} subtitle={t("categoriesEmptySubtitle")} action={{ label: t("newCategory"), onClick: handleOpenCreate }} />
      ) : (
        <DataTable
          rows={rows}
          columns={[
            {
              key: "title",
              label: t("title"),
              render: (row) => `${"- ".repeat(Math.max(0, row.depth - 1))}${row.title || ""}`
            },
            {
              key: "section",
              label: t("section"),
              render: (row) => sections.find((section) => section.id === row.sectionId)?.title || `#${row.sectionId}`
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
              key: "actions",
              label: t("actions"),
              align: "right",
              render: (row) => (
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Tooltip title={t("edit")}>
                    <IconButton size="small" onClick={() => handleOpenEdit(row.id)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t("delete")}>
                    <IconButton size="small" color="error" onClick={() => setConfirmDelete(row.id)}>
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

      <Dialog open={open} onClose={() => { setOpen(false); setEditingId(null); }} fullWidth maxWidth="md">
        <DialogTitle>{editingId ? t("editCategory") : t("newCategory")}</DialogTitle>
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
                    value={sections.find((section) => section.id === field.value) || null}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    onChange={(_, value) => field.onChange(value ? value.id : 0)}
                    renderInput={(params) => (
                      <TextField {...params} label={t("section")} error={!field.value} />
                    )}
                  />
                )}
              />
              {sections.length === 0 && (
                <Button size="small" onClick={() => navigate("/manage/sections")}>
                  {t("createSection")}
                </Button>
              )}
              <Controller
                control={control}
                name="parentId"
                render={({ field }) => (
                  <Autocomplete
                    options={filteredParentOptions}
                    getOptionLabel={(option) => option.title || `#${option.id}`}
                    value={filteredParentOptions.find((cat) => cat.id === field.value) || null}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    onChange={(_, value) => field.onChange(value ? value.id : null)}
                    renderInput={(params) => (
                      <TextField {...params} label={t("parentCategory")} helperText={t("parentCategoryHint")} />
                    )}
                  />
                )}
              />
              <TranslationsEditor
                value={translations}
                onChange={setTranslations}
                titleLabel={t("title")}
                helperText={t("translationsHint")}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setOpen(false); setEditingId(null); }}>{t("cancel")}</Button>
            <Button type="submit" variant="contained" disabled={createMutation.isPending || updateMutation.isPending}>
              {editingId ? t("save") : t("create")}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDelete}
        title={t("confirmDelete")}
        description={t("confirmDeleteCategory")}
        confirmLabel={t("delete")}
        onConfirm={() => {
          if (confirmDelete) {
            deleteMutation.mutate(confirmDelete);
            setConfirmDelete(null);
          }
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </Page>
  );
}
