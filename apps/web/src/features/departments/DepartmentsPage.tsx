import React from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { fetchDepartments, createDepartment, deleteDepartment } from "./departments.api";
import { DataTable } from "../../shared/ui/DataTable";
import { Page } from "../../shared/ui/Page";
import { EmptyState } from "../../shared/ui/EmptyState";

const schema = z.object({
  name: z.string().min(1),
  parentId: z.string().optional()
});

type FormValues = z.infer<typeof schema>;

export default function DepartmentsPage() {
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["departments"], queryFn: () => fetchDepartments({ page: 1, pageSize: 50 }) });

  const createMutation = useMutation({
    mutationFn: createDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      setOpen(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDepartment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["departments"] })
  });

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = (values: FormValues) => {
    createMutation.mutate({ name: values.name, parentId: values.parentId ? Number(values.parentId) : null });
  };

  const rows = data?.data || [];

  return (
    <Page title="Departments" action={<Button variant="contained" onClick={() => setOpen(true)}>New department</Button>}>
      {rows.length === 0 ? (
        <EmptyState title="No departments yet" />
      ) : (
        <DataTable
          rows={rows}
          columns={[
            { key: "name", label: "Name" },
            { key: "parent_id", label: "Parent" },
            { key: "depth", label: "Depth" },
            {
              key: "actions",
              label: "Actions",
              render: (row) => (
                <Button size="small" color="error" onClick={() => deleteMutation.mutate(row.id)}>
                  Delete
                </Button>
              )
            }
          ]}
        />
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New department</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <TextField label="Name" fullWidth margin="dense" {...register("name")} error={!!errors.name} />
            <TextField label="Parent ID" fullWidth margin="dense" {...register("parentId")} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={createMutation.isPending}>
              Create
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Page>
  );
}
