import React from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { fetchCategories, createCategory, deleteCategory } from "./categories.api";
import { DataTable } from "../../shared/ui/DataTable";
import { Page } from "../../shared/ui/Page";
import { EmptyState } from "../../shared/ui/EmptyState";

const schema = z.object({
  title: z.string().min(1),
  sectionId: z.string().min(1),
  parentId: z.string().optional()
});

type FormValues = z.infer<typeof schema>;

export default function CategoriesPage() {
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["categories"], queryFn: () => fetchCategories({ page: 1, pageSize: 50 }) });

  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      createCategory({
        sectionId: Number(values.sectionId),
        parentId: values.parentId ? Number(values.parentId) : null,
        translations: [{ lang: "ru", title: values.title }]
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setOpen(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] })
  });

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = (values: FormValues) => {
    createMutation.mutate(values);
  };

  const rows = data?.data || [];

  return (
    <Page title="Categories" action={<Button variant="contained" onClick={() => setOpen(true)}>New category</Button>}>
      {rows.length === 0 ? (
        <EmptyState title="No categories yet" />
      ) : (
        <DataTable
          rows={rows}
          columns={[
            { key: "title", label: "Title" },
            { key: "sectionId", label: "Section" },
            { key: "parentId", label: "Parent" },
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
        <DialogTitle>New category</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <TextField label="Title (RU)" fullWidth margin="dense" {...register("title")} error={!!errors.title} />
            <TextField label="Section ID" fullWidth margin="dense" {...register("sectionId")} error={!!errors.sectionId} />
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
