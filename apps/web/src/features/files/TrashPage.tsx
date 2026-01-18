import React from "react";
import { IconButton, Stack, Tooltip, Typography } from "@mui/material";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import RestoreFromTrashIcon from "@mui/icons-material/RestoreFromTrash";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { fetchTrash, restoreTrashItem, forceDeleteTrashItem } from "./files.api";

type TrashItem = {
  id: number;
  type: "file" | "version" | "asset";
  title: string | null;
  deletedAt: string;
  fileId?: number | null;
  versionId?: number | null;
  versionNumber?: number | null;
  assetLang?: string | null;
  assetName?: string | null;
};

export default function TrashPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [confirmRestore, setConfirmRestore] = React.useState<TrashItem | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<TrashItem | null>(null);

  React.useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  const { data, isLoading } = useQuery({
    queryKey: ["trash", page, pageSize, search],
    queryFn: () => fetchTrash({ page, pageSize, q: search })
  });

  const restoreMutation = useMutation({
    mutationFn: restoreTrashItem,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      const message =
        variables.type === "file"
          ? t("fileRestored")
          : variables.type === "version"
            ? t("versionRestored")
            : t("assetRestored");
      showToast({ message, severity: "success" });
    },
    onError: (error) => showToast({ message: getErrorMessage(error, t("actionFailed")), severity: "error" })
  });

  const forceMutation = useMutation({
    mutationFn: forceDeleteTrashItem,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      const message =
        variables.type === "file"
          ? t("fileDeleted")
          : variables.type === "version"
            ? t("versionDeletedForever")
            : t("assetDeletedForever");
      showToast({ message, severity: "success" });
    },
    onError: (error) => showToast({ message: getErrorMessage(error, t("actionFailed")), severity: "error" })
  });

  const rows = (data?.data || []) as TrashItem[];
  const meta = data?.meta || { page, pageSize, total: 0 };
  const getTypeLabel = (type: TrashItem["type"]) =>
    type === "file" ? t("trashTypeFile") : type === "version" ? t("trashTypeVersion") : t("trashTypeAsset");
  const getDetails = (row: TrashItem) => {
    if (row.type === "version") {
      return row.versionNumber ? t("trashVersionLabel", { number: row.versionNumber }) : "-";
    }
    if (row.type === "asset") {
      const parts = [row.assetLang ? row.assetLang.toUpperCase() : null, row.assetName || null].filter(Boolean);
      return parts.length ? parts.join(" · ") : "-";
    }
    return "-";
  };
  const getRestoreDescription = (type: TrashItem["type"]) =>
    type === "file"
      ? t("confirmRestoreFile")
      : type === "version"
        ? t("confirmRestoreVersion")
        : t("confirmRestoreAsset");
  const getDeleteDescription = (type: TrashItem["type"]) =>
    type === "file"
      ? t("confirmForceDeleteFile")
      : type === "version"
        ? t("confirmForceDeleteVersion")
        : t("confirmForceDeleteAsset");

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
          rows={rows}columns={[
            { key: "type", label: t("type"), render: (row) => getTypeLabel(row.type) },
            { key: "deletedAt", label: t("deletedAt"), render: (row) => formatDateTime(row.deletedAt) },
            {
              key: "actions",
              label: t("actions"),
              align: "right",
              sortable: false,
              width: 96,
              render: (row) => (
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Tooltip title={t("restore")}>
                    <IconButton size="small" onClick={() => setConfirmRestore(row)}>
                      <RestoreFromTrashIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t("deleteForever")}>
                    <IconButton size="small" color="error" onClick={() => setConfirmDelete(row)}>
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
        description={confirmRestore ? getRestoreDescription(confirmRestore.type) : t("confirmRestore")}
        confirmLabel={t("restore")}
        onConfirm={() => {
          if (confirmRestore) {
            restoreMutation.mutate({ id: confirmRestore.id, type: confirmRestore.type });
            setConfirmRestore(null);
          }
        }}
        onCancel={() => setConfirmRestore(null)}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title={t("confirmDelete")}
        description={confirmDelete ? getDeleteDescription(confirmDelete.type) : t("confirmDelete")}
        confirmLabel={t("deleteForever")}
        onConfirm={() => {
          if (confirmDelete) {
            forceMutation.mutate({ id: confirmDelete.id, type: confirmDelete.type });
            setConfirmDelete(null);
          }
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </Page>
  );
}
