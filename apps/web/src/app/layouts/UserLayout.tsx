import React from "react";
import { Box, ButtonBase, List, ListItemButton, ListItemIcon, ListItemText, Stack, Switch, Tooltip, Typography } from "@mui/material";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import FolderCopyOutlinedIcon from "@mui/icons-material/FolderCopyOutlined";
import StarBorderOutlinedIcon from "@mui/icons-material/StarBorderOutlined";
import ApartmentOutlinedIcon from "@mui/icons-material/ApartmentOutlined";
import PendingActionsOutlinedIcon from "@mui/icons-material/PendingActionsOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import SupportAgentOutlinedIcon from "@mui/icons-material/SupportAgentOutlined";
import LocalPhoneOutlinedIcon from "@mui/icons-material/LocalPhoneOutlined";
import { BaseLayout } from "./BaseLayout";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { SettingsDialog } from "../../features/settings/SettingsDialog";
import { useAuth } from "../../shared/hooks/useAuth";
import { useThemeMode } from "../../shared/hooks/useThemeMode";
import { NavbarSearch } from "../../features/files/NavbarSearch";
import { HELP_EXTENSIONS, HELP_PHONE, HELP_PHONE_HREF } from "../../shared/constants/support";
import logoFullColor from "../../assets/logo-full-color.png";
import logoFullWhite from "../../assets/logo-full-white.png";

const APP_VERSION = "1.0.0";

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { mode } = useThemeMode();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const logoSrc = mode === "dark" ? logoFullWhite : logoFullColor;

  const sidebarTop = ({ collapsed }: { collapsed: boolean }) => (
    <ButtonBase
      onClick={() => navigate("/users")}
      sx={{
        width: "100%",
        borderRadius: "8px",
        px: 0.5,
        py: 0.5,
        justifyContent: collapsed ? "center" : "flex-start"
      }}
    >
      {collapsed ? (
        <Box
          sx={{
            width: 38,
            height: 38,
            borderRadius: "10px",
            display: "grid",
            placeItems: "center",
            backgroundColor: "rgba(37, 99, 235, 0.12)",
            color: "primary.main"
          }}
        >
          <MenuBookOutlinedIcon fontSize="small" />
        </Box>
      ) : (
        <Box
          component="img"
          src={logoSrc}
          alt={t("appName")}
          sx={{ height: 40, maxWidth: "100%", objectFit: "contain", objectPosition: "left center" }}
        />
      )}
    </ButtonBase>
  );

  const sidebarContent = ({ collapsed }: { collapsed: boolean }) => <UserSidebarMenu collapsed={collapsed} />;
  const sidebarFooter = ({ collapsed }: { collapsed: boolean }) => <UserSidebarFooter collapsed={collapsed} />;

  const footer = (
    <Box
      sx={{
        px: { xs: 2, md: 4 },
        py: 1.25,
        background: "linear-gradient(120deg, #0c2a52 0%, #123a6b 100%)",
        color: "rgba(255,255,255,0.75)",
        display: "flex",
        flexWrap: "wrap",
        gap: 1,
        alignItems: "center",
        justifyContent: "space-between"
      }}
    >
      <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.75)" }}>
        © {new Date().getFullYear()} {t("appName")} · {t("allRightsReserved")}
      </Typography>
      <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
        {t("versionLabel")} {APP_VERSION}
      </Typography>
    </Box>
  );

  return (
    <>
      <BaseLayout
        title={t("user")}
        items={[]}
        sidebarContent={sidebarContent}
        sidebarFooter={sidebarFooter}
        settingsAction={() => setSettingsOpen(true)}
        headerTitle={null}
        headerContent={<NavbarSearch />}
        footer={footer}
        sidebarHeader={null}
        sidebarTop={sidebarTop}
        sidebarCollapsible
        sidebarPaddingTop={1}
        sidebarVariant="light"
      >
        {children}
      </BaseLayout>
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}

function UserSidebarMenu({ collapsed }: { collapsed: boolean }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const canSubmitFiles = Boolean(user?.canSubmitFiles);
  const hasDepartment = Boolean(user?.departmentId);
  const navItems = [
    { label: t("homePage"), path: "/users", icon: <HomeOutlinedIcon fontSize="small" />, exact: true },
    { label: t("allFiles"), path: "/users/files", icon: <FolderCopyOutlinedIcon fontSize="small" /> },
    ...(hasDepartment
      ? [{ label: t("departmentFiles"), path: "/users/my-library/department", icon: <ApartmentOutlinedIcon fontSize="small" /> }]
      : []),
    { label: t("favorites"), path: "/users/my-library/favorites", icon: <StarBorderOutlinedIcon fontSize="small" /> },
    ...(canSubmitFiles
      ? [{ label: t("publicationRequests"), path: "/users/my-library/requests", icon: <PendingActionsOutlinedIcon fontSize="small" /> }]
      : [])
  ];

  const itemSx = {
    borderRadius: "8px",
    mb: 0.6,
    py: 1,
    px: 1.2,
    color: "text.secondary",
    "&:hover": {
      backgroundColor: "rgba(37, 99, 235, 0.08)"
    },
    "&.Mui-selected": {
      backgroundColor: "primary.main",
      color: "#fff"
    },
    "&.Mui-selected:hover": {
      backgroundColor: "primary.dark"
    },
    "&.Mui-selected .MuiListItemIcon-root": {
      color: "#fff"
    }
  };

  return (
    <Box>
      <List disablePadding>
        {navItems.map((item) => {
          const active = item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);
          const button = (
            <ListItemButton
              key={item.path}
              selected={active}
              onClick={() => navigate(item.path)}
              sx={{ ...itemSx, justifyContent: collapsed ? "center" : "flex-start" }}
            >
              <ListItemIcon sx={{ minWidth: collapsed ? 0 : 34, color: active ? "#fff" : "text.secondary" }}>
                {item.icon}
              </ListItemIcon>
              {!collapsed && (
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ fontWeight: active ? 700 : 600 }}>
                      {item.label}
                    </Typography>
                  }
                />
              )}
            </ListItemButton>
          );
          return collapsed ? (
            <Tooltip key={item.path} title={item.label} placement="right">
              {button}
            </Tooltip>
          ) : (
            button
          );
        })}
      </List>
    </Box>
  );
}

function UserSidebarFooter({ collapsed }: { collapsed: boolean }) {
  const { t } = useTranslation();
  const { mode, toggleMode } = useThemeMode();

  if (collapsed) {
    return (
      <Stack spacing={1} alignItems="center">
        <Tooltip title={t("darkMode")} placement="right">
          <Switch size="small" checked={mode === "dark"} onChange={toggleMode} />
        </Tooltip>
      </Stack>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Box
        sx={{
          borderRadius: "10px",
          border: "1px solid var(--border)",
          backgroundColor: "var(--surface-2)",
          p: 1.5
        }}
      >
        <Stack direction="row" spacing={1.25} alignItems="flex-start">
          <SupportAgentOutlinedIcon fontSize="small" sx={{ color: "primary.main", mt: 0.25 }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {t("helpService")}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontWeight: 600 }}>
              {t("helpOrg")}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={0.75} sx={{ mt: 1.25 }}>
          {HELP_EXTENSIONS.map((extension) => (
            <Typography
              key={extension}
              variant="caption"
              sx={{
                flex: 1,
                textAlign: "center",
                py: 0.5,
                borderRadius: "6px",
                border: "1px solid var(--border)",
                backgroundColor: "var(--surface)",
                color: "text.primary",
                fontWeight: 700,
                letterSpacing: "0.02em"
              }}
            >
              {extension}
            </Typography>
          ))}
        </Stack>

        <Stack
          component="a"
          href={HELP_PHONE_HREF}
          direction="row"
          spacing={0.75}
          alignItems="center"
          sx={{
            mt: 0.75,
            color: "text.secondary",
            "&:hover": { color: "primary.main" }
          }}
        >
          <LocalPhoneOutlinedIcon sx={{ fontSize: 14 }} />
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            {HELP_PHONE}
          </Typography>
        </Stack>
      </Box>

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 0.5 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <DarkModeOutlinedIcon fontSize="small" sx={{ color: "text.secondary" }} />
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            {t("darkMode")}
          </Typography>
        </Stack>
        <Switch size="small" checked={mode === "dark"} onChange={toggleMode} />
      </Stack>
    </Stack>
  );
}
