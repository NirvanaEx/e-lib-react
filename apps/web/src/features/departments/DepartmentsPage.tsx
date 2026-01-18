import React from "react";
import {
  Autocomplete,
  Box,
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
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
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
import { formatDateTime } from "../../shared/utils/date";

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
  created_at?: string;
  updated_at?: string;
  dataCount?: number;
  dataOwnCount?: number;
};

type TreeRow = DepartmentRow & {
  treeDepth: number;
  hasChildren: boolean;
};

const defaultValues: FormValues = {
  name: "",
  parentId: null
};

export default function DepartmentsPage() {
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<DepartmentRow | null>(null);
  const [createParentId, setCreateParentId] = React.useState<number | null>(null);
  const [expandedIds, setExpandedIds] = React.useState<Set<number>>(new Set());
  const autoExpandRef = React.useRef(false);
  const [confirmDelete, setConfirmDelete] = React.useState<DepartmentRow | null>(null);
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [sort, setSort] = React.useState<{ key: string | null; direction: "asc" | "desc" | null }>({
    key: null,
    direction: null
  });
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { t } = useTranslation();

  React.useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  React.useEffect(() => {
    autoExpandRef.current = false;
  }, [search, page, pageSize]);

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
      return;
    }
    if (open) {
      reset({
        name: "",
        parentId: createParentId ?? null
      });
    }
  }, [editing, createParentId, open, reset]);

  const handleOpenCreate = (parentId?: number | null) => {
    setEditing(null);
    const nextParentId = parentId ?? null;
    setCreateParentId(nextParentId);
    setOpen(true);
  };

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

  const treeRows: TreeRow[] = React.useMemo(() => {
    const rowsById = new Map(rows.map((row) => [row.id, row]));
    const childrenMap = new Map<number | null, DepartmentRow[]>();

    rows.forEach((row) => {
      const parentKey = row.parent_id && rowsById.has(row.parent_id) ? row.parent_id : null;
      if (!childrenMap.has(parentKey)) {
        childrenMap.set(parentKey, []);
      }
      childrenMap.get(parentKey)?.push(row);
    });

    const sortRootsByName = (items: DepartmentRow[]) => {
      if (sort.key !== "name" || !sort.direction) return items;
      const sorted = [...items].sort((a, b) =>
        String(a.name || "").localeCompare(String(b.name || ""), undefined, { numeric: true, sensitivity: "base" })
      );
      return sort.direction === "asc" ? sorted : sorted.reverse();
    };

    const result: TreeRow[] = [];
    const walk = (node: DepartmentRow, depth: number) => {
      const children = childrenMap.get(node.id) || [];
      result.push({ ...node, treeDepth: depth, hasChildren: children.length > 0 });
      if (expandedIds.has(node.id)) {
        children.forEach((child) => walk(child, depth + 1));
      }
    };

    const roots = sortRootsByName(childrenMap.get(null) || []);
    roots.forEach((root) => walk(root, 1));
    return result;
  }, [rows, expandedIds, sort]);

  const defaultExpandedIds = React.useMemo(() => {
    const childrenByParent = new Map<number, number>();
    rows.forEach((row) => {
      if (row.parent_id) {
        childrenByParent.set(row.parent_id, (childrenByParent.get(row.parent_id) || 0) + 1);
      }
    });
    return new Set<number>(childrenByParent.keys());
  }, [rows]);

  React.useEffect(() => {
    if (!autoExpandRef.current && defaultExpandedIds.size > 0) {
      setExpandedIds(new Set(defaultExpandedIds));
      autoExpandRef.current = true;
    }
  }, [defaultExpandedIds]);

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

  return (
    <Page
      title={t("departments")}
      subtitle={t("departmentsSubtitle")}
      action={
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenCreate()}>
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
        <EmptyState
          title={t("departmentsEmpty")}
          subtitle={t("departmentsEmptySubtitle")}
          action={{ label: t("newDepartment"), onClick: () => handleOpenCreate() }}
        />
      ) : (
        <DataTable
          rows={treeRows}
          sort={sort}
          onSortChange={(key, direction) =>
            setSort(direction ? { key, direction } : { key: null, direction: null })
          }
          columns={[
            {
              key: "name",
              label: t("name"),
              sortable: true,
              render: (row) => (
                <Stack direction="row" alignItems="center" spacing={0.5} sx={{ pl: Math.max(0, row.treeDepth - 1) * 2 }}>
                  {row.hasChildren ? (
                    <IconButton size="small" onClick={() => toggleExpanded(row.id)}>
                      {expandedIds.has(row.id) ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
                    </IconButton>
                  ) : (
                    <Box sx={{ width: 32 }} />
                  )}
                  <Box sx={{ minWidth: 0 }}>{row.name}</Box>
                </Stack>
              )
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
              key: "dataOwnCount",
              label: t("dataOwnCount"),
              sortable: false,
              render: (row) => row.dataOwnCount ?? 0
            },
            {
              key: "dataCount",
              label: t("dataCount"),
              sortable: false,
              render: (row) => row.dataCount ?? 0
            },
            {
              key: "actions",
              label: t("actions"),
              align: "right",
              sortable: false,
              render: (row) => (
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Tooltip title={t("newDepartment")}>
                    <IconButton size="small" onClick={() => handleOpenCreate(row.id)}>
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
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

      <Dialog
        open={open || !!editing}
        onClose={() => {
          setOpen(false);
          setEditing(null);
          setCreateParentId(null);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{editing ? t("editDepartment") : t("newDepartment")}</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent sx={{ pt: 1 }}>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField label={t("name")} fullWidth required {...register("name")} />
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
            <Button
              onClick={() => {
                setOpen(false);
                setEditing(null);
                setCreateParentId(null);
              }}
            >
              {t("cancel")}
            </Button>
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
