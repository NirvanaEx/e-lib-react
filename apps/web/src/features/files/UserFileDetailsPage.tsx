import React from "react";
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Stack, Tooltip, Typography } from "@mui/material";
import PublicIcon from "@mui/icons-material/Public";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { fetchUserFile, downloadUserFile } from "./files.api";
import { Page } from "../../shared/ui/Page";
import { useTranslation } from "react-i18next";
import { formatBytes } from "../../shared/utils/format";
import { getFilenameFromDisposition } from "../../shared/utils/download";
import { formatUserLabel } from "../../shared/utils/userLabel";

export default function UserFileDetailsPage() {
  const params = useParams();
  const fileId = Number(params.id);
  const { t, i18n } = useTranslation();
  const { data } = useQuery({ queryKey: ["user-file", fileId], queryFn: () => fetchUserFile(fileId) });
  const [downloadTarget, setDownloadTarget] = React.useState<string[] | null>(null);
  const assetLangs = React.useMemo(() => {
    const langs = (data?.assets || []).map((asset: any) => asset.lang).filter(Boolean);
    return Array.from(new Set(langs));
  }, [data]);
  const availableLangs = data?.availableAssetLangs?.length ? data.availableAssetLangs : assetLangs;
  const currentLang = React.useMemo(() => (i18n.language || "ru").split("-")[0], [i18n.language]);
  const availableLangsSorted = React.useMemo(() => {
    const items = [...(availableLangs || [])];
    return items.sort((a, b) => {
      const aCurrent = a === currentLang;
      const bCurrent = b === currentLang;
      if (aCurrent && !bCurrent) return -1;
      if (!aCurrent && bCurrent) return 1;
      return a.localeCompare(b);
    });
  }, [availableLangs, currentLang]);
  const assetSizes = React.useMemo(() => {
    const map = new Map<string, number>();
    (data?.assets || []).forEach((asset: any) => {
      if (asset.lang) {
        map.set(asset.lang, asset.size);
      }
    });
    return map;
  }, [data]);
  const assetsSorted = React.useMemo(() => {
    const items = [...(data?.assets || [])];
    return items.sort((a: any, b: any) => {
      const aCurrent = a.lang === currentLang;
      const bCurrent = b.lang === currentLang;
      if (aCurrent && !bCurrent) return -1;
      if (!aCurrent && bCurrent) return 1;
      return String(a.lang).localeCompare(String(b.lang));
    });
  }, [data, currentLang]);

  const downloadMutation = useMutation({
    mutationFn: (lang?: string | null) => downloadUserFile(fileId, lang || undefined),
    onSuccess: (response, lang) => {
      const blob = response.data;
      const filename =
        getFilenameFromDisposition(response.headers?.["content-disposition"]) ||
        `${data?.title || "file"}${lang ? `_${String(lang).toUpperCase()}` : ""}`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  });

  const handleDownload = () => {
    if (!availableLangsSorted || availableLangsSorted.length === 0) return;
    if (availableLangsSorted.length === 1) {
      downloadMutation.mutate(availableLangsSorted[0]);
      return;
    }
    setDownloadTarget(availableLangsSorted);
  };

  const accessIcon = (accessType: string) => (
    <Tooltip title={accessType === "restricted" ? t("accessRestricted") : t("accessPublic")}>
      <Box sx={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        {accessType === "restricted" ? (
          <GroupOutlinedIcon fontSize="small" sx={{ color: "warning.main" }} />
        ) : (
          <PublicIcon fontSize="small" sx={{ color: "success.main" }} />
        )}
      </Box>
    </Tooltip>
  );

  const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <Stack direction="row" spacing={2} alignItems="flex-start">
      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 140 }}>
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Stack>
  );

  return (
    <Page title={data?.title || t("file")} subtitle={t("userFileSubtitle")}>
      <Paper sx={{ p: 2, mb: 2, borderRadius: 3, border: "1px solid var(--border)" }}>
        <Stack spacing={1.5}>
          <DetailRow label={t("createdBy")} value={data?.createdBy ? formatUserLabel(data.createdBy) : "-"} />
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="subtitle2">{t("access")}</Typography>
            {accessIcon(data?.accessType || "public")}
          </Stack>
        </Stack>
      </Paper>
      <Paper sx={{ p: 2, mb: 2, borderRadius: 3, border: "1px solid var(--border)" }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          {t("availableLanguages")}
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {availableLangsSorted.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              -
            </Typography>
          ) : (
            availableLangsSorted.map((item: string) => <Chip key={item} size="small" label={item.toUpperCase()} />)
          )}
        </Stack>
      </Paper>
      <Paper sx={{ p: 2, borderRadius: 3, border: "1px solid var(--border)" }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
          <Button variant="contained" onClick={handleDownload} disabled={!availableLangs || availableLangs.length === 0}>
            {t("download")}
          </Button>
        </Stack>
        <Stack spacing={1} sx={{ mt: 3 }}>
          {assetsSorted.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              -
            </Typography>
          ) : (
            assetsSorted.map((asset: any) => (
              <Stack key={asset.id} direction="row" spacing={2} alignItems="center">
                <Chip size="small" label={asset.lang.toUpperCase()} />
                <Typography variant="body2">{asset.original_name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatBytes(asset.size)}
                </Typography>
              </Stack>
            ))
          )}
        </Stack>
      </Paper>

      <Dialog open={!!downloadTarget} onClose={() => setDownloadTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>{t("download")}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5}>
            {(downloadTarget || []).map((lang) => (
              <Button
                key={lang}
                variant="outlined"
                onClick={() => {
                  downloadMutation.mutate(lang);
                  setDownloadTarget(null);
                }}
                sx={{ justifyContent: "space-between" }}
              >
                <span>{lang.toUpperCase()}</span>
                <Typography variant="caption" color="text.secondary">
                  {formatBytes(assetSizes.get(lang) || 0)}
                </Typography>
              </Button>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDownloadTarget(null)}>{t("cancel")}</Button>
        </DialogActions>
      </Dialog>
    </Page>
  );
}
