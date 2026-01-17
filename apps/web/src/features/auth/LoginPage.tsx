import React from "react";
import { Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { login } from "./auth.api";
import { useAuth } from "../../shared/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../shared/ui/ToastProvider";
import { useTranslation } from "react-i18next";

const schema = z.object({
  login: z.string().min(1),
  password: z.string().min(1)
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const { setAuth } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    try {
      const data = await login(values);
      setAuth(data.accessToken, data.user);
      if (data.user?.role === "superadmin" || data.user?.role === "admin") {
        navigate("/admin/users");
      } else if (data.user?.role === "manager") {
        navigate("/manage/sections");
      } else {
        navigate("/user/files");
      }
    } catch (_err) {
      showToast({ message: t("loginFailed"), severity: "error" });
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 2,
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
          <Typography variant="h4">{t("welcomeBack")}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t("enterCredentials")}
          </Typography>
        </Stack>
        <form onSubmit={handleSubmit(onSubmit)}>
          <TextField
            fullWidth
            margin="normal"
            label={t("login")}
            {...register("login")}
            error={!!errors.login}
            helperText={errors.login?.message}
          />
          <TextField
            fullWidth
            margin="normal"
            type="password"
            label={t("password")}
            {...register("password")}
            error={!!errors.password}
            helperText={errors.password?.message}
          />
          <Button fullWidth variant="contained" type="submit" disabled={isSubmitting} sx={{ mt: 2 }}>
            {t("signIn")}
          </Button>
        </form>
      </Paper>
    </Box>
  );
}
