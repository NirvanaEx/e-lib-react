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
  Stack,
  TextField,
  Tooltip
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { formatDateTime } from "../../shared/utils/date";

const schema = z.object({
  parentId: z.number().nullable().optional()
});

type FormValues = z.infer<typeof schema>;

type CategoryRow = {
  id: number;
  parentId: number | null;
  depth: number;
  title: string | null;
  availableLangs?: string[];
  createdAt?: string;
  dataCount?: number;
  dataOwnCount?: number;
};

type TreeRow = CategoryRow & {
  treeDepth: number;
  hasChildren: boolean;
};

const defaultValues: FormValues = {
  parentId: null
};

export default function CategoriesPage() {
  const [open, setOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [createParentId, setCreateParentId] = React.useState<number | null>(null);
  const [expandedIds, setExpandedIds] = React.useState<Set<number>>(new Set());
  const [confirmDelete, setConfirmDelete] = React.useState<number | null>(null);
  const [translations, setTranslations] = React.useState<any[]>([]);
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { t } = useTranslation();

  React.useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  const { data, isLoading } = useQuery({
    queryKey: ["categories", page, pageSize, search],
    queryFn: () => fetchCategories({ page, pageSize, q: search })
  });

  const { data: parentOptionsData } = useQuery({
    queryKey: ["categories", "options", 500],
    queryFn: () => fetchCategories({ page: 1, pageSize: 500 })
  });

  const { data: categoryDetails } = useQuery({
    queryKey: ["category", editingId],
    queryFn: () => fetchCategory(editingId as number),
    enabled: !!editingId
  });

  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues
  });

  React.useEffect(() => {
    if (categoryDetails) {
      reset({
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
  const parentLabel =
    createParentId !== null
      ? parentOptions.find((cat) => cat.id === createParentId)?.title || `#${createParentId}`
      : "";

  const treeRows: TreeRow[] = React.useMemo(() => {
    const rowsById = new Map(rows.map((row) => [row.id, row]));
    const childrenMap = new Map<number | null, CategoryRow[]>();

    rows.forEach((row) => {
      const parentKey = row.parentId && rowsById.has(row.parentId) ? row.parentId : null;
      if (!childrenMap.has(parentKey)) {
        childrenMap.set(parentKey, []);
      }
      childrenMap.get(parentKey)?.push(row);
    });

    const result: TreeRow[] = [];
    const walk = (node: CategoryRow, depth: number) => {
      const children = childrenMap.get(node.id) || [];
      result.push({ ...node, treeDepth: depth, hasChildren: children.length > 0 });
      if (expandedIds.has(node.id)) {
        children.forEach((child) => walk(child, depth + 1));
      }
    };

    const roots = childrenMap.get(null) || [];
    roots.forEach((root) => walk(root, 1));
    return result;
  }, [rows, expandedIds]);

  const toggleExpanded = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleOpenCreate = (parentId?: number | null) => {
    setEditingId(null);
    const nextParentId = parentId ?? null;
    setCreateParentId(nextParentId);
    reset({ parentId: nextParentId });
    setTranslations([{ lang: "ru", title: "" }]);
    setOpen(true);
  };

  const handleOpenEdit = (id: number) => {
    setEditingId(id);
    setCreateParentId(null);
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
      parentId: (createParentId ?? values.parentId) || null,
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
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenCreate()}>
          {t("newCategory")}
        </Button>
      }
    >
      <FiltersBar>
        <SearchField value={search} onChange={setSearch} placeholder={t("searchCategories")} />
      </FiltersBar>

      {isLoading ? (
        <LoadingState rows={6} />
      ) : rows.length === 0 ? (
        <EmptyState
          title={t("categoriesEmpty")}
          subtitle={t("categoriesEmptySubtitle")}
          action={{ label: t("newCategory"), onClick: handleOpenCreate }}
        />
      ) : (
        <DataTable
          rows={treeRows}
          columns={[
            {
              key: "title",
              label: t("title"),
              render: (row) => (
                <Stack direction="row" alignItems="center" spacing={0.5} sx={{ pl: Math.max(0, row.treeDepth - 1) * 2 }}>
                  {row.hasChildren ? (
                  <IconButton size="small" onClick={() => toggleExpanded(row.id)}>
                    {expandedIds.has(row.id) ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
                  </IconButton>
                ) : (
                    <Box sx={{ width: 32 }} />
                  )}
                  <Box sx={{ minWidth: 0 }}>{row.title || ""}</Box>
                </Stack>
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
              render: (row) => formatDateTime(row.createdAt)
            },
            {
              key: "dataOwnCount",
              label: t("dataOwnCount"),
              render: (row) => row.dataOwnCount ?? 0
            },
            {
              key: "dataCount",
              label: t("dataCount"),
              render: (row) => row.dataCount ?? 0
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
                  <Tooltip title={t("newCategory")}>
                    <IconButton size="small" onClick={() => handleOpenCreate(row.id)}>
                      <AddIcon fontSize="small" />
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

      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          setEditingId(null);
          setCreateParentId(null);
        }}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>{editingId ? t("editCategory") : t("newCategory")}</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent sx={{ pt: 1 }}>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {editingId || createParentId === null ? (
                <Controller
                  control={control}
                  name="parentId"
                  render={({ field }) => (
                    <Autocomplete
                      options={filteredParentOptions}
                      getOptionLabel={(option) =>
                        `${"- ".repeat(Math.max(0, option.depth - 1))}${option.title || `#${option.id}`}`
                      }
                      value={filteredParentOptions.find((cat) => cat.id === field.value) || null}
                      isOptionEqualToValue={(option, value) => option.id === value.id}
                      onChange={(_, value) => field.onChange(value ? value.id : null)}
                      renderInput={(params) => (
                        <TextField {...params} label={t("parentCategory")} helperText={t("parentCategoryHint")} />
                      )}
                    />
                  )}
                />
              ) : (
                <TextField label={t("parentCategory")} value={parentLabel} disabled fullWidth />
              )}
              <TranslationsEditor
                value={translations}
                onChange={setTranslations}
                titleLabel={t("title")}
                helperText={t("translationsHint")}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setOpen(false);
                setEditingId(null);
                setCreateParentId(null);
              }}
            >
              {t("cancel")}
            </Button>
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
