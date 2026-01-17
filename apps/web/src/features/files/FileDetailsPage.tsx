import React from "react";
import { Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { fetchFile, fetchVersions, createVersion, setCurrentVersion, uploadAsset } from "./files.api";
import { Page } from "../../shared/ui/Page";

export default function FileDetailsPage() {
  const params = useParams();
  const fileId = Number(params.id);
  const queryClient = useQueryClient();
  const { data: file } = useQuery({ queryKey: ["file", fileId], queryFn: () => fetchFile(fileId) });
  const { data: versions } = useQuery({ queryKey: ["versions", fileId], queryFn: () => fetchVersions(fileId) });
  const [comment, setComment] = React.useState("");
  const [lang, setLang] = React.useState("ru");
  const [fileInput, setFileInput] = React.useState<File | null>(null);

  const createVersionMutation = useMutation({
    mutationFn: () => createVersion(fileId, { comment }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["versions", fileId] })
  });

  const setCurrentMutation = useMutation({
    mutationFn: (versionId: number) => setCurrentVersion(fileId, { versionId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["file", fileId] })
  });

  const uploadMutation = useMutation({
    mutationFn: async (versionId: number) => {
      if (!fileInput) return;
      const form = new FormData();
      form.append("lang", lang);
      form.append("file", fileInput);
      return uploadAsset(fileId, versionId, form);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["versions", fileId] })
  });

  return (
    <Page title={file?.title || "File details"}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1">Metadata</Typography>
        <Typography variant="body2">Section ID: {file?.sectionId}</Typography>
        <Typography variant="body2">Category ID: {file?.categoryId}</Typography>
        <Typography variant="body2">Access: {file?.accessType}</Typography>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1">Versions</Typography>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mt: 2 }}>
          <TextField label="Comment" value={comment} onChange={(e) => setComment(e.target.value)} />
          <Button variant="contained" onClick={() => createVersionMutation.mutate()}>
            Create version
          </Button>
        </Stack>
        <Stack spacing={1} sx={{ mt: 2 }}>
          {(versions?.data || []).map((v: any) => (
            <Paper key={v.id} sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Box>
                <Typography variant="body1">v{v.version_number}</Typography>
                <Typography variant="body2" color="text.secondary">{v.comment || "-"}</Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button size="small" onClick={() => setCurrentMutation.mutate(v.id)}>
                  Set current
                </Button>
                <Button size="small" component="label" variant="outlined">
                  Upload asset
                  <input type="file" hidden onChange={(e) => setFileInput(e.target.files?.[0] || null)} />
                </Button>
                <TextField
                  size="small"
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                  label="Lang"
                  sx={{ width: 100 }}
                />
                <Button size="small" onClick={() => uploadMutation.mutate(v.id)} disabled={!fileInput}>
                  Send
                </Button>
              </Stack>
            </Paper>
          ))}
        </Stack>
      </Paper>
    </Page>
  );
}
