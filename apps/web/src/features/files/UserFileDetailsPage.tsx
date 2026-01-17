import React from "react";
import { Box, Button, Paper, Stack, Typography, TextField } from "@mui/material";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { fetchUserFile, downloadUserFile } from "./files.api";
import { Page } from "../../shared/ui/Page";

export default function UserFileDetailsPage() {
  const params = useParams();
  const fileId = Number(params.id);
  const { data } = useQuery({ queryKey: ["user-file", fileId], queryFn: () => fetchUserFile(fileId) });
  const [lang, setLang] = React.useState("ru");

  const downloadMutation = useMutation({
    mutationFn: () => downloadUserFile(fileId, lang),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data?.title || "file";
      a.click();
      window.URL.revokeObjectURL(url);
    }
  });

  return (
    <Page title={data?.title || "File"}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Available languages: {data?.availableLangs?.join(", ")}
        </Typography>
      </Paper>
      <Paper sx={{ p: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
          <TextField label="Language" value={lang} onChange={(e) => setLang(e.target.value)} sx={{ width: 120 }} />
          <Button variant="contained" onClick={() => downloadMutation.mutate()}>
            Download
          </Button>
        </Stack>
        <Box sx={{ mt: 2 }}>
          {(data?.assets || []).map((asset: any) => (
            <Typography key={asset.id} variant="body2">
              {asset.lang} - {asset.original_name}
            </Typography>
          ))}
        </Box>
      </Paper>
    </Page>
  );
}
