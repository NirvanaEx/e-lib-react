import React from "react";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Page } from "../../shared/ui/Page";
import { useToast } from "../../shared/ui/ToastProvider";
import { useTranslation } from "react-i18next";
import { createRole, fetchPermissions, fetchRolePermissions, fetchRoles, updateRolePermissions } from "./roles.api";
import { useAuth } from "../../shared/hooks/useAuth";
import { hasAccess } from "../../shared/utils/access";

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

  React.useEffect(() => {
    if (!selectedRoleId && roles.length > 0) {
      setSelectedRoleId(roles[0].id);
    }
  }, [roles, selectedRoleId]);

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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      if (data?.id) {
        setSelectedRoleId(data.id);
      }
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

  const handleSave = () => {
    if (!selectedRoleId) return;
    updateMutation.mutate({ roleId: selectedRoleId, permissions: selectedPermissions });
  };

  const handleCreateRole = () => {
    const trimmed = newRoleName.trim();
    if (!trimmed) return;
    createMutation.mutate({ name: trimmed });
  };

  return (
    <Page title={t("roles")} subtitle={t("rolesSubtitle")}>
      <Stack direction={{ xs: "column", lg: "row" }} spacing={2}>
        <Paper sx={{ p: 2, borderRadius: 3, border: "1px solid var(--border)", minWidth: 240 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="subtitle2">{t("roles")}</Typography>
            {canCreate && (
              <Button size="small" variant="contained" onClick={() => setCreateOpen(true)}>
                {t("newRole")}
              </Button>
            )}
          </Stack>
          {rolesLoading ? (
            <Typography variant="body2" color="text.secondary">
              {t("loading")}
            </Typography>
          ) : roles.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t("noRoles")}
            </Typography>
          ) : (
            <Stack spacing={1}>
              {roles.map((role) => (
                <Button
                  key={role.id}
                  size="small"
                  fullWidth
                  variant={selectedRoleId === role.id ? "contained" : "outlined"}
                  onClick={() => setSelectedRoleId(role.id)}
                  sx={{ textTransform: "none", justifyContent: "flex-start", borderRadius: 2 }}
                >
                  {role.name}
                </Button>
              ))}
            </Stack>
          )}
        </Paper>

        <Paper sx={{ p: 2, borderRadius: 3, border: "1px solid var(--border)", flex: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="subtitle2">{t("permissions")}</Typography>
            {canUpdate && (
              <Button variant="contained" onClick={handleSave} disabled={updateMutation.isPending || !selectedRoleId}>
                {t("savePermissions")}
              </Button>
            )}
          </Stack>

          {!selectedRoleId ? (
            <Typography variant="body2" color="text.secondary">
              {t("selectRole")}
            </Typography>
          ) : rolePermissionsLoading ? (
            <Typography variant="body2" color="text.secondary">
              {t("loading")}
            </Typography>
          ) : (
            <Stack spacing={2}>
              {groupedPermissions.map((group) => (
                <Box key={group.group}>
                  <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: "0.16em" }}>
                    {group.group}
                  </Typography>
                  <Divider sx={{ my: 1 }} />
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
                </Box>
              ))}
            </Stack>
          )}
        </Paper>
      </Stack>

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
