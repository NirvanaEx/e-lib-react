import React from "react";
import { Checkbox, FormControlLabel, Stack, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { formatUserLabel } from "../../shared/utils/userLabel";

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
  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2">
        {t("user")}: {formatUserLabel(user)}
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
