import React from "react";
import { Box, Button, Chip, CircularProgress, IconButton, Paper, Stack, Tooltip, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DownloadIcon from "@mui/icons-material/Download";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { downloadUserFile, fetchUserFile } from "./files.api";
import { FileTypeBadge, extOf } from "./fileVisuals";
import { getFilenameFromDisposition } from "../../shared/utils/download";
import { EmptyState } from "../../shared/ui/EmptyState";

export default function UserFileViewPage() {
  const { id } = useParams();
  const fileId = Number(id);
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const { data: details, isLoading, isError } = useQuery({
    queryKey: ["user-file-details", fileId],
    queryFn: () => fetchUserFile(fileId),
    enabled: Number.isInteger(fileId) && fileId > 0,
    retry: false
  });

  const assets = React.useMemo(() => details?.assets || [], [details]);
  const currentLang = (i18n.language || "ru").split("-")[0];
  const [lang, setLang] = React.useState<string | null>(null);
  const activeLang = React.useMemo(() => {
    if (lang && assets.some((asset: any) => asset.lang === lang)) return lang;
    if (assets.some((asset: any) => asset.lang === currentLang)) return currentLang;
    return assets[0]?.lang || null;
  }, [lang, assets, currentLang]);
  const activeAsset = React.useMemo(
    () => assets.find((asset: any) => asset.lang === activeLang) || null,
    [assets, activeLang]
  );

  const [blobUrl, setBlobUrl] = React.useState<string | null>(null);
  const [blobType, setBlobType] = React.useState<string>("");
  const [blobLoading, setBlobLoading] = React.useState(false);
  const [blobError, setBlobError] = React.useState(false);
  const [downloadName, setDownloadName] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!activeAsset || !details) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    setBlobLoading(true);
    setBlobError(false);
    setBlobUrl(null);
    downloadUserFile(fileId, activeAsset.lang)
      .then((response) => {
        if (cancelled) return;
        const blob: Blob = response.data;
        objectUrl = window.URL.createObjectURL(blob);
        setBlobType(blob.type || "");
        setBlobUrl(objectUrl);
        setDownloadName(getFilenameFromDisposition(response.headers?.["content-disposition"]) || activeAsset.original_name);
      })
      .catch(() => {
        if (!cancelled) setBlobError(true);
      })
      .finally(() => {
        if (!cancelled) setBlobLoading(false);
      });
    return () => {
      cancelled = true;
      if (objectUrl) window.URL.revokeObjectURL(objectUrl);
    };
  }, [fileId, activeAsset, details]);

  const canPreview = blobType.includes("pdf") || blobType.startsWith("text/");

  const triggerDownload = () => {
    if (!blobUrl) return;
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = downloadName || details?.title || "file";
    a.click();
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: 320 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (isError || !details) {
    return <EmptyState title={t("noAccess")} subtitle={t("noFilesSubtitle")} />;
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2, flexWrap: "wrap", rowGap: 1 }}>
        <Tooltip title={t("back")}>
          <IconButton onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/users"))} size="small">
            <ArrowBackIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <FileTypeBadge ext={extOf(activeAsset?.original_name)} small />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="h6" noWrap title={details.title || t("file")}>
            {details.title || t("file")}
          </Typography>
          {activeAsset && (
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
              {activeAsset.original_name}
            </Typography>
          )}
        </Box>
        {assets.length > 1 && (
          <Stack direction="row" spacing={0.5}>
            {assets.map((asset: any) => (
              <Chip
                key={asset.id}
                size="small"
                label={asset.lang.toUpperCase()}
                onClick={() => setLang(asset.lang)}
                color={asset.lang === activeLang ? "primary" : "default"}
                variant={asset.lang === activeLang ? "filled" : "outlined"}
                sx={{ fontWeight: 600 }}
              />
            ))}
          </Stack>
        )}
        <Button
          size="small"
          variant="contained"
          startIcon={<DownloadIcon />}
          disabled={!blobUrl}
          onClick={triggerDownload}
          sx={{ borderRadius: "8px", boxShadow: "none" }}
        >
          {t("download")}
        </Button>
      </Stack>

      <Paper
        sx={{
          flex: 1,
          minHeight: "calc(100vh - 280px)",
          borderRadius: "10px",
          border: "1px solid var(--border)",
          backgroundColor: "var(--surface)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column"
        }}
      >
        {blobLoading ? (
          <Box sx={{ display: "grid", placeItems: "center", flex: 1 }}>
            <CircularProgress size={28} />
          </Box>
        ) : blobError || !activeAsset ? (
          <Box sx={{ display: "grid", placeItems: "center", flex: 1, p: 4 }}>
            <Typography variant="body2" color="text.secondary">
              {assets.length === 0 ? t("noAssets") : t("actionFailed")}
            </Typography>
          </Box>
        ) : canPreview && blobUrl ? (
          <Box
            component="iframe"
            src={blobUrl}
            title={details.title || "document"}
            sx={{ border: 0, width: "100%", flex: 1, backgroundColor: "#fff" }}
          />
        ) : (
          <Box sx={{ display: "grid", placeItems: "center", flex: 1, p: 4 }}>
            <Stack spacing={2} alignItems="center">
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", maxWidth: 360 }}>
                {t("previewUnavailable")}
              </Typography>
              <Button variant="outlined" startIcon={<DownloadIcon />} onClick={triggerDownload} sx={{ borderRadius: "8px" }}>
                {t("download")}
              </Button>
            </Stack>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
