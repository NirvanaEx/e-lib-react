import React from "react";
import {
  Button,
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
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createPosition, deletePosition, fetchPositions, updatePosition } from "./positions.api";
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
import { getErrorMessage } from "../../shared/utils/errors";
import { formatDateTime } from "../../shared/utils/date";

const schema = z.object({
  name: z.string().min(1)
});

type FormValues = z.infer<typeof schema>;

type PositionRow = {
  id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
  dataCount?: number;
};

export default function PositionsPage() {
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<PositionRow | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<PositionRow | null>(null);
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
    queryKey: ["positions", page, pageSize, search],
    queryFn: () => fetchPositions({ page, pageSize, q: search })
  });

  const rows: PositionRow[] = data?.data || [];
  const meta = data?.meta || { page, pageSize, total: 0 };

  // Справочник отказывает по коду, чтобы «занято» и «за должностью числятся
  // люди» читались на языке интерфейса, а не английской строкой с сервера.
  const getPositionErrorMessage = (error: unknown) => {
    const body = (error as { response?: { data?: { code?: string; userCount?: number } } })?.response?.data;
    if (body?.code === "POSITION_NAME_TAKEN") return t("positionNameTaken");
    if (body?.code === "POSITION_HAS_USERS") {
      return t("positionHasUsers", { count: Number(body.userCount || 0) });
    }
    return getErrorMessage(error, t("actionFailed"));
  };

  const closeDialog = () => {
    setOpen(false);
    setEditing(null);
  };

  const createMutation = useMutation({
    mutationFn: createPosition,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      closeDialog();
      showToast({ message: t("positionCreated"), severity: "success" });
    },
    onError: (error) => showToast({ message: getPositionErrorMessage(error), severity: "error" })
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => updatePosition(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      closeDialog();
      showToast({ message: t("positionUpdated"), severity: "success" });
    },
    onError: (error) => showToast({ message: getPositionErrorMessage(error), severity: "error" })
  });

  const deleteMutation = useMutation({
    mutationFn: deletePosition,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      showToast({ message: t("positionDeleted"), severity: "success" });
    },
    onError: (error) => showToast({ message: getPositionErrorMessage(error), severity: "error" })
  });

  const { register, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "" }
  });

  React.useEffect(() => {
    if (editing) {
      reset({ name: editing.name });
      return;
    }
    if (open) {
      reset({ name: "" });
    }
  }, [editing, open, reset]);

  const onSubmit = (values: FormValues) => {
    const payload = { name: values.name.trim() };
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <Page
      title={t("positions")}
      subtitle={t("positionsSubtitle")}
      action={
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
          {t("newPosition")}
        </Button>
      }
    >
      <FiltersBar>
        <SearchField value={search} onChange={setSearch} placeholder={t("searchPositions")} />
      </FiltersBar>

      {isLoading ? (
        <LoadingState rows={6} />
      ) : rows.length === 0 ? (
        <EmptyState
          title={t("positionsEmpty")}
          subtitle={t("positionsEmptySubtitle")}
          action={{ label: t("newPosition"), onClick: () => setOpen(true) }}
        />
      ) : (
        <DataTable
          rows={rows}
          columns={[
            {
              key: "name",
              label: t("name"),
              sortable: true
            },
            {
              key: "created_at",
              label: t("createdAt"),
              sortable: false,
              render: (row) => formatDateTime(row.created_at)
            },
            {
              key: "updated_at",
              label: t("updatedAt"),
              sortable: false,
              render: (row) => formatDateTime(row.updated_at)
            },
            {
              key: "dataCount",
              label: t("positionUsersCount"),
              sortable: true,
              render: (row) => row.dataCount ?? 0
            },
            {
              key: "actions",
              label: t("actions"),
              align: "right",
              sortable: false,
              render: (row) => (
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Tooltip title={t("edit")}>
                    <IconButton size="small" onClick={() => setEditing(row)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t("delete")}>
                    <IconButton size="small" color="error" onClick={() => setConfirmDelete(row)}>
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

      <Dialog open={open || !!editing} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? t("editPosition") : t("newPosition")}</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent sx={{ pt: 1 }}>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label={t("name")}
                fullWidth
                required
                helperText={t("positionNameHint")}
                {...register("name")}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDialog}>{t("cancel")}</Button>
            <Button type="submit" variant="contained" disabled={createMutation.isPending || updateMutation.isPending}>
              {editing ? t("save") : t("create")}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDelete}
        title={t("confirmDelete")}
        description={t("confirmDeletePosition")}
        confirmLabel={t("delete")}
        onConfirm={() => {
          if (confirmDelete) {
            deleteMutation.mutate(confirmDelete.id);
            setConfirmDelete(null);
          }
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </Page>
  );
}
