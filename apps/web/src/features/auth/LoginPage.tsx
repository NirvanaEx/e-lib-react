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
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import UpdateOutlinedIcon from "@mui/icons-material/UpdateOutlined";
import CloudDoneOutlinedIcon from "@mui/icons-material/CloudDoneOutlined";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import FlightTakeoffIcon from "@mui/icons-material/FlightTakeoff";
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

const schema = z.object({
  login: z.string().min(1),
  password: z.string().min(1)
});

type FormValues = z.infer<typeof schema>;

const REMEMBER_KEY = "remembered-login";

const heroNavy = "linear-gradient(165deg, #14406f 0%, #0c2a52 48%, #081c39 100%)";

function HeroRing({ size, top, right, opacity }: { size: number; top: number; right: number; opacity: number }) {
  return (
    <Box
      sx={{
        position: "absolute",
        width: size,
        height: size,
        top,
        right,
        borderRadius: "50%",
        border: "1px solid rgba(255,255,255,0.35)",
        opacity,
        pointerEvents: "none"
      }}
    />
  );
}

function BookSpine({ label, height, tone }: { label: string; height: number; tone: string }) {
  return (
    <Box
      sx={{
        width: 46,
        height,
        borderRadius: "8px 8px 4px 4px",
        background: `linear-gradient(180deg, ${tone} 0%, rgba(8, 25, 50, 0.95) 100%)`,
        border: "1px solid rgba(255,255,255,0.14)",
        boxShadow: "0 14px 24px rgba(2, 10, 24, 0.45)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        pt: 1.5,
        pb: 1.25,
        flexShrink: 0
      }}
    >
      <Typography
        sx={{
          writingMode: "vertical-rl",
          transform: "rotate(180deg)",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.85)",
          overflow: "hidden",
          maxHeight: height - 46
        }}
      >
        {label}
      </Typography>
      <Box sx={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.2)" }} />
    </Box>
  );
}

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

  const features = [
    { icon: <ShieldOutlinedIcon fontSize="small" />, label: t("featureSecureAccess") },
    { icon: <UpdateOutlinedIcon fontSize="small" />, label: t("featureActualVersions") },
    { icon: <CloudDoneOutlinedIcon fontSize="small" />, label: t("featureReliableStorage") },
    { icon: <AdminPanelSettingsOutlinedIcon fontSize="small" />, label: t("featureAccessControl") }
  ];

  const spines = [
    { label: t("heroDoc1"), height: 190, tone: "#1c4a80" },
    { label: t("heroDoc2"), height: 200, tone: "#16406f" },
    { label: t("heroDoc3"), height: 182, tone: "#1c4a80" },
    { label: t("heroDoc4"), height: 196, tone: "#123a66" },
    { label: t("heroDoc5"), height: 188, tone: "#1c4a80" }
  ];

  const fieldSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: 2.5,
      backgroundColor: "#fff"
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", backgroundColor: "#fff" }}>
      <Box
        sx={{
          flex: 1.15,
          display: { xs: "none", md: "flex" },
          position: "relative",
          overflow: "hidden",
          flexDirection: "column",
          justifyContent: "space-between",
          gap: 4,
          p: { md: 5, lg: 6 },
          background: heroNavy,
          color: "#fff"
        }}
      >
        <HeroRing size={420} top={-140} right={-120} opacity={0.16} />
        <HeroRing size={620} top={-220} right={-200} opacity={0.1} />
        <HeroRing size={860} top={-320} right={-300} opacity={0.06} />

        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ position: "relative" }}>
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              border: "1px solid rgba(255,255,255,0.35)",
              backgroundColor: "rgba(255,255,255,0.08)"
            }}
          >
            <FlightTakeoffIcon />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", lineHeight: 1.2 }}>
              {t("appName")}
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)" }}>
              {t("heroTagline")}
            </Typography>
          </Box>
        </Stack>

        <Box sx={{ position: "relative" }}>
          <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: "-0.02em", maxWidth: 560, mb: 2 }}>
            {t("heroTitle")}
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.72)", maxWidth: 460, mb: { md: 4, lg: 6 } }}>
            {t("heroSubtitle")}
          </Typography>

          <Stack direction="row" spacing={1.25} alignItems="flex-end" sx={{ position: "relative", pb: 2 }}>
            <Box
              sx={{
                position: "absolute",
                left: -30,
                right: -30,
                bottom: 0,
                height: 46,
                background: "radial-gradient(closest-side, rgba(96, 165, 250, 0.35), transparent)",
                filter: "blur(6px)",
                pointerEvents: "none"
              }}
            />
            <Box
              sx={{
                width: 168,
                height: 224,
                borderRadius: "10px 14px 14px 8px",
                background: "linear-gradient(160deg, #1d4f8a 0%, #12335d 60%, #0b2547 100%)",
                border: "1px solid rgba(255,255,255,0.18)",
                boxShadow: "0 18px 32px rgba(2, 10, 24, 0.5)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 1.5,
                px: 2,
                flexShrink: 0
              }}
            >
              <Box
                sx={{
                  width: 56,
                  height: 62,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: "10px 10px 24px 24px",
                  border: "1px solid rgba(255,255,255,0.3)",
                  backgroundColor: "rgba(255,255,255,0.08)"
                }}
              >
                <FlightTakeoffIcon fontSize="small" />
              </Box>
              <Typography
                align="center"
                sx={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.92)" }}
              >
                {t("heroCoverTitle")}
              </Typography>
            </Box>
            {spines.map((spine) => (
              <BookSpine key={spine.label} label={spine.label} height={spine.height} tone={spine.tone} />
            ))}
          </Stack>
        </Box>

        <Stack
          direction="row"
          spacing={2}
          sx={{ position: "relative", justifyContent: "space-between", flexWrap: "wrap", rowGap: 2 }}
        >
          {features.map((feature) => (
            <Stack key={feature.label} spacing={1} alignItems="center" sx={{ minWidth: 110, flex: 1 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2.5,
                  display: "grid",
                  placeItems: "center",
                  border: "1px solid rgba(255,255,255,0.22)",
                  backgroundColor: "rgba(255,255,255,0.06)"
                }}
              >
                {feature.icon}
              </Box>
              <Typography variant="caption" align="center" sx={{ color: "rgba(255,255,255,0.75)" }}>
                {feature.label}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Box>

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
            sx={{ borderRadius: 99, minWidth: 100, "& .MuiOutlinedInput-notchedOutline": { borderColor: "var(--border)" } }}
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
                  sx={{ py: 1.4, borderRadius: 2.5, fontSize: 16, boxShadow: "0 10px 20px rgba(37, 99, 235, 0.25)" }}
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
