import React from "react";
import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import LanguageOutlinedIcon from "@mui/icons-material/LanguageOutlined";
import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { login } from "./auth.api";
import { useAuth } from "../../shared/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../shared/ui/ToastProvider";
import { useTranslation } from "react-i18next";
import { getDefaultRoute } from "../../shared/utils/access";
import i18n from "../../app/i18n";
import loginHero from "../../assets/login-back3.png";

const schema = z.object({
  login: z.string().min(1),
  password: z.string().min(1)
});

type FormValues = z.infer<typeof schema>;

const REMEMBER_KEY = "remembered-login";

export default function LoginPage() {
  const { setAuth } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const rememberedLogin = React.useMemo(() => localStorage.getItem(REMEMBER_KEY) || "", []);
  const [rememberMe, setRememberMe] = React.useState(Boolean(rememberedLogin));
  const [showPassword, setShowPassword] = React.useState(false);
  const [lang, setLang] = React.useState((i18n.language || "ru").split("-")[0]);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { login: rememberedLogin, password: "" } });

  const onSubmit = async (values: FormValues) => {
    try {
      const data = await login(values);
      if (rememberMe) {
        localStorage.setItem(REMEMBER_KEY, values.login);
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
      setAuth(data.user);
      navigate(getDefaultRoute(data.user));
    } catch (_err) {
      showToast({ message: t("loginFailed"), severity: "error" });
    }
  };

  const fieldSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: "10px",
      backgroundColor: "#fff"
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", backgroundColor: "#fff" }}>
      <Box
        sx={{
          flex: 1.2,
          display: { xs: "none", md: "block" },
          backgroundColor: "#0c2a52",
          backgroundImage: `url(${loginHero})`,
          backgroundSize: "cover",
          backgroundPosition: "left center",
          backgroundRepeat: "no-repeat"
        }}
      />

      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Box sx={{ display: "flex", justifyContent: "flex-end", p: { xs: 2, md: 3 } }}>
          <Select
            size="small"
            value={lang}
            onChange={(event) => {
              const next = event.target.value as string;
              setLang(next);
              i18n.changeLanguage(next);
            }}
            startAdornment={
              <InputAdornment position="start">
                <LanguageOutlinedIcon fontSize="small" />
              </InputAdornment>
            }
            sx={{ borderRadius: "10px", minWidth: 100, "& .MuiOutlinedInput-notchedOutline": { borderColor: "var(--border)" } }}
          >
            <MenuItem value="ru">RU</MenuItem>
            <MenuItem value="en">EN</MenuItem>
            <MenuItem value="uz">UZ</MenuItem>
          </Select>
        </Box>

        <Box sx={{ flex: 1, display: "grid", placeItems: "center", px: { xs: 2, md: 4 }, pb: 4 }}>
          <Box sx={{ width: "100%", maxWidth: 400 }}>
            <Stack spacing={1.5} alignItems="center" sx={{ mb: 3.5 }}>
              <Box
                sx={{
                  width: 88,
                  height: 88,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  backgroundColor: "rgba(37, 99, 235, 0.1)",
                  color: "primary.main"
                }}
              >
                <MenuBookOutlinedIcon sx={{ fontSize: 38 }} />
              </Box>
              <Typography variant="h4" align="center">
                {t("loginTitle")}
              </Typography>
              <Typography variant="body2" color="text.secondary" align="center" sx={{ maxWidth: 320 }}>
                {t("loginSubtitle")}
              </Typography>
            </Stack>

            <form onSubmit={handleSubmit(onSubmit)}>
              <Stack spacing={2.25}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.75 }}>
                    {t("loginFieldLabel")}
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder={t("loginPlaceholder")}
                    autoComplete="username"
                    {...register("login")}
                    error={!!errors.login}
                    helperText={errors.login?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonOutlineIcon fontSize="small" />
                        </InputAdornment>
                      )
                    }}
                    sx={fieldSx}
                  />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.75 }}>
                    {t("password")}
                  </Typography>
                  <TextField
                    fullWidth
                    type={showPassword ? "text" : "password"}
                    placeholder={t("passwordPlaceholder")}
                    autoComplete="current-password"
                    {...register("password")}
                    error={!!errors.password}
                    helperText={errors.password?.message}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockOutlinedIcon fontSize="small" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setShowPassword((prev) => !prev)} edge="end">
                            {showPassword ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                    sx={fieldSx}
                  />
                </Box>
                <FormControlLabel
                  control={
                    <Checkbox size="small" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
                  }
                  label={
                    <Typography variant="body2" color="text.secondary">
                      {t("rememberMe")}
                    </Typography>
                  }
                  sx={{ ml: -1 }}
                />
                <Button
                  fullWidth
                  size="large"
                  variant="contained"
                  type="submit"
                  disabled={isSubmitting}
                  startIcon={<LockOutlinedIcon />}
                  sx={{ py: 1.4, borderRadius: "10px", fontSize: 16, boxShadow: "0 10px 20px rgba(37, 99, 235, 0.25)" }}
                >
                  {t("signIn")}
                </Button>
              </Stack>
            </form>

            <Divider sx={{ my: 3.5 }} />

            <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="center" sx={{ flexWrap: "wrap" }}>
              <HelpOutlineOutlinedIcon fontSize="small" sx={{ color: "text.disabled" }} />
              <Typography variant="body2" color="text.secondary">
                {t("supportQuestion")}
              </Typography>
              <Typography variant="body2" sx={{ color: "primary.main", fontWeight: 600 }}>
                {t("supportContact")}
              </Typography>
            </Stack>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
