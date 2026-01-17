import React from "react";
import { Button, Chip, Paper, Stack, TextField, Typography, MenuItem } from "@mui/material";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { fetchUserFile, downloadUserFile } from "./files.api";
import { Page } from "../../shared/ui/Page";
import { useTranslation } from "react-i18next";
import { formatBytes } from "../../shared/utils/format";

export default function UserFileDetailsPage() {
  const params = useParams();
  const fileId = Number(params.id);
  const { t } = useTranslation();
  const { data } = useQuery({ queryKey: ["user-file", fileId], queryFn: () => fetchUserFile(fileId) });
  const [lang, setLang] = React.useState("ru");

  React.useEffect(() => {
    if (data?.availableLangs?.length) {
      setLang(data.availableLangs[0]);
    }
  }, [data]);

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
    <Page title={data?.title || t("file")} subtitle={t("userFileSubtitle")}>
      <Paper sx={{ p: 2, mb: 2, borderRadius: 3, border: "1px solid var(--border)" }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          {t("availableLanguages")}
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {(data?.availableLangs || []).map((item: string) => (
            <Chip key={item} size="small" label={item.toUpperCase()} />
          ))}
        </Stack>
      </Paper>
      <Paper sx={{ p: 2, borderRadius: 3, border: "1px solid var(--border)" }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
          <TextField select label={t("language")} value={lang} onChange={(e) => setLang(e.target.value)} sx={{ width: 160 }}>
            {(data?.availableLangs || []).map((item: string) => (
              <MenuItem key={item} value={item}>
                {item.toUpperCase()}
              </MenuItem>
            ))}
          </TextField>
          <Button variant="contained" onClick={() => downloadMutation.mutate()}>
            {t("download")}
          </Button>
        </Stack>
        <Stack spacing={1} sx={{ mt: 3 }}>
          {(data?.assets || []).map((asset: any) => (
            <Stack key={asset.id} direction="row" spacing={2} alignItems="center">
              <Chip size="small" label={asset.lang.toUpperCase()} />
              <Typography variant="body2">{asset.original_name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {formatBytes(asset.size)}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Paper>
    </Page>
  );
}
