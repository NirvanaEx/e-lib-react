import React from "react";
import { Box, Button, FormControlLabel, MenuItem, Stack, Switch, TextField } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Page } from "../../shared/ui/Page";
import { SectionCard } from "../../shared/ui/SectionCard";
import { useToast } from "../../shared/ui/ToastProvider";
import { useTranslation } from "react-i18next";
import { LoadingState } from "../../shared/ui/LoadingState";
import { TranslationsEditor } from "../../shared/ui/TranslationsEditor";
import { fetchContentPage, updateContentPage } from "./content-pages.api";

type EditorTranslation = {
  lang: "ru" | "en" | "uz";
  title: string;
  description?: string | null;
};

const AGREEMENT_KEY = "user_agreement";

function UserAgreementPanel() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [translations, setTranslations] = React.useState<EditorTranslation[]>([]);
  const [displayMode, setDisplayMode] = React.useState<"once" | "every_login">("once");
  const [isActive, setIsActive] = React.useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ["content-page-admin", AGREEMENT_KEY],
    queryFn: () => fetchContentPage(AGREEMENT_KEY)
  });

  React.useEffect(() => {
    if (!data) return;
    setTranslations(
      data.translations.map((item) => ({
        lang: item.lang,
        title: item.title,
        description: item.body
      }))
    );
    setDisplayMode(data.displayMode);
    setIsActive(data.isActive);
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: () => {
      const normalized = translations
        .map((item) => {
          const title = item.title.trim();
          const body = item.description ?? "";
          return {
            lang: item.lang,
            title,
            body
          };
        })
        .filter((item) => item.title && item.body.trim());
      return updateContentPage(AGREEMENT_KEY, {
        translations: normalized,
        displayMode,
        isActive,
        requiresAcceptance: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-page-admin", AGREEMENT_KEY] });
      showToast({ message: t("agreementUpdated"), severity: "success" });
    },
    onError: () => showToast({ message: t("agreementUpdateFailed"), severity: "error" })
  });

  const handleSave = () => {
    updateMutation.mutate();
  };

  return isLoading ? (
    <LoadingState rows={4} />
  ) : (
    <>
      <SectionCard title={t("userAgreement")} subtitle={t("agreementSubtitle")}>
        <Stack spacing={2}>
          <TextField
            select
            label={t("agreementDisplayMode")}
            value={displayMode}
            onChange={(event) => setDisplayMode(event.target.value as "once" | "every_login")}
          >
            <MenuItem value="once">{t("agreementDisplayOnce")}</MenuItem>
            <MenuItem value="every_login">{t("agreementDisplayAlways")}</MenuItem>
          </TextField>
          <FormControlLabel
            control={<Switch checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />}
            label={t("agreementActive")}
          />
        </Stack>
      </SectionCard>

      <SectionCard title={t("agreementBody")} subtitle={t("agreementHint")}>
        <TranslationsEditor
          value={translations}
          onChange={setTranslations}
          showDescription
          titleLabel={t("title")}
          descriptionLabel={t("agreementBody")}
          requiredTitle
        />
      </SectionCard>

      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Button variant="contained" onClick={handleSave} disabled={updateMutation.isPending}>
          {t("saveChanges")}
        </Button>
      </Box>
    </>
  );
}

export default function ContentPage() {
  const { t } = useTranslation();

  return (
    <Page title={t("content")} subtitle={t("contentSubtitle")}>
      <UserAgreementPanel />
    </Page>
  );
}
