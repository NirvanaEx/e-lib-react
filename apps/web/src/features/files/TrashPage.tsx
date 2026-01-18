import React from "react";
import { Button, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import RestoreFromTrashIcon from "@mui/icons-material/RestoreFromTrash";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchTrash, restoreFile, forceDelete } from "./files.api";
import { DataTable } from "../../shared/ui/DataTable";
import { Page } from "../../shared/ui/Page";
import { EmptyState } from "../../shared/ui/EmptyState";
import { LoadingState } from "../../shared/ui/LoadingState";
import { FiltersBar } from "../../shared/ui/FiltersBar";
import { PaginationBar } from "../../shared/ui/PaginationBar";
import { SearchField } from "../../shared/ui/SearchField";
import { ConfirmDialog } from "../../shared/ui/ConfirmDialog";
import { useToast } from "../../shared/ui/ToastProvider";
import { useTranslation } from "react-i18next";
import { formatDateTime } from "../../shared/utils/date";
import { getErrorMessage } from "../../shared/utils/errors";

export default function TrashPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [confirmRestore, setConfirmRestore] = React.useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<number | null>(null);

  React.useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  const { data, isLoading } = useQuery({
    queryKey: ["trash", page, pageSize, search],
    queryFn: () => fetchTrash({ page, pageSize, q: search })
  });

  const restoreMutation = useMutation({
    mutationFn: restoreFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      showToast({ message: t("fileRestored"), severity: "success" });
    },
    onError: (error) => showToast({ message: getErrorMessage(error, t("actionFailed")), severity: "error" })
  });

  const forceMutation = useMutation({
    mutationFn: forceDelete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      showToast({ message: t("fileDeleted"), severity: "success" });
    },
    onError: (error) => showToast({ message: getErrorMessage(error, t("actionFailed")), severity: "error" })
  });

  const rows = data?.data || [];
  const meta = data?.meta || { page, pageSize, total: 0 };

  return (
    <Page title={t("trash")} subtitle={t("trashSubtitle")}
      action={
        <Typography variant="body2" color="text.secondary">
          {t("trashHint")}
        </Typography>
      }
    >
      <FiltersBar>
        <SearchField value={search} onChange={setSearch} placeholder={t("searchTrash")} />
      </FiltersBar>

      {isLoading ? (
        <LoadingState rows={6} />
      ) : rows.length === 0 ? (
        <EmptyState title={t("trashEmpty")} subtitle={t("trashEmptySubtitle")} />
      ) : (
        <DataTable
          rows={rows}
          columns={[
            { key: "title", label: t("title") },
            { key: "deletedAt", label: t("deletedAt"), render: (row) => formatDateTime(row.deletedAt) },
            {
              key: "actions",
              label: t("actions"),
              align: "right",
              sortable: false,
              render: (row) => (
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Tooltip title={t("restore")}>
                    <IconButton size="small" onClick={() => setConfirmRestore(row.id)}>
                      <RestoreFromTrashIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t("deleteForever")}>
                    <IconButton size="small" color="error" onClick={() => setConfirmDelete(row.id)}>
                      <DeleteForeverIcon fontSize="small" />
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

      <ConfirmDialog
        open={!!confirmRestore}
        title={t("confirmRestore")}
        description={t("confirmRestoreFile")}
        confirmLabel={t("restore")}
        onConfirm={() => {
          if (confirmRestore) {
            restoreMutation.mutate(confirmRestore);
            setConfirmRestore(null);
          }
        }}
        onCancel={() => setConfirmRestore(null)}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title={t("confirmDelete")}
        description={t("confirmForceDeleteFile")}
        confirmLabel={t("deleteForever")}
        onConfirm={() => {
          if (confirmDelete) {
            forceMutation.mutate(confirmDelete);
            setConfirmDelete(null);
          }
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </Page>
  );
}
