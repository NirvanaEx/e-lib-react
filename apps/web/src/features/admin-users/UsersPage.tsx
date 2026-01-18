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
  Tooltip,
  Typography
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import RestoreFromTrashIcon from "@mui/icons-material/RestoreFromTrash";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import LinkOffOutlinedIcon from "@mui/icons-material/LinkOffOutlined";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createUser,
  deleteUser,
  fetchRoles,
  fetchUsers,
  resetUserPassword,
  restoreUser,
  updateUser
} from "./users.api";
import { fetchDepartments } from "../departments/departments.api";
import { DataTable } from "../../shared/ui/DataTable";
import { Page } from "../../shared/ui/Page";
import { EmptyState } from "../../shared/ui/EmptyState";
import { useToast } from "../../shared/ui/ToastProvider";
import { LoadingState } from "../../shared/ui/LoadingState";
import { FiltersBar } from "../../shared/ui/FiltersBar";
import { PaginationBar } from "../../shared/ui/PaginationBar";
import { SearchField } from "../../shared/ui/SearchField";
import { ConfirmDialog } from "../../shared/ui/ConfirmDialog";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { buildPathMap, formatPath } from "../../shared/utils/tree";
import { formatDateTime } from "../../shared/utils/date";
import { useAuth } from "../../shared/hooks/useAuth";

const schema = z.object({
  login: z.string().min(1),
  surname: z.string().min(1),
  name: z.string().min(1),
  patronymic: z.string().optional(),
  roleId: z.coerce.number().min(1),
  departmentId: z.number().nullable().optional()
});

type FormValues = z.infer<typeof schema>;

type UserRow = {
  id: number;
  login: string;
  surname: string;
  name: string;
  patronymic?: string | null;
  role: string;
  role_id: number;
  role_level?: number;
  department?: string | null;
  department_id?: number | null;
  must_change_password?: boolean;
  deleted_at?: string | null;
  created_at?: string;
};

type RoleOption = { id: number; name: string; level?: number };

type DepartmentOption = { id: number; name: string; parent_id?: number | null; depth?: number };

const defaultValues: FormValues = {
  login: "",
  surname: "",
  name: "",
  patronymic: "",
  roleId: 0,
  departmentId: null
};

export default function UsersPage() {
  const [open, setOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<UserRow | null>(null);
  const [tempCredentials, setTempCredentials] = React.useState<{ login: string; tempPassword: string } | null>(null);
  const pendingCreateLoginRef = React.useRef<string | null>(null);
  const resetTargetRef = React.useRef<UserRow | null>(null);
  const [confirmAction, setConfirmAction] = React.useState<null | { type: "delete" | "restore"; user: UserRow }>(null);
  const [confirmReset, setConfirmReset] = React.useState<UserRow | null>(null);
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  React.useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  const { data, isLoading } = useQuery({
    queryKey: ["users", page, pageSize, search],
    queryFn: () => fetchUsers({ page, pageSize, q: search })
  });

  const { data: rolesData } = useQuery({ queryKey: ["roles"], queryFn: fetchRoles });
  const { data: departmentsData } = useQuery({
    queryKey: ["departments", "options", 200],
    queryFn: () => fetchDepartments({ page: 1, pageSize: 200 })
  });

  const roleOptions: RoleOption[] = rolesData || [];
  const departmentOptions: DepartmentOption[] = departmentsData?.data || [];

  const actorLevel = React.useMemo(() => {
    if (user?.role === "superadmin") return Number.MAX_SAFE_INTEGER;
    const byName = roleOptions.find((role) => role.name === user?.role);
    return user?.roleLevel ?? byName?.level ?? 0;
  }, [roleOptions, user?.role, user?.roleLevel]);

  const availableRoleOptions = React.useMemo(() => {
    if (user?.role === "superadmin") return roleOptions;
    return roleOptions.filter((role) => (role.level ?? 0) < actorLevel);
  }, [roleOptions, user?.role, actorLevel]);

  const canManageUser = (row: UserRow) => {
    if (user?.role === "superadmin") return true;
    const targetLevel = row.role_level ?? 0;
    return actorLevel > targetLevel;
  };

  const departmentPathById = React.useMemo(
    () =>
      buildPathMap(
        departmentOptions,
        (item) => item.id,
        (item) => item.parent_id ?? null,
        (item) => item.name
      ),
    [departmentOptions]
  );

  const getDepartmentPath = (id: number) => departmentPathById.get(id) || [`#${id}`];

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

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setOpen(false);
      setEditingUser(null);
      if (result?.tempPassword && pendingCreateLoginRef.current) {
        setTempCredentials({ login: pendingCreateLoginRef.current, tempPassword: result.tempPassword });
      }
      pendingCreateLoginRef.current = null;
      showToast({ message: t("userCreated"), severity: "success" });
    },
    onError: () => {
      pendingCreateLoginRef.current = null;
      showToast({ message: t("actionFailed"), severity: "error" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => updateUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setOpen(false);
      setEditingUser(null);
      showToast({ message: t("userUpdated"), severity: "success" });
    },
    onError: () => showToast({ message: t("actionFailed"), severity: "error" })
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      showToast({ message: t("userDeleted"), severity: "success" });
    },
    onError: () => showToast({ message: t("actionFailed"), severity: "error" })
  });

  const restoreMutation = useMutation({
    mutationFn: restoreUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      showToast({ message: t("userRestored"), severity: "success" });
    },
    onError: () => showToast({ message: t("actionFailed"), severity: "error" })
  });

  const resetMutation = useMutation({
    mutationFn: resetUserPassword,
    onSuccess: (result) => {
      const target = resetTargetRef.current;
      if (result?.tempPassword && target?.login) {
        setTempCredentials({ login: target.login, tempPassword: result.tempPassword });
      }
      resetTargetRef.current = null;
      queryClient.invalidateQueries({ queryKey: ["users"] });
      showToast({ message: t("tempPasswordGenerated"), severity: "info" });
    },
    onError: () => {
      resetTargetRef.current = null;
      showToast({ message: t("actionFailed"), severity: "error" });
    }
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    reset
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues });

  React.useEffect(() => {
    if (editingUser) {
      reset({
        login: editingUser.login,
        surname: editingUser.surname,
        name: editingUser.name,
        patronymic: editingUser.patronymic || "",
        roleId: editingUser.role_id,
        departmentId: editingUser.department_id ?? null
      });
    } else {
      reset(defaultValues);
    }
  }, [editingUser, reset]);

  const onSubmit = (values: FormValues) => {
    const payload = {
      login: values.login,
      surname: values.surname,
      name: values.name,
      patronymic: values.patronymic || null,
      roleId: values.roleId,
      departmentId: values.departmentId || null
    };

    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, payload });
    } else {
      pendingCreateLoginRef.current = values.login;
      createMutation.mutate(payload);
    }
  };

  const rows: UserRow[] = data?.data || [];
  const meta = data?.meta || { page, pageSize, total: 0 };

  const openCreate = () => {
    setEditingUser(null);
    setOpen(true);
  };

  const openEdit = (row: UserRow) => {
    setEditingUser(row);
    setOpen(true);
  };

  const handleCopyCredentials = async () => {
    if (!tempCredentials) return;
    await navigator.clipboard.writeText(
      `${t("login")}: ${tempCredentials.login}\n${t("temporaryPassword")}: ${tempCredentials.tempPassword}`
    );
    showToast({ message: t("copied"), severity: "success" });
  };

  return (
    <Page
      title={t("users")}
      subtitle={t("usersSubtitle")}
      action={
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          {t("newUser")}
        </Button>
      }
    >
      <FiltersBar>
        <SearchField value={search} onChange={setSearch} placeholder={t("searchUsers")} />
      </FiltersBar>

      {isLoading ? (
        <LoadingState rows={6} />
      ) : rows.length === 0 ? (
        <EmptyState title={t("usersEmpty")} subtitle={t("usersEmptySubtitle")} action={{ label: t("newUser"), onClick: openCreate }} />
      ) : (
        <DataTable
          rows={rows}
          columns={[
            { key: "login", label: t("login") },
            {
              key: "name",
              label: t("fullName"),
              sortValue: (row) => `${row.surname} ${row.name}${row.patronymic ? ` ${row.patronymic}` : ""}`.trim(),
              render: (row) => `${row.surname} ${row.name}${row.patronymic ? ` ${row.patronymic}` : ""}`
            },
            {
              key: "role",
              label: t("role"),
              render: (row) => <Chip size="small" label={row.role} />
            },
            {
              key: "department",
              label: t("department"),
              minWidth: 220,
              sortValue: (row) =>
                row.department_id ? formatPath(getDepartmentPath(row.department_id)) : "",
              render: (row) =>
                row.department_id ? renderPath(getDepartmentPath(row.department_id)) : "-"
            },
            {
              key: "status",
              label: t("status"),
              width: 120,
              sortValue: (row) => (row.deleted_at ? 1 : 0),
              render: (row) =>
                row.deleted_at ? (
                  <Chip size="small" color="warning" label={t("deleted")} />
                ) : (
                  <Chip size="small" color="success" label={t("active")} />
                )
            },
            {
              key: "created_at",
              label: t("createdAt"),
              width: 160,
              render: (row) => formatDateTime(row.created_at)
            },
            {
              key: "connectionStatus",
              label: t("connectionStatus"),
              align: "center",
              width: 90,
              sortValue: (row) => (row.must_change_password ? 0 : 1),
              render: (row) => (
                <Tooltip title={row.must_change_password ? t("statusDisconnected") : t("statusConnected")}>
                  <Box
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      color: row.must_change_password ? "warning.main" : "success.main"
                    }}
                  >
                    {row.must_change_password ? <LinkOffOutlinedIcon fontSize="small" /> : <LinkOutlinedIcon fontSize="small" />}
                  </Box>
                </Tooltip>
              )
            },
            {
              key: "actions",
              label: t("actions"),
              align: "right",
              width: 120,
              headerSx: { pr: 1 },
              cellSx: { pr: 1 },
              sortable: false,
              render: (row) => (
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  {!row.deleted_at && canManageUser(row) && (
                    <Tooltip title={t("edit")}>
                      <IconButton size="small" onClick={() => openEdit(row)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {!row.deleted_at && canManageUser(row) ? (
                    <Tooltip title={t("delete")}>
                      <IconButton size="small" color="error" onClick={() => setConfirmAction({ type: "delete", user: row })}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : row.deleted_at && canManageUser(row) ? (
                    <Tooltip title={t("restore")}>
                      <IconButton size="small" onClick={() => setConfirmAction({ type: "restore", user: row })}>
                        <RestoreFromTrashIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                  {canManageUser(row) && (
                    <Tooltip title={t("resetPassword")}>
                      <IconButton size="small" onClick={() => setConfirmReset(row)}>
                        <VpnKeyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
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

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingUser ? t("editUser") : t("newUser")}</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent sx={{ pt: 1 }}>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField label={t("login")} fullWidth required {...register("login")} error={!!errors.login} />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField label={t("surname")} fullWidth required {...register("surname")} error={!!errors.surname} />
                <TextField label={t("name")} fullWidth required {...register("name")} error={!!errors.name} />
              </Stack>
              <TextField label={t("patronymic")} fullWidth {...register("patronymic")} />
              <Controller
                control={control}
                name="roleId"
                render={({ field }) => (
                  <Autocomplete
                    options={availableRoleOptions}
                    getOptionLabel={(option) => option.name}
                    value={availableRoleOptions.find((role) => role.id === field.value) || null}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    onChange={(_, value) => field.onChange(value ? value.id : 0)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={t("role")}
                        required
                        error={!!errors.roleId}
                        helperText={errors.roleId?.message}
                      />
                    )}
                  />
                )}
              />
              <Controller
                control={control}
                name="departmentId"
                render={({ field }) => (
                  <Autocomplete
                    options={departmentOptions}
                    getOptionLabel={(option) => formatPath(getDepartmentPath(option.id))}
                    renderOption={(props, option) => {
                      const { key, ...optionProps } = props;
                      return (
                        <li key={option.id} {...optionProps}>
                          {renderPath(getDepartmentPath(option.id))}
                        </li>
                      );
                    }}
                    value={departmentOptions.find((dept) => dept.id === field.value) || null}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    onChange={(_, value) => field.onChange(value ? value.id : null)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={t("department")}
                        helperText={departmentOptions.length === 0 ? t("noDepartmentsHint") : ""}
                      />
                    )}
                  />
                )}
              />
              {departmentOptions.length === 0 && (
                <Button size="small" onClick={() => navigate("/dashboard/departments")}>
                  {t("createDepartment")}
                </Button>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>{t("cancel")}</Button>
            <Button type="submit" variant="contained" disabled={createMutation.isPending || updateMutation.isPending}>
              {editingUser ? t("save") : t("create")}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction?.type === "delete" ? t("confirmDelete") : t("confirmRestore")}
        description={confirmAction?.type === "delete" ? t("confirmDeleteUser") : t("confirmRestoreUser")}
        confirmLabel={confirmAction?.type === "delete" ? t("delete") : t("restore")}
        onConfirm={() => {
          if (!confirmAction) return;
          if (confirmAction.type === "delete") {
            deleteMutation.mutate(confirmAction.user.id);
          } else {
            restoreMutation.mutate(confirmAction.user.id);
          }
          setConfirmAction(null);
        }}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmDialog
        open={!!confirmReset}
        title={t("confirmReset")}
        description={t("confirmResetPassword")}
        confirmLabel={t("resetPassword")}
        onConfirm={() => {
          if (confirmReset) {
            resetTargetRef.current = confirmReset;
            resetMutation.mutate(confirmReset.id);
            setConfirmReset(null);
          }
        }}
        onCancel={() => setConfirmReset(null)}
      />

      <Dialog open={!!tempCredentials} onClose={() => setTempCredentials(null)} fullWidth maxWidth="xs">
        <DialogTitle>{t("temporaryPassword")}</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                border: "1px solid var(--border)",
                background: "var(--surface-2)",
                fontFamily: "monospace",
                fontSize: "1rem"
              }}
            >
              {t("login")}: {tempCredentials?.login}
              <br />
              {t("temporaryPassword")}: {tempCredentials?.tempPassword}
            </Box>
            <Button variant="outlined" startIcon={<ContentCopyIcon />} onClick={handleCopyCredentials}>
              {t("copy")}
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTempCredentials(null)}>{t("close")}</Button>
        </DialogActions>
      </Dialog>
    </Page>
  );
}
