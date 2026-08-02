import React from "react";
import {
  Box,
  Button,
  Chip,
  Divider,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Page } from "../../shared/ui/Page";
import { SectionCard } from "../../shared/ui/SectionCard";
import { LoadingState } from "../../shared/ui/LoadingState";
import { ConfirmDialog } from "../../shared/ui/ConfirmDialog";
import { useToast } from "../../shared/ui/ToastProvider";
import { GuideDialog } from "./GuideDialog";
import {
  GuideEditResponse,
  GuideKey,
  downloadGuideDocx,
  fetchGuideForEdit,
  getGuideImageUrl,
  resetGuide,
  setGuideActive,
  updateGuide,
  uploadGuideImage
} from "./guides.api";

type Lang = "ru" | "en" | "uz";
const LANGS: Lang[] = ["ru", "en", "uz"];

type EditorBlock = {
  uid: string;
  image: string | null;
  translations: Record<Lang, { title: string; body: string }>;
};

function toEditorBlocks(data: GuideEditResponse | undefined): EditorBlock[] {
  if (!data) return [];
  return data.blocks.map((block, index) => {
    const translations = LANGS.reduce(
      (acc, lang) => {
        const found = block.translations.find((item) => item.lang === lang);
        acc[lang] = { title: found?.title || "", body: found?.body || "" };
        return acc;
      },
      {} as Record<Lang, { title: string; body: string }>
    );
    return { uid: `${block.id}-${index}`, image: block.image, translations };
  });
}

function emptyBlock(): EditorBlock {
  return {
    uid: `new-${Date.now()}-${Math.round(Math.random() * 1000)}`,
    image: null,
    translations: LANGS.reduce(
      (acc, lang) => {
        acc[lang] = { title: "", body: "" };
        return acc;
      },
      {} as Record<Lang, { title: string; body: string }>
    )
  };
}

function GuideTab({ guideKey }: { guideKey: GuideKey }) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [lang, setLang] = React.useState<Lang>("ru");
  const [blocks, setBlocks] = React.useState<EditorBlock[]>([]);
  const [resetOpen, setResetOpen] = React.useState(false);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const uploadTargetRef = React.useRef<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["guide-admin", guideKey],
    queryFn: () => fetchGuideForEdit(guideKey)
  });

  React.useEffect(() => {
    setBlocks(toEditorBlocks(data));
  }, [data]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["guide-admin", guideKey] });
    queryClient.invalidateQueries({ queryKey: ["guide", guideKey] });
    queryClient.invalidateQueries({ queryKey: ["guide-statuses"] });
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      updateGuide(guideKey, {
        blocks: blocks.map((block) => ({
          image: block.image,
          translations: LANGS.map((code) => ({
            lang: code,
            title: block.translations[code].title.trim(),
            body: block.translations[code].body
          })).filter((item) => item.title || item.body.trim())
        }))
      }),
    onSuccess: () => {
      invalidate();
      showToast({ message: t("guideSaved"), severity: "success" });
    },
    onError: () => showToast({ message: t("guideSaveFailed"), severity: "error" })
  });

  const activeMutation = useMutation({
    mutationFn: (value: boolean) => setGuideActive(guideKey, value),
    onSuccess: (_result, value) => {
      invalidate();
      showToast({
        message: value ? t("guideEnabled") : t("guideDisabled"),
        severity: "success"
      });
    },
    onError: () => showToast({ message: t("guideSaveFailed"), severity: "error" })
  });

  const resetMutation = useMutation({
    mutationFn: () => resetGuide(guideKey),
    onSuccess: () => {
      invalidate();
      setResetOpen(false);
      showToast({ message: t("guideReset"), severity: "success" });
    },
    onError: () => showToast({ message: t("guideSaveFailed"), severity: "error" })
  });

  const patchBlock = (uid: string, patch: Partial<EditorBlock>) => {
    setBlocks((current) => current.map((block) => (block.uid === uid ? { ...block, ...patch } : block)));
  };

  const patchText = (uid: string, field: "title" | "body", value: string) => {
    setBlocks((current) =>
      current.map((block) =>
        block.uid === uid
          ? {
              ...block,
              translations: {
                ...block.translations,
                [lang]: { ...block.translations[lang], [field]: value }
              }
            }
          : block
      )
    );
  };

  const move = (index: number, direction: -1 | 1) => {
    setBlocks((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleImagePick = (uid: string) => {
    uploadTargetRef.current = uid;
    fileInputRef.current?.click();
  };

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const uid = uploadTargetRef.current;
    event.target.value = "";
    if (!file || !uid) return;
    try {
      const { image } = await uploadGuideImage(guideKey, file);
      patchBlock(uid, { image });
      showToast({ message: t("guideImageUploaded"), severity: "success" });
    } catch {
      showToast({ message: t("guideImageUploadFailed"), severity: "error" });
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadGuideDocx(guideKey);
    } catch {
      showToast({ message: t("guideDownloadFailed"), severity: "error" });
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) return <LoadingState rows={5} />;

  const isActive = Boolean(data?.isActive);

  return (
    <Box>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={handleImageChange}
      />

      <SectionCard
        title={guideKey === "admin" ? t("guideForAdmins") : t("guideForUsers")}
        subtitle={guideKey === "admin" ? t("guideAdminSubtitle") : t("guideUserSubtitle")}
        action={
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              variant="outlined"
              startIcon={<MenuBookOutlinedIcon />}
              onClick={() => setPreviewOpen(true)}
            >
              {t("guideOpen")}
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadOutlinedIcon />}
              onClick={handleDownload}
              disabled={downloading}
            >
              {t("guideDownloadDocx")}
            </Button>
          </Stack>
        }
      >
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <FormControlLabel
            control={
              <Switch
                checked={isActive}
                onChange={(event) => activeMutation.mutate(event.target.checked)}
                disabled={activeMutation.isPending}
              />
            }
            label={guideKey === "admin" ? t("guideActiveAdmin") : t("guideActiveUser")}
          />
          <Chip
            size="small"
            variant="outlined"
            color={isActive ? "success" : "default"}
            label={isActive ? t("guideStateOn") : t("guideStateOff")}
          />
          <Typography variant="caption" color="text.secondary">
            {guideKey === "admin" ? t("guideActiveAdminHint") : t("guideActiveUserHint")}
          </Typography>
        </Stack>
      </SectionCard>

      <SectionCard
        title={t("guideEditorTitle")}
        subtitle={t("guideEditorHint")}
        action={
          <Stack direction="row" spacing={1}>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={lang}
              onChange={(_, value) => value && setLang(value)}
            >
              {LANGS.map((code) => (
                <ToggleButton key={code} value={code}>
                  {code.toUpperCase()}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Button variant="outlined" startIcon={<RestartAltIcon />} onClick={() => setResetOpen(true)}>
              {t("guideResetAction")}
            </Button>
            <Button
              variant="contained"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {t("saveChanges")}
            </Button>
          </Stack>
        }
      >
        <Typography variant="caption" color="text.secondary">
          {t("guideMarkupHint")}
        </Typography>
      </SectionCard>

      {blocks.map((block, index) => {
        const imageUrl = getGuideImageUrl(block.image);
        return (
          <SectionCard key={block.uid}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
              <Typography variant="subtitle2" color="text.secondary">
                {t("guideBlock")} {index + 1}
              </Typography>
              <Stack direction="row" spacing={0.5}>
                <Tooltip title={t("moveUp")}>
                  <span>
                    <IconButton size="small" onClick={() => move(index, -1)} disabled={index === 0}>
                      <ArrowUpwardIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title={t("moveDown")}>
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => move(index, 1)}
                      disabled={index === blocks.length - 1}
                    >
                      <ArrowDownwardIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title={t("delete")}>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => setBlocks((current) => current.filter((item) => item.uid !== block.uid))}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Stack>

            <Stack spacing={2}>
              <TextField
                label={t("title")}
                value={block.translations[lang].title}
                onChange={(event) => patchText(block.uid, "title", event.target.value)}
                fullWidth
              />
              <TextField
                label={t("guideBlockBody")}
                value={block.translations[lang].body}
                onChange={(event) => patchText(block.uid, "body", event.target.value)}
                multiline
                minRows={6}
                fullWidth
              />

              <Divider />
              <Stack direction="row" spacing={2} alignItems="flex-start">
                <Box sx={{ flex: "0 0 220px" }}>
                  {imageUrl ? (
                    <Box
                      component="img"
                      src={imageUrl}
                      alt=""
                      sx={{ width: "100%", borderRadius: "6px", border: "1px solid var(--border)" }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: "100%",
                        height: 120,
                        borderRadius: "6px",
                        border: "1px dashed var(--border)",
                        display: "grid",
                        placeItems: "center",
                        color: "text.disabled"
                      }}
                    >
                      <ImageOutlinedIcon />
                    </Box>
                  )}
                </Box>
                <Stack spacing={1}>
                  <Button size="small" variant="outlined" onClick={() => handleImagePick(block.uid)}>
                    {block.image ? t("guideReplaceImage") : t("guideAddImage")}
                  </Button>
                  {block.image && (
                    <Button size="small" color="error" onClick={() => patchBlock(block.uid, { image: null })}>
                      {t("guideRemoveImage")}
                    </Button>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    {t("guideImageHint")}
                  </Typography>
                </Stack>
              </Stack>
            </Stack>
          </SectionCard>
        );
      })}

      <Button
        startIcon={<AddIcon />}
        variant="outlined"
        onClick={() => setBlocks((current) => [...current, emptyBlock()])}
      >
        {t("guideAddBlock")}
      </Button>

      <ConfirmDialog
        open={resetOpen}
        title={t("guideResetAction")}
        description={t("guideResetConfirm")}
        confirmLabel={t("guideResetAction")}
        onCancel={() => setResetOpen(false)}
        onConfirm={() => resetMutation.mutate()}
      />

      <GuideDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        guideKey={guideKey}
        title={guideKey === "admin" ? t("guideForAdmins") : t("guideForUsers")}
      />
    </Box>
  );
}

export default function GuideAdminPage() {
  const { t } = useTranslation();
  const [tab, setTab] = React.useState(0);
  const guideKey: GuideKey = tab === 0 ? "user" : "admin";

  return (
    <Page title={t("guides")} subtitle={t("guidesSubtitle")}>
      <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }}>
        <Tab label={t("guideForUsers")} />
        <Tab label={t("guideForAdmins")} />
      </Tabs>
      <GuideTab key={guideKey} guideKey={guideKey} />
    </Page>
  );
}
