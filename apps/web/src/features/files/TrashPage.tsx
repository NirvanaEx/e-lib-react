import React from "react";
import { Button } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchTrash, restoreFile, forceDelete } from "./files.api";
import { DataTable } from "../../shared/ui/DataTable";
import { Page } from "../../shared/ui/Page";
import { EmptyState } from "../../shared/ui/EmptyState";

export default function TrashPage() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["trash"], queryFn: () => fetchTrash({ page: 1, pageSize: 20 }) });

  const restoreMutation = useMutation({
    mutationFn: restoreFile,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trash"] })
  });

  const forceMutation = useMutation({
    mutationFn: forceDelete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trash"] })
  });

  const rows = data?.data || [];

  return (
    <Page title="Trash">
      {rows.length === 0 ? (
        <EmptyState title="Trash is empty" />
      ) : (
        <DataTable
          rows={rows}
          columns={[
            { key: "title", label: "Title" },
            { key: "deletedAt", label: "Deleted at" },
            {
              key: "actions",
              label: "Actions",
              render: (row) => (
                <>
                  <Button size="small" onClick={() => restoreMutation.mutate(row.id)}>
                    Restore
                  </Button>
                  <Button size="small" color="error" onClick={() => forceMutation.mutate(row.id)}>
                    Delete forever
                  </Button>
                </>
              )
            }
          ]}
        />
      )}
    </Page>
  );
}
