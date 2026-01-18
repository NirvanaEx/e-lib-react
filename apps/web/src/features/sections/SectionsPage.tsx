import React from "react";
import { Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, Tooltip } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSections, createSection, deleteSection, fetchSection, updateSection } from "./sections.api";
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

export default function SectionsPage() {
  const [open, setOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);
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
    queryKey: ["sections", page, pageSize, search],
    queryFn: () => fetchSections({ page, pageSize, q: search })
  });

  const { data: sectionDetails } = useQuery({
    queryKey: ["section", editingId],
    queryFn: () => fetchSection(editingId as number),
    enabled: !!editingId
  });

  React.useEffect(() => {
    if (sectionDetails?.translations) {
      setTranslations(sectionDetails.translations.map((item: any) => ({
        lang: item.lang,
        title: item.title
      })));
    }
  }, [sectionDetails]);

  const createMutation = useMutation({
    mutationFn: createSection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sections"] });
      setOpen(false);
      setTranslations([]);
      showToast({ message: t("sectionCreated"), severity: "success" });
    },
    onError: (error) => showToast({ message: getErrorMessage(error, t("actionFailed")), severity: "error" })
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => updateSection(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sections"] });
      setOpen(false);
      setEditingId(null);
      setTranslations([]);
      showToast({ message: t("sectionUpdated"), severity: "success" });
    },
    onError: (error) => showToast({ message: getErrorMessage(error, t("actionFailed")), severity: "error" })
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sections"] });
      showToast({ message: t("sectionDeleted"), severity: "success" });
    },
    onError: (error) => showToast({ message: getErrorMessage(error, t("actionFailed")), severity: "error" })
  });

  const rows = data?.data || [];
  const meta = data?.meta || { page, pageSize, total: 0 };

  const handleOpenCreate = () => {
    setEditingId(null);
    setTranslations([{ lang: "ru", title: "" }]);
    setOpen(true);
  };

  const handleOpenEdit = (id: number) => {
    setEditingId(id);
    setOpen(true);
  };

  const handleSave = () => {
    const normalized = translations
      .map((item) => ({
        lang: item.lang,
        title: (item.title || "").trim()
      }))
      .filter((item) => item.title.length > 0);

    if (normalized.length === 0) {
      showToast({ message: t("translationsRequired"), severity: "error" });
      return;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, payload: { translations: normalized } });
    } else {
      createMutation.mutate({ translations: normalized });
    }
  };

  return (
    <Page
      title={t("sections")}
      subtitle={t("sectionsSubtitle")}
      action={
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
          {t("newSection")}
        </Button>
      }
    >
      <FiltersBar>
        <SearchField value={search} onChange={setSearch} placeholder={t("searchSections")} />
      </FiltersBar>

      {isLoading ? (
        <LoadingState rows={6} />
      ) : rows.length === 0 ? (
        <EmptyState title={t("sectionsEmpty")} subtitle={t("sectionsEmptySubtitle")} action={{ label: t("newSection"), onClick: handleOpenCreate }} />
      ) : (
        <DataTable
          rows={rows}
          columns={[
            { key: "title", label: t("title") },
            {
              key: "langs",
              label: t("languages"),
              sortValue: (row) => (row.availableLangs || []).join(","),
              render: (row) => (
                <Stack direction="row" spacing={1}>
                  {(row.availableLangs || []).map((lang: string) => (
                    <Chip key={lang} size="small" label={lang.toUpperCase()} />
                  ))}
                </Stack>
              )
            },
            {
              key: "filesCount",
              label: t("filesCount"),
              render: (row) => row.filesCount ?? 0
            },
            {
              key: "createdAt",
              label: t("createdAt"),
              render: (row) => formatDateTime(row.createdAt)
            },
            {
              key: "updatedAt",
              label: t("updatedAt"),
              render: (row) => formatDateTime(row.updatedAt)
            },
            {
              key: "actions",
              label: t("actions"),
              align: "right",
              sortable: false,
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
        <DialogTitle>{editingId ? t("editSection") : t("newSection")}</DialogTitle>
        <DialogContent>
          <TranslationsEditor
            value={translations}
            onChange={setTranslations}
            titleLabel={t("title")}
            helperText={t("translationsHint")}
            requiredTitle
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpen(false); setEditingId(null); }}>{t("cancel")}</Button>
          <Button variant="contained" onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
            {editingId ? t("save") : t("create")}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDelete}
        title={t("confirmDelete")}
        description={t("confirmDeleteSection")}
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
