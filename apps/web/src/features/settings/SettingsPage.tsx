import React from "react";
import { Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { changePassword, changeLanguage } from "./settings.api";
import i18n from "../../app/i18n";
import { Page } from "../../shared/ui/Page";

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6)
});

type PasswordForm = z.infer<typeof passwordSchema>;

export default function SettingsPage() {
  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });
  const [lang, setLang] = React.useState(i18n.language || "ru");

  const passwordMutation = useMutation({
    mutationFn: changePassword
  });

  const languageMutation = useMutation({
    mutationFn: changeLanguage,
    onSuccess: () => i18n.changeLanguage(lang)
  });

  const onSubmitPassword = (values: PasswordForm) => {
    passwordMutation.mutate(values);
  };

  return (
    <Page title="Settings">
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          Change password
        </Typography>
        <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)}>
          <Stack spacing={2}>
            <TextField label="Current password" type="password" {...passwordForm.register("currentPassword")} />
            <TextField label="New password" type="password" {...passwordForm.register("newPassword")} />
            <Button type="submit" variant="contained" disabled={passwordMutation.isPending}>
              Update password
            </Button>
          </Stack>
        </form>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          Language
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <TextField value={lang} onChange={(e) => setLang(e.target.value)} label="Language" />
          <Button variant="contained" onClick={() => languageMutation.mutate(lang)}>
            Save
          </Button>
        </Box>
      </Paper>
    </Page>
  );
}
