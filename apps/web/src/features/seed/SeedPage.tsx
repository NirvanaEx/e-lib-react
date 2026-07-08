import React from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Typography
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import PlaylistAddCheckIcon from "@mui/icons-material/PlaylistAddCheck";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Page } from "../../shared/ui/Page";
import { ConfirmDialog } from "../../shared/ui/ConfirmDialog";
import { LibraryIcon } from "../../shared/ui/iconLibrary";
import { useToast } from "../../shared/ui/ToastProvider";
import { getErrorMessage } from "../../shared/utils/errors";
import { fetchSeedStatus, runSeedDemo, runSeedSections } from "./seed.api";

type SeedCounters = { created: number; skipped: number };

export default function SeedPage() {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [confirmDemo, setConfirmDemo] = React.useState(false);
  const [demoResult, setDemoResult] = React.useState<Record<string, SeedCounters> | null>(null);

  const lang = (["ru", "en", "uz"].includes(i18n.language) ? i18n.language : "ru") as
    | "ru"
    | "en"
    | "uz";

  const { data: status, isLoading } = useQuery({
    queryKey: ["seed-status"],
    queryFn: fetchSeedStatus
  });

  const sectionsMutation = useMutation({
    mutationFn: runSeedSections,
    onSuccess: (data) => {
      queryClient.invalidateQueries();
      showToast({
        message: `${t("seedSectionsSuccess")}: ${data.sections.created} / ${t("seedSkipped")}: ${data.sections.skipped}`,
        severity: "success"
      });
    },
    onError: (error) =>
      showToast({ message: getErrorMessage(error, t("actionFailed")), severity: "error" })
  });

  const demoMutation = useMutation({
    mutationFn: runSeedDemo,
    onSuccess: (data) => {
      setDemoResult(data);
      queryClient.invalidateQueries();
      showToast({ message: t("seedDemoSuccess"), severity: "success" });
    },
    onError: (error) =>
      showToast({ message: getErrorMessage(error, t("actionFailed")), severity: "error" })
  });

  const presets = status?.presetSections || [];
  const counts = status?.counts || {};
  const demoPlan = status?.demo || {};
  const allExist = presets.length > 0 && presets.every((preset: any) => preset.exists);

  const cardSx = {
    p: 2.5,
    borderRadius: "10px",
    border: "1px solid var(--border)",
    backgroundColor: "var(--surface)"
  };

  const resultChips = (result: Record<string, SeedCounters>) => {
    const labels: Record<string, string> = {
      sections: t("sections"),
      categories: t("categories"),
      departments: t("departments"),
      documents: t("documents")
    };
    return (
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {Object.entries(result).map(([key, value]) => (
          <Chip
            key={key}
            size="small"
            icon={<CheckCircleOutlineIcon />}
            color={value.created > 0 ? "success" : "default"}
            variant="outlined"
            label={`${labels[key] || key}: +${value.created} (${t("seedSkipped")}: ${value.skipped})`}
          />
        ))}
      </Stack>
    );
  };

  return (
    <Page title={t("seedData")} subtitle={t("seedSubtitle")}>
      <Stack spacing={2.5}>
        <Paper sx={cardSx}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ md: "center" }}
            spacing={2}
          >
            <Box>
              <Typography variant="h6">{t("presetSections")}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {t("presetSectionsHint")}
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={
                sectionsMutation.isPending ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <AutoAwesomeIcon />
                )
              }
              disabled={isLoading || allExist || sectionsMutation.isPending}
              onClick={() => sectionsMutation.mutate()}
              sx={{ borderRadius: "8px", whiteSpace: "nowrap" }}
            >
              {allExist ? t("seedAllExist") : t("createSections")}
            </Button>
          </Stack>

          <Box
            sx={{
              mt: 2.5,
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                lg: "repeat(4, 1fr)"
              },
              gap: 1.5
            }}
          >
            {presets.map((preset: any) => (
              <Paper
                key={preset.key}
                variant="outlined"
                sx={{
                  p: 1.5,
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  gap: 1.25,
                  opacity: preset.exists ? 0.75 : 1
                }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: "10px",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: preset.iconColor,
                    color: "#fff"
                  }}
                >
                  <LibraryIcon name={preset.icon} fontSize="small" />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                    {preset.titles?.[lang] || preset.titles?.ru}
                  </Typography>
                  <Typography variant="caption" color={preset.exists ? "success.main" : "text.secondary"}>
                    {preset.exists ? t("seedExists") : t("seedWillBeCreated")}
                  </Typography>
                </Box>
              </Paper>
            ))}
          </Box>
        </Paper>

        <Paper sx={cardSx}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ md: "center" }}
            spacing={2}
          >
            <Box>
              <Typography variant="h6">{t("demoData")}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {t("demoDataHint")}
              </Typography>
            </Box>
            <Button
              variant="contained"
              color="secondary"
              startIcon={
                demoMutation.isPending ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <PlaylistAddCheckIcon />
                )
              }
              disabled={isLoading || demoMutation.isPending}
              onClick={() => setConfirmDemo(true)}
              sx={{ borderRadius: "8px", whiteSpace: "nowrap" }}
            >
              {t("runDemoSeed")}
            </Button>
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
            <Chip size="small" label={`${t("departments")}: ${demoPlan.departments ?? "—"}`} />
            <Chip size="small" label={`${t("categories")}: ${demoPlan.categories ?? "—"}`} />
            <Chip size="small" label={`${t("documents")}: ${demoPlan.documents ?? "—"}`} />
            <Chip size="small" variant="outlined" label={t("seedLangsNote")} />
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: "0.14em" }}>
            {t("currentData")}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
            <Chip size="small" variant="outlined" label={`${t("sections")}: ${counts.sections ?? 0}`} />
            <Chip size="small" variant="outlined" label={`${t("categories")}: ${counts.categories ?? 0}`} />
            <Chip size="small" variant="outlined" label={`${t("departments")}: ${counts.departments ?? 0}`} />
            <Chip size="small" variant="outlined" label={`${t("documents")}: ${counts.files ?? 0}`} />
          </Stack>

          {demoResult ? (
            <Box sx={{ mt: 2 }}>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: "0.14em" }}>
                {t("seedResult")}
              </Typography>
              <Box sx={{ mt: 1 }}>{resultChips(demoResult)}</Box>
            </Box>
          ) : null}
        </Paper>
      </Stack>

      <ConfirmDialog
        open={confirmDemo}
        title={t("runDemoSeed")}
        description={t("confirmDemoSeed")}
        onCancel={() => setConfirmDemo(false)}
        onConfirm={() => {
          setConfirmDemo(false);
          demoMutation.mutate();
        }}
      />
    </Page>
  );
}
