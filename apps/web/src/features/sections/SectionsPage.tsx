import React from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { fetchSections, createSection, deleteSection } from "./sections.api";
import { DataTable } from "../../shared/ui/DataTable";
import { Page } from "../../shared/ui/Page";
import { EmptyState } from "../../shared/ui/EmptyState";

const schema = z.object({
  title: z.string().min(1)
});

type FormValues = z.infer<typeof schema>;

export default function SectionsPage() {
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["sections"], queryFn: () => fetchSections({ page: 1, pageSize: 50 }) });

  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      createSection({ translations: [{ lang: "ru", title: values.title }] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sections"] });
      setOpen(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSection,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sections"] })
  });

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = (values: FormValues) => {
    createMutation.mutate(values);
  };

  const rows = data?.data || [];

  return (
    <Page title="Sections" action={<Button variant="contained" onClick={() => setOpen(true)}>New section</Button>}>
      {rows.length === 0 ? (
        <EmptyState title="No sections yet" />
      ) : (
        <DataTable
          rows={rows}
          columns={[
            { key: "title", label: "Title" },
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
        <DialogTitle>New section</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <TextField label="Title (RU)" fullWidth margin="dense" {...register("title")} error={!!errors.title} />
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
