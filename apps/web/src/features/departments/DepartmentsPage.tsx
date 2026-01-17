import React from "react";
import {
  Autocomplete,
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
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { fetchDepartments, createDepartment, deleteDepartment, updateDepartment } from "./departments.api";
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

const schema = z.object({
  name: z.string().min(1),
  parentId: z.number().nullable().optional()
});

type FormValues = z.infer<typeof schema>;

type DepartmentRow = {
  id: number;
  name: string;
  parent_id?: number | null;
  depth: number;
};

const defaultValues: FormValues = {
  name: "",
  parentId: null
};

export default function DepartmentsPage() {
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<DepartmentRow | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<DepartmentRow | null>(null);
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
    queryKey: ["departments", page, pageSize, search],
    queryFn: () => fetchDepartments({ page, pageSize, q: search })
  });

  const { data: departmentsOptions } = useQuery({
    queryKey: ["departments", "options", 500],
    queryFn: () => fetchDepartments({ page: 1, pageSize: 500 })
  });

  const rows: DepartmentRow[] = data?.data || [];
  const meta = data?.meta || { page, pageSize, total: 0 };
  const allDepartments: DepartmentRow[] = departmentsOptions?.data || [];

  const createMutation = useMutation({
    mutationFn: createDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      setOpen(false);
      setEditing(null);
      showToast({ message: t("departmentCreated"), severity: "success" });
    },
    onError: (error) => showToast({ message: getErrorMessage(error, t("actionFailed")), severity: "error" })
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => updateDepartment(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      setOpen(false);
      setEditing(null);
      showToast({ message: t("departmentUpdated"), severity: "success" });
    },
    onError: (error) => showToast({ message: getErrorMessage(error, t("actionFailed")), severity: "error" })
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      showToast({ message: t("departmentDeleted"), severity: "success" });
    },
    onError: (error) => showToast({ message: getErrorMessage(error, t("actionFailed")), severity: "error" })
  });

  const { register, handleSubmit, control, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues
  });

  React.useEffect(() => {
    if (editing) {
      reset({
        name: editing.name,
        parentId: editing.parent_id ?? null
      });
    } else {
      reset(defaultValues);
    }
  }, [editing, reset]);

  const onSubmit = (values: FormValues) => {
    const payload = {
      name: values.name,
      parentId: values.parentId || null
    };

    if (editing) {
      updateMutation.mutate({ id: editing.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const parentOptions = editing
    ? allDepartments.filter((dept) => dept.id !== editing.id)
    : allDepartments;

  return (
    <Page
      title={t("departments")}
      subtitle={t("departmentsSubtitle")}
      action={
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
          {t("newDepartment")}
        </Button>
      }
    >
      <FiltersBar>
        <SearchField value={search} onChange={setSearch} placeholder={t("searchDepartments")} />
      </FiltersBar>

      {isLoading ? (
        <LoadingState rows={6} />
      ) : rows.length === 0 ? (
        <EmptyState title={t("departmentsEmpty")} subtitle={t("departmentsEmptySubtitle")} action={{ label: t("newDepartment"), onClick: () => setOpen(true) }} />
      ) : (
        <DataTable
          rows={rows}
          columns={[
            {
              key: "name",
              label: t("name"),
              render: (row) => `${"- ".repeat(Math.max(0, row.depth - 1))}${row.name}`
            },
            {
              key: "parent",
              label: t("parent"),
              render: (row) => {
                const parent = allDepartments.find((dept) => dept.id === row.parent_id);
                return parent?.name || "-";
              }
            },
            { key: "depth", label: t("depth") },
            {
              key: "actions",
              label: t("actions"),
              align: "right",
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

      <Dialog open={open || !!editing} onClose={() => { setOpen(false); setEditing(null); }} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? t("editDepartment") : t("newDepartment")}</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent sx={{ pt: 1 }}>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField label={t("name")} fullWidth {...register("name")} />
              <Controller
                control={control}
                name="parentId"
                render={({ field }) => (
                  <Autocomplete
                    options={parentOptions}
                    getOptionLabel={(option) => `${"- ".repeat(Math.max(0, option.depth - 1))}${option.name}`}
                    value={parentOptions.find((dept) => dept.id === field.value) || null}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    onChange={(_, value) => field.onChange(value ? value.id : null)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={t("parent")}
                        helperText={t("parentDepartmentHint")}
                      />
                    )}
                  />
                )}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setOpen(false); setEditing(null); }}>{t("cancel")}</Button>
            <Button type="submit" variant="contained" disabled={createMutation.isPending || updateMutation.isPending}>
              {editing ? t("save") : t("create")}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDelete}
        title={t("confirmDelete")}
        description={t("confirmDeleteDepartment")}
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
