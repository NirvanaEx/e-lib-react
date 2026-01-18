import React from "react";
import { Box, Button, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { changePassword, changeLanguage } from "./settings.api";
import i18n from "../../app/i18n";
import { useToast } from "../../shared/ui/ToastProvider";
import { useAuth } from "../../shared/hooks/useAuth";
import { useTranslation } from "react-i18next";

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export function SettingsPanel() {
  const [lang, setLang] = React.useState(i18n.language || "ru");
  const { showToast } = useToast();
  const { updateUser } = useAuth();
  const { t } = useTranslation();

  const passwordSchema = React.useMemo(
    () =>
      z
        .object({
          currentPassword: z.string().min(1),
          newPassword: z.string().min(6),
          confirmPassword: z.string().min(1)
        })
        .refine((data) => data.newPassword === data.confirmPassword, {
          message: t("passwordsMismatch"),
          path: ["confirmPassword"]
        }),
    [t]
  );
  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const passwordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => showToast({ message: t("passwordUpdated"), severity: "success" }),
    onError: () => showToast({ message: t("actionFailed"), severity: "error" })
  });

  const languageMutation = useMutation({
    mutationFn: changeLanguage,
    onSuccess: () => {
      i18n.changeLanguage(lang);
      updateUser({ lang });
      showToast({ message: t("languageUpdated"), severity: "success" });
    },
    onError: () => showToast({ message: t("languageUpdateFailed"), severity: "error" })
  });

  const onSubmitPassword = (values: PasswordForm) => {
    passwordMutation.mutate({ currentPassword: values.currentPassword, newPassword: values.newPassword });
  };

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2, borderRadius: 3, border: "1px solid var(--border)" }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          {t("changePassword")}
        </Typography>
        <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)}>
          <Stack spacing={2}>
            <TextField
              label={t("currentPassword")}
              type="password"
              required
              {...passwordForm.register("currentPassword")}
              error={!!passwordForm.formState.errors.currentPassword}
              helperText={passwordForm.formState.errors.currentPassword?.message}
            />
            <TextField
              label={t("newPassword")}
              type="password"
              required
              {...passwordForm.register("newPassword")}
              error={!!passwordForm.formState.errors.newPassword}
              helperText={passwordForm.formState.errors.newPassword?.message}
            />
            <TextField
              label={t("confirmPassword")}
              type="password"
              required
              {...passwordForm.register("confirmPassword")}
              error={!!passwordForm.formState.errors.confirmPassword}
              helperText={passwordForm.formState.errors.confirmPassword?.message}
            />
            <Button type="submit" variant="contained" disabled={passwordMutation.isPending}>
              {t("updatePassword")}
            </Button>
          </Stack>
        </form>
      </Paper>

      <Paper sx={{ p: 2, borderRadius: 3, border: "1px solid var(--border)" }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          {t("language")}
        </Typography>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <TextField select value={lang} onChange={(e) => setLang(e.target.value)} label={t("language")}>
            <MenuItem value="ru">RU</MenuItem>
            <MenuItem value="en">EN</MenuItem>
            <MenuItem value="uz">UZ</MenuItem>
          </TextField>
          <Button variant="contained" onClick={() => languageMutation.mutate(lang)}>
            {t("save")}
          </Button>
        </Box>
      </Paper>
    </Stack>
  );
}
