import React from "react";
import { Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { changeTempPassword } from "./auth.api";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../shared/hooks/useAuth";
import { getDefaultRoute } from "../../shared/utils/access";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6)
});

type FormValues = z.infer<typeof schema>;

export default function ChangeTempPasswordPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    await changeTempPassword(values);
    navigate(getDefaultRoute(user));
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        p: 2,
        background:
          "radial-gradient(600px 380px at 15% 10%, rgba(198,138,63,0.18), transparent 70%), radial-gradient(700px 400px at 100% 0%, rgba(29,77,79,0.18), transparent 60%)"
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 4,
          width: "100%",
          maxWidth: 460,
          borderRadius: 4,
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow)"
        }}
      >
        <Stack spacing={1} sx={{ mb: 3 }}>
          <Typography variant="h4">{t("changeTempPassword")}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t("tempPasswordSubtitle")}
          </Typography>
        </Stack>
        <form onSubmit={handleSubmit(onSubmit)}>
          <TextField
            fullWidth
            margin="normal"
            label={t("currentPassword")}
            type="password"
            {...register("currentPassword")}
            error={!!errors.currentPassword}
            helperText={errors.currentPassword?.message}
          />
          <TextField
            fullWidth
            margin="normal"
            label={t("newPassword")}
            type="password"
            {...register("newPassword")}
            error={!!errors.newPassword}
            helperText={errors.newPassword?.message}
          />
          <Button fullWidth variant="contained" type="submit" disabled={isSubmitting} sx={{ mt: 2 }}>
            {t("updatePassword")}
          </Button>
        </form>
      </Paper>
    </Box>
  );
}
