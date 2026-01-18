import React from "react";
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Page } from "../../shared/ui/Page";
import { DataTable } from "../../shared/ui/DataTable";
import { EmptyState } from "../../shared/ui/EmptyState";
import { LoadingState } from "../../shared/ui/LoadingState";
import { useToast } from "../../shared/ui/ToastProvider";
import { useTranslation } from "react-i18next";
import { createRole, fetchPermissions, fetchRolePermissions, fetchRoles, updateRolePermissions } from "./roles.api";
import { useAuth } from "../../shared/hooks/useAuth";
import { hasAccess } from "../../shared/utils/access";
import { formatDateTime } from "../../shared/utils/date";

type Role = { id: number; name: string };
type Permission = { id: number; name: string };

export default function RolesPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRoleId, setSelectedRoleId] = React.useState<number | null>(null);
  const [selectedPermissions, setSelectedPermissions] = React.useState<string[]>([]);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [permissionsOpen, setPermissionsOpen] = React.useState(false);
  const [newRoleName, setNewRoleName] = React.useState("");

  const canUpdate = hasAccess(user, ["role.update"]);
  const canCreate = hasAccess(user, ["role.add"]);

  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: fetchRoles
  });

  const { data: permissionsData } = useQuery({
    queryKey: ["permissions"],
    queryFn: fetchPermissions
  });

  const roles: Role[] = rolesData || [];
  const permissions: Permission[] = permissionsData || [];

  const selectedRole = roles.find((role) => role.id === selectedRoleId) || null;

  const { data: rolePermissionsData, isLoading: rolePermissionsLoading } = useQuery({
    queryKey: ["role-permissions", selectedRoleId],
    queryFn: () => fetchRolePermissions(selectedRoleId as number),
    enabled: !!selectedRoleId
  });

  React.useEffect(() => {
    if (rolePermissionsData?.permissions) {
      setSelectedPermissions(rolePermissionsData.permissions);
    }
  }, [rolePermissionsData]);

  const updateMutation = useMutation({
    mutationFn: (payload: { roleId: number; permissions: string[] }) =>
      updateRolePermissions(payload.roleId, { permissions: payload.permissions }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-permissions"] });
      showToast({ message: t("rolePermissionsUpdated"), severity: "success" });
    },
    onError: () => showToast({ message: t("rolePermissionsUpdateFailed"), severity: "error" })
  });

  const createMutation = useMutation({
    mutationFn: (payload: { name: string }) => createRole(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setNewRoleName("");
      setCreateOpen(false);
      showToast({ message: t("roleCreated"), severity: "success" });
    },
    onError: () => showToast({ message: t("roleCreateFailed"), severity: "error" })
  });

  const groupedPermissions = React.useMemo(() => {
    const groups = new Map<string, string[]>();
    permissions.forEach((permission) => {
      const [group] = permission.name.split(".");
      const key = group || "other";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)?.push(permission.name);
    });
    return Array.from(groups.entries())
      .map(([group, items]) => ({ group, items: items.sort() }))
      .sort((a, b) => a.group.localeCompare(b.group));
  }, [permissions]);

  const togglePermission = (permission: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permission) ? prev.filter((item) => item !== permission) : [...prev, permission]
    );
  };

  const handleCreateRole = () => {
    const trimmed = newRoleName.trim();
    if (!trimmed) return;
    createMutation.mutate({ name: trimmed });
  };

  const handleOpenPermissions = (roleId: number) => {
    setSelectedRoleId(roleId);
    setPermissionsOpen(true);
  };

  const handleClosePermissions = () => {
    setPermissionsOpen(false);
    setSelectedRoleId(null);
    setSelectedPermissions([]);
  };

  const handleSavePermissions = () => {
    if (!selectedRoleId) return;
    updateMutation.mutate({ roleId: selectedRoleId, permissions: selectedPermissions });
  };

  return (
    <Page
      title={t("roles")}
      subtitle={t("rolesSubtitle")}
      action={
        canCreate ? (
          <Button variant="contained" onClick={() => setCreateOpen(true)}>
            {t("newRole")}
          </Button>
        ) : null
      }
    >
      {rolesLoading ? (
        <LoadingState rows={6} />
      ) : roles.length === 0 ? (
        <EmptyState title={t("noRoles")} subtitle={t("rolesSubtitle")} />
      ) : (
        <DataTable
          rows={roles}
          columns={[
            { key: "name", label: t("role") },
            {
              key: "created_at",
              label: t("createdAt"),
              render: (row) => formatDateTime(row.created_at)
            },
            {
              key: "updated_at",
              label: t("updatedAt"),
              render: (row) => formatDateTime(row.updated_at)
            },
            {
              key: "actions",
              label: t("actions"),
              align: "right",
              render: (row) => (
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button size="small" variant="outlined" onClick={() => handleOpenPermissions(row.id)}>
                    {t("managePermissions")}
                  </Button>
                </Stack>
              )
            }
          ]}
        />
      )}

      <Dialog open={permissionsOpen} onClose={handleClosePermissions} fullWidth maxWidth="md">
        <DialogTitle>
          {selectedRole ? `${t("permissions")} · ${selectedRole.name}` : t("permissions")}
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          {!selectedRoleId ? (
            <Typography variant="body2" color="text.secondary">
              {t("selectRole")}
            </Typography>
          ) : rolePermissionsLoading ? (
            <Typography variant="body2" color="text.secondary">
              {t("loading")}
            </Typography>
          ) : groupedPermissions.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t("noPermissions")}
            </Typography>
          ) : (
            <Stack spacing={2} sx={{ mt: 1 }}>
              {groupedPermissions.map((group) => (
                <Stack key={group.group} spacing={1}>
                  <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: "0.16em" }}>
                    {group.group}
                  </Typography>
                  <Divider />
                  <Stack spacing={0.5}>
                    {group.items.map((permission) => (
                      <FormControlLabel
                        key={permission}
                        control={
                          <Checkbox
                            checked={selectedPermissions.includes(permission)}
                            onChange={() => togglePermission(permission)}
                            disabled={!canUpdate}
                          />
                        }
                        label={permission}
                      />
                    ))}
                  </Stack>
                </Stack>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePermissions}>{t("cancel")}</Button>
          <Button
            variant="contained"
            onClick={handleSavePermissions}
            disabled={!canUpdate || updateMutation.isPending || !selectedRoleId}
          >
            {t("savePermissions")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{t("newRole")}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            fullWidth
            label={t("roleName")}
            value={newRoleName}
            onChange={(event) => setNewRoleName(event.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>{t("cancel")}</Button>
          <Button variant="contained" onClick={handleCreateRole} disabled={createMutation.isPending}>
            {t("createRole")}
          </Button>
        </DialogActions>
      </Dialog>
    </Page>
  );
}
