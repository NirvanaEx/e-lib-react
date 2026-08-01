import React from "react";
import { Box, Button, IconButton, InputAdornment, Paper, Stack, TextField, Typography } from "@mui/material";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { changeTempPassword } from "./auth.api";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../shared/hooks/useAuth";
import { getDefaultRoute } from "../../shared/utils/access";
import { useToast } from "../../shared/ui/ToastProvider";
import { getPasswordErrorCode, getPasswordErrorMessage } from "../../shared/utils/errors";
import { passwordFieldSchema } from "../../shared/utils/password";

type FormValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export default function ChangeTempPasswordPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, setAuth, updateUser, clearAuth } = useAuth();
  const { showToast } = useToast();
  const [showPassword, setShowPassword] = React.useState(false);
  const schema = React.useMemo(
    () =>
      z
        .object({
          currentPassword: z.string().min(1),
          newPassword: passwordFieldSchema(t),
          confirmPassword: z.string().min(1)
        })
        .refine((data) => data.newPassword === data.confirmPassword, {
          message: t("passwordsMismatch"),
          path: ["confirmPassword"]
        }),
    [t]
  );

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    try {
      const data = await changeTempPassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword
      });
      if (data?.user) {
        setAuth(data.user);
        navigate(getDefaultRoute(data.user));
        return;
      }
      updateUser({ mustChangePassword: false });
      navigate(getDefaultRoute(user));
    } catch (error) {
      // Раньше отказ сервера просто всплывал наружу необработанным промисом:
      // форма замирала, и пользователь не понимал, что пошло не так.
      const message = getPasswordErrorMessage(error, t, t("actionFailed"));
      const code = getPasswordErrorCode(error);
      if (code === "CURRENT_PASSWORD_INVALID") {
        setError("currentPassword", { message });
      } else if (code === "PASSWORD_REUSED") {
        setError("newPassword", { message });
      }
      showToast({ message, severity: "error" });
    }
  };

  const visibilityAdornment = (
    <InputAdornment position="end">
      <IconButton
        size="small"
        edge="end"
        aria-label={showPassword ? t("hidePassword") : t("showPassword")}
        onClick={() => setShowPassword((prev) => !prev)}
      >
        {showPassword ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
      </IconButton>
    </InputAdornment>
  );

  const fieldType = showPassword ? "text" : "password";

  const handleLogout = () => {
    clearAuth();
    navigate("/login");
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        p: 2,
        background:
          "radial-gradient(600px 380px at 15% 10%, rgba(14,165,233,0.14), transparent 70%), radial-gradient(700px 400px at 100% 0%, rgba(37,99,235,0.14), transparent 60%)"
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 4,
          width: "100%",
          maxWidth: 460,
          borderRadius: "12px",
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
            type={fieldType}
            required
            autoComplete="current-password"
            {...register("currentPassword")}
            error={!!errors.currentPassword}
            helperText={errors.currentPassword?.message}
            InputProps={{ endAdornment: visibilityAdornment }}
          />
          <TextField
            fullWidth
            margin="normal"
            label={t("newPassword")}
            type={fieldType}
            required
            autoComplete="new-password"
            {...register("newPassword")}
            error={!!errors.newPassword}
            helperText={errors.newPassword?.message || t("passwordRule")}
            InputProps={{ endAdornment: visibilityAdornment }}
          />
          <TextField
            fullWidth
            margin="normal"
            label={t("confirmPassword")}
            type={fieldType}
            required
            autoComplete="new-password"
            {...register("confirmPassword")}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword?.message}
            InputProps={{ endAdornment: visibilityAdornment }}
          />
          <Button fullWidth variant="contained" type="submit" disabled={isSubmitting} sx={{ mt: 2 }}>
            {t("updatePassword")}
          </Button>
          <Button fullWidth variant="text" onClick={handleLogout} sx={{ mt: 1 }}>
            {t("logout")}
          </Button>
        </form>
      </Paper>
    </Box>
  );
}
