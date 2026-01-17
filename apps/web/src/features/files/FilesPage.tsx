import React from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { fetchFiles, createFile, deleteFile } from "./files.api";
import { DataTable } from "../../shared/ui/DataTable";
import { Page } from "../../shared/ui/Page";
import { EmptyState } from "../../shared/ui/EmptyState";
import { useNavigate } from "react-router-dom";
import { LoadingState } from "../../shared/ui/LoadingState";

const schema = z.object({
  title: z.string().min(1),
  sectionId: z.string().min(1),
  categoryId: z.string().min(1)
});

type FormValues = z.infer<typeof schema>;

export default function FilesPage() {
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["files"], queryFn: () => fetchFiles({ page: 1, pageSize: 20 }) });

  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      createFile({
        sectionId: Number(values.sectionId),
        categoryId: Number(values.categoryId),
        accessType: "public",
        translations: [{ lang: "ru", title: values.title, description: null }]
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
      setOpen(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFile,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["files"] })
  });

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = (values: FormValues) => {
    createMutation.mutate(values);
  };

  const rows = data?.data || [];

  return (
    <Page title="Files" action={<Button variant="contained" onClick={() => setOpen(true)}>New file</Button>}>
      {isLoading ? (
        <LoadingState />
      ) : rows.length === 0 ? (
        <EmptyState title="No files yet" />
      ) : (
        <DataTable
          rows={rows}
          columns={[
            { key: "title", label: "Title" },
            { key: "accessType", label: "Access" },
            {
              key: "actions",
              label: "Actions",
              render: (row) => (
                <>
                  <Button size="small" onClick={() => navigate(`/manage/files/${row.id}`)}>
                    Open
                  </Button>
                  <Button size="small" color="error" onClick={() => deleteMutation.mutate(row.id)}>
                    Trash
                  </Button>
                </>
              )
            }
          ]}
        />
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New file</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <TextField label="Title (RU)" fullWidth margin="dense" {...register("title")} error={!!errors.title} />
            <TextField label="Section ID" fullWidth margin="dense" {...register("sectionId")} error={!!errors.sectionId} />
            <TextField label="Category ID" fullWidth margin="dense" {...register("categoryId")} error={!!errors.categoryId} />
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
