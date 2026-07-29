import React from "react";
import {
  Avatar,
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  IconButton,
  InputAdornment,
  Slider,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography
} from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import TranslateIcon from "@mui/icons-material/Translate";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import BlurOnOutlinedIcon from "@mui/icons-material/BlurOnOutlined";
import Crop32OutlinedIcon from "@mui/icons-material/Crop32Outlined";
import OpacityOutlinedIcon from "@mui/icons-material/OpacityOutlined";
import { changePassword, changeLanguage, uploadMyAvatar, removeMyAvatar } from "./settings.api";
import { AvatarCropDialog, ImageLightbox } from "../../shared/ui/AvatarEditor";
import i18n from "../../app/i18n";
import { useToast } from "../../shared/ui/ToastProvider";
import { useAuth } from "../../shared/hooks/useAuth";
import { useThemeMode } from "../../shared/hooks/useThemeMode";
import { getAvatarUrl } from "../../shared/utils/avatar";
import { getErrorMessage } from "../../shared/utils/errors";
import { LANGUAGES, flagFrameSx } from "../../shared/ui/LanguageMenu";
import { useTranslation } from "react-i18next";

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}

function ChoiceCard({
  selected,
  onClick,
  icon,
  label
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        flex: 1,
        minWidth: 0,
        alignItems: "stretch",
        justifyContent: "flex-start",
        textAlign: "left",
        borderRadius: "12px",
        p: 1.5,
        border: "1.5px solid",
        borderColor: selected ? "primary.main" : "var(--border)",
        backgroundColor: selected ? "rgba(37, 99, 235, 0.06)" : "var(--surface)",
        transition: "border-color .15s ease, background-color .15s ease",
        position: "relative",
        "&:hover": { borderColor: "primary.main" }
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%" }}>
        <Box sx={{ color: selected ? "primary.main" : "text.secondary", display: "flex" }}>{icon}</Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
            {label}
          </Typography>
        </Box>
      </Stack>
      {selected && (
        <CheckCircleRoundedIcon color="primary" sx={{ position: "absolute", top: 8, right: 8, fontSize: 18 }} />
      )}
    </ButtonBase>
  );
}

const AVATAR_ACCEPT = "image/png,image/jpeg,image/webp,image/gif";

export function ProfileTab() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { user, updateUser } = useAuth();
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [cropFile, setCropFile] = React.useState<File | null>(null);
  const [lightboxOpen, setLightboxOpen] = React.useState(false);

  const avatarUrl = getAvatarUrl(user);
  const fullName = [user?.surname, user?.name, user?.patronymic].filter(Boolean).join(" ") || user?.login || "";
  const initials =
    [user?.surname, user?.name]
      .map((part) => part?.trim().charAt(0))
      .filter(Boolean)
      .join("")
      .toUpperCase() || user?.login?.trim().charAt(0).toUpperCase() || "?";

  const uploadMutation = useMutation({
    mutationFn: uploadMyAvatar,
    onSuccess: (data) => {
      updateUser({ avatar: data?.avatar || null });
      setCropFile(null);
      showToast({ message: t("avatarUpdated"), severity: "success" });
    },
    onError: (error) => showToast({ message: getErrorMessage(error, t("actionFailed")), severity: "error" })
  });

  const removeMutation = useMutation({
    mutationFn: removeMyAvatar,
    onSuccess: () => {
      updateUser({ avatar: null });
      showToast({ message: t("avatarRemoved"), severity: "success" });
    },
    onError: (error) => showToast({ message: getErrorMessage(error, t("actionFailed")), severity: "error" })
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) {
      setCropFile(file);
    }
  };

  return (
    <Stack spacing={2}>
      <SectionHeader title={t("avatar")} subtitle={t("avatarHint")} />
      <input ref={inputRef} type="file" accept={AVATAR_ACCEPT} hidden onChange={handleFileChange} />
      <Stack direction="row" spacing={2} alignItems="center">
        <Box sx={{ position: "relative", flexShrink: 0 }}>
          <ButtonBase
            onClick={() => avatarUrl && setLightboxOpen(true)}
            disabled={!avatarUrl}
            aria-label={t("viewPhoto")}
            sx={{ borderRadius: "50%", cursor: avatarUrl ? "zoom-in" : "default" }}
          >
            <Avatar
              src={avatarUrl}
              sx={{ width: 84, height: 84, fontSize: 30, fontWeight: 700, bgcolor: "primary.main", color: "#fff" }}
            >
              {initials}
            </Avatar>
          </ButtonBase>
          {uploadMutation.isPending && (
            <CircularProgress
              size={84}
              thickness={2}
              sx={{ position: "absolute", top: 0, left: 0, color: "primary.main", pointerEvents: "none" }}
            />
          )}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body1" sx={{ fontWeight: 700 }} noWrap>
            {fullName}
          </Typography>
          {user?.position && (
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
              {user.position}
            </Typography>
          )}
          {user?.department && (
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
              {user.department}
            </Typography>
          )}
          <Stack direction="row" spacing={1} sx={{ mt: 1.25, flexWrap: "wrap" }}>
            <Button
              size="small"
              variant="contained"
              startIcon={<PhotoCameraOutlinedIcon />}
              disabled={uploadMutation.isPending}
              onClick={() => inputRef.current?.click()}
            >
              {user?.avatar ? t("changeAvatar") : t("uploadAvatar")}
            </Button>
            {user?.avatar && (
              <Button
                size="small"
                color="error"
                startIcon={<DeleteOutlineOutlinedIcon />}
                disabled={removeMutation.isPending}
                onClick={() => removeMutation.mutate()}
              >
                {t("removeAvatar")}
              </Button>
            )}
          </Stack>
        </Box>
      </Stack>
      <AvatarCropDialog
        open={Boolean(cropFile)}
        file={cropFile}
        saving={uploadMutation.isPending}
        onClose={() => setCropFile(null)}
        onSave={(blob) => uploadMutation.mutate(new File([blob], "avatar.png", { type: "image/png" }))}
      />
      <ImageLightbox open={lightboxOpen} src={avatarUrl} onClose={() => setLightboxOpen(false)} />
    </Stack>
  );
}

function AppearanceTab() {
  const { t } = useTranslation();
  const { mode, setMode, style, setStyle, glassOpacity, setGlassOpacity } = useThemeMode();

  return (
    <Stack spacing={3}>
      <Stack spacing={1.25}>
        <SectionHeader title={t("themeMode")} subtitle={t("themeModeHint")} />
        <Stack direction="row" spacing={1.5}>
          <ChoiceCard
            selected={mode === "light"}
            onClick={() => setMode("light")}
            icon={<LightModeOutlinedIcon fontSize="small" />}
            label={t("themeLight")}
          />
          <ChoiceCard
            selected={mode === "dark"}
            onClick={() => setMode("dark")}
            icon={<DarkModeOutlinedIcon fontSize="small" />}
            label={t("themeDark")}
          />
        </Stack>
      </Stack>
      <Stack spacing={1.25}>
        <SectionHeader title={t("themeStyle")} subtitle={t("themeStyleHint")} />
        <Stack direction="row" spacing={1.5}>
          <ChoiceCard
            selected={style === "glass"}
            onClick={() => setStyle("glass")}
            icon={<BlurOnOutlinedIcon fontSize="small" />}
            label={t("styleGlass")}
          />
          <ChoiceCard
            selected={style === "standard"}
            onClick={() => setStyle("standard")}
            icon={<Crop32OutlinedIcon fontSize="small" />}
            label={t("styleStandard")}
          />
        </Stack>
      </Stack>
      {style === "glass" && (
        <Stack spacing={1.25}>
          <SectionHeader title={t("glassOpacity")} subtitle={t("glassOpacityHint")} />
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ px: 0.5 }}>
            <OpacityOutlinedIcon fontSize="small" sx={{ color: "text.secondary" }} />
            <Slider
              size="small"
              min={10}
              max={90}
              step={5}
              value={glassOpacity}
              onChange={(_, value) => setGlassOpacity(Number(value))}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${value}%`}
              aria-label={t("glassOpacity")}
            />
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 42, textAlign: "right", fontWeight: 600 }}>
              {glassOpacity}%
            </Typography>
          </Stack>
        </Stack>
      )}
    </Stack>
  );
}

function LanguageTab() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { updateUser } = useAuth();
  const [current, setCurrent] = React.useState((i18n.language || "ru").split("-")[0]);

  const languageMutation = useMutation({
    mutationFn: (lang: string) => changeLanguage(lang),
    onSuccess: (_data, lang) => {
      i18n.changeLanguage(lang);
      updateUser({ lang });
      setCurrent(lang);
      showToast({ message: t("languageUpdated"), severity: "success" });
    },
    onError: () => showToast({ message: t("languageUpdateFailed"), severity: "error" })
  });

  return (
    <Stack spacing={1.5}>
      <SectionHeader title={t("language")} subtitle={t("languageHint")} />
      <Stack spacing={1}>
        {LANGUAGES.map((item) => {
          const selected = item.code === current;
          return (
            <ButtonBase
              key={item.code}
              onClick={() => {
                if (item.code !== current) languageMutation.mutate(item.code);
              }}
              sx={{
                justifyContent: "flex-start",
                gap: 1.25,
                borderRadius: "12px",
                px: 1.5,
                py: 1.25,
                border: "1.5px solid",
                borderColor: selected ? "primary.main" : "var(--border)",
                backgroundColor: selected ? "rgba(37, 99, 235, 0.06)" : "var(--surface)",
                transition: "border-color .15s ease, background-color .15s ease",
                "&:hover": { borderColor: "primary.main" }
              }}
            >
              <Box sx={flagFrameSx}>{item.flag}</Box>
              <Typography variant="body2" sx={{ fontWeight: selected ? 700 : 600, flex: 1, textAlign: "left" }}>
                {item.label}
              </Typography>
              {selected && <CheckCircleRoundedIcon color="primary" sx={{ fontSize: 20 }} />}
            </ButtonBase>
          );
        })}
      </Stack>
    </Stack>
  );
}

function SecurityTab() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [showPassword, setShowPassword] = React.useState(false);

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
    onSuccess: () => {
      passwordForm.reset({ currentPassword: "", newPassword: "", confirmPassword: "" });
      showToast({ message: t("passwordUpdated"), severity: "success" });
    },
    onError: () => showToast({ message: t("actionFailed"), severity: "error" })
  });

  const onSubmit = (values: PasswordForm) => {
    passwordMutation.mutate({ currentPassword: values.currentPassword, newPassword: values.newPassword });
  };

  const visibilityAdornment = (
    <InputAdornment position="end">
      <IconButton size="small" edge="end" onClick={() => setShowPassword((prev) => !prev)}>
        {showPassword ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
      </IconButton>
    </InputAdornment>
  );

  const fieldType = showPassword ? "text" : "password";

  return (
    <Stack spacing={2}>
      <SectionHeader title={t("changePassword")} subtitle={t("changePasswordHint")} />
      <form onSubmit={passwordForm.handleSubmit(onSubmit)}>
        <Stack spacing={2}>
          <TextField
            label={t("currentPassword")}
            type={fieldType}
            fullWidth
            autoComplete="current-password"
            {...passwordForm.register("currentPassword")}
            error={!!passwordForm.formState.errors.currentPassword}
            helperText={passwordForm.formState.errors.currentPassword?.message}
            InputProps={{ endAdornment: visibilityAdornment }}
          />
          <TextField
            label={t("newPassword")}
            type={fieldType}
            fullWidth
            autoComplete="new-password"
            {...passwordForm.register("newPassword")}
            error={!!passwordForm.formState.errors.newPassword}
            helperText={passwordForm.formState.errors.newPassword?.message}
            InputProps={{ endAdornment: visibilityAdornment }}
          />
          <TextField
            label={t("confirmPassword")}
            type={fieldType}
            fullWidth
            autoComplete="new-password"
            {...passwordForm.register("confirmPassword")}
            error={!!passwordForm.formState.errors.confirmPassword}
            helperText={passwordForm.formState.errors.confirmPassword?.message}
            InputProps={{ endAdornment: visibilityAdornment }}
          />
          <Button type="submit" variant="contained" disabled={passwordMutation.isPending} sx={{ alignSelf: "flex-end" }}>
            {t("updatePassword")}
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}

export function SettingsPanel() {
  const { t } = useTranslation();
  const [tab, setTab] = React.useState("profile");

  return (
    <Box>
      <Tabs
        value={tab}
        onChange={(_, next) => setTab(next)}
        variant="fullWidth"
        sx={{
          mb: 2.5,
          minHeight: 44,
          "& .MuiTab-root": { textTransform: "none", fontWeight: 600, minHeight: 44, minWidth: 0 }
        }}
      >
        <Tab value="profile" icon={<PersonOutlineOutlinedIcon fontSize="small" />} iconPosition="start" label={t("profile")} />
        <Tab value="appearance" icon={<PaletteOutlinedIcon fontSize="small" />} iconPosition="start" label={t("appearance")} />
        <Tab value="language" icon={<TranslateIcon fontSize="small" />} iconPosition="start" label={t("language")} />
        <Tab value="security" icon={<LockOutlinedIcon fontSize="small" />} iconPosition="start" label={t("password")} />
      </Tabs>
      {tab === "profile" && <ProfileTab />}
      {tab === "appearance" && <AppearanceTab />}
      {tab === "language" && <LanguageTab />}
      {tab === "security" && <SecurityTab />}
    </Box>
  );
}
