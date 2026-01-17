import React from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Stack,
  Chip
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { fetchUsers, createUser, deleteUser, restoreUser, resetUserPassword } from "./users.api";
import { DataTable } from "../../shared/ui/DataTable";
import { Page } from "../../shared/ui/Page";
import { EmptyState } from "../../shared/ui/EmptyState";
import { useToast } from "../../shared/ui/ToastProvider";
import { LoadingState } from "../../shared/ui/LoadingState";

const schema = z.object({
  login: z.string().min(1),
  surname: z.string().min(1),
  name: z.string().min(1),
  patronymic: z.string().optional(),
  roleId: z.coerce.number(),
  departmentId: z.coerce.number().optional()
});

type FormValues = z.infer<typeof schema>;

export default function UsersPage() {
  const [open, setOpen] = React.useState(false);
  const [tempPassword, setTempPassword] = React.useState<string | null>(null);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { data, isLoading } = useQuery({ queryKey: ["users"], queryFn: () => fetchUsers({ page: 1, pageSize: 20 }) });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setOpen(false);
      if (data?.tempPassword) {
        setTempPassword(data.tempPassword);
      }
      showToast({ message: "User created", severity: "success" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      showToast({ message: "User deleted", severity: "success" });
    }
  });

  const restoreMutation = useMutation({
    mutationFn: restoreUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      showToast({ message: "User restored", severity: "success" });
    }
  });

  const resetMutation = useMutation({
    mutationFn: resetUserPassword,
    onSuccess: (data) => {
      if (data?.tempPassword) {
        setTempPassword(data.tempPassword);
      }
      showToast({ message: "Temporary password generated", severity: "info" });
    }
  });

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = (values: FormValues) => {
    createMutation.mutate(values);
  };

  const rows = data?.data || [];

  return (
    <Page
      title="Users"
      action={
        <Button variant="contained" onClick={() => setOpen(true)}>
          New user
        </Button>
      }
    >
      {isLoading ? (
        <LoadingState />
      ) : rows.length === 0 ? (
        <EmptyState title="No users yet" />
      ) : (
        <DataTable
          rows={rows}
          columns={[
            { key: "login", label: "Login" },
            { key: "role", label: "Role" },
            {
              key: "status",
              label: "Status",
              render: (row) =>
                row.deleted_at ? <Chip label="Deleted" color="warning" size="small" /> : <Chip label="Active" color="success" size="small" />
            },
            {
              key: "actions",
              label: "Actions",
              render: (row) => (
                <Stack direction="row" spacing={1}>
                  {!row.deleted_at && (
                    <Button size="small" color="error" onClick={() => deleteMutation.mutate(row.id)}>
                      Delete
                    </Button>
                  )}
                  {row.deleted_at && (
                    <Button size="small" onClick={() => restoreMutation.mutate(row.id)}>
                      Restore
                    </Button>
                  )}
                  <Button size="small" onClick={() => resetMutation.mutate(row.id)}>
                    Reset password
                  </Button>
                </Stack>
              )
            }
          ]}
        />
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New user</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <TextField label="Login" fullWidth margin="dense" {...register("login")} error={!!errors.login} />
            <TextField label="Surname" fullWidth margin="dense" {...register("surname")} error={!!errors.surname} />
            <TextField label="Name" fullWidth margin="dense" {...register("name")} error={!!errors.name} />
            <TextField label="Patronymic" fullWidth margin="dense" {...register("patronymic")} />
            <TextField label="Role ID" fullWidth margin="dense" {...register("roleId")} />
            <TextField label="Department ID" fullWidth margin="dense" {...register("departmentId")} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={createMutation.isPending}>
              Create
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      {tempPassword && (
        <Dialog open onClose={() => setTempPassword(null)} fullWidth maxWidth="xs">
          <DialogTitle>Temporary password</DialogTitle>
          <DialogContent>{tempPassword}</DialogContent>
          <DialogActions>
            <Button onClick={() => setTempPassword(null)}>Close</Button>
          </DialogActions>
        </Dialog>
      )}
    </Page>
  );
}
