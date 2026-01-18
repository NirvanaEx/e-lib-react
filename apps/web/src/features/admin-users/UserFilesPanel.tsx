import React from "react";
import { Checkbox, FormControlLabel, Stack, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

export type UserFilesPanelUser = {
  id: number;
  login: string;
  surname?: string;
  name?: string;
  patronymic?: string | null;
};

export function UserFilesPanel({
  user,
  canSubmitFiles,
  onChange
}: {
  user: UserFilesPanelUser;
  canSubmitFiles: boolean;
  onChange: (next: boolean) => void;
}) {
  const { t } = useTranslation();
  const fullName = [user.surname, user.name, user.patronymic].filter(Boolean).join(" ");

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2">
        {t("user")}: {fullName || user.login}
      </Typography>
      <Stack spacing={1}>
        <FormControlLabel
          control={<Checkbox checked={canSubmitFiles} onChange={(event) => onChange(event.target.checked)} />}
          label={t("allowFileSubmit")}
        />
        <Typography variant="caption" color="text.secondary">
          {t("allowFileSubmitHint")}
        </Typography>
      </Stack>
    </Stack>
  );
}
