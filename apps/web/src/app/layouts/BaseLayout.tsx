import React from "react";
import {
  AppBar,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Toolbar,
  Tooltip,
  Typography
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import SettingsIcon from "@mui/icons-material/Settings";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../shared/hooks/useAuth";
import i18n from "../i18n";
import { changeLanguage } from "../../features/settings/settings.api";
import { useToast } from "../../shared/ui/ToastProvider";
import { useTranslation } from "react-i18next";
import { getDefaultRoute, hasAccess } from "../../shared/utils/access";

export type NavItem = {
  label: string;
  path: string;
  icon?: React.ReactNode;
};

const drawerWidth = 260;

export function BaseLayout({
  title,
  items,
  children,
  sidebarContent,
  settingsPath
}: {
  title: string;
  items: NavItem[];
  children: React.ReactNode;
  sidebarContent?: React.ReactNode;
  settingsPath?: string;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, clearAuth, updateUser } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev);
  };

  const panelLinks = React.useMemo(() => {
    const links: { key: string; label: string; path: string }[] = [];
    if (hasAccess(user, ["dashboard.access"])) {
      links.push({ key: "dashboard", label: t("dashboard"), path: getDefaultRoute(user) });
    }
    if (user?.role === "superadmin" || user?.role === "admin" || user?.role === "user") {
      links.push({ key: "user", label: t("user"), path: "/users" });
    }
    return links;
  }, [t, user]);

  const currentPanel = pathname.startsWith("/dashboard") ? "dashboard" : "user";

  const drawerContent = (
    <Box
      sx={{
        p: 2.5,
        height: "100%",
        background:
          "linear-gradient(170deg, rgba(29,77,79,0.06) 0%, rgba(198,138,63,0.08) 45%, rgba(255,255,255,0.9) 100%)"
      }}
    >
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {t("appName")}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.16em" }}>
          {title}
        </Typography>
      </Box>
      <List>
        {items.map((item) => {
          const active = pathname.startsWith(item.path);
          return (
            <ListItemButton
              key={item.path}
              selected={active}
              onClick={() => navigate(item.path)}
              sx={{
                borderRadius: 2.5,
                mb: 0.8,
                py: 1.2,
                "&.Mui-selected": {
                  backgroundColor: "rgba(29, 77, 79, 0.12)"
                },
                "&.Mui-selected:hover": {
                  backgroundColor: "rgba(29, 77, 79, 0.16)"
                }
              }}
            >
              {item.icon && (
                <ListItemIcon sx={{ minWidth: 36, color: active ? "primary.main" : "text.secondary" }}>
                  {item.icon}
                </ListItemIcon>
              )}
              <ListItemText
                primary={
                  <Typography variant="body2" sx={{ fontWeight: active ? 700 : 600 }}>
                    {item.label}
                  </Typography>
                }
              />
            </ListItemButton>
          );
        })}
      </List>
      {sidebarContent && (
        <Box sx={{ mt: 2 }}>
          <Divider sx={{ mb: 2 }} />
          {sidebarContent}
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppBar
        position="fixed"
        color="transparent"
        elevation={0}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backdropFilter: "blur(12px)",
          backgroundColor: "rgba(243, 241, 236, 0.9)",
          borderBottom: "1px solid var(--border)",
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` }
        }}
      >
        <Toolbar sx={{ display: "flex", justifyContent: "space-between", px: { xs: 2, md: 3 } }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 1, display: { md: "none" } }}>
              <MenuIcon />
            </IconButton>
            <Typography variant="h6">{title}</Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {panelLinks.length > 1 && (
              <Stack direction="row" spacing={1}>
                {panelLinks.map((panel) => (
                  <Button
                    key={panel.key}
                    size="small"
                    variant={currentPanel === panel.key ? "contained" : "outlined"}
                    onClick={() => navigate(panel.path)}
                  >
                    {panel.label}
                  </Button>
                ))}
              </Stack>
            )}
            <Select
              size="small"
              value={i18n.language}
              onChange={async (e) => {
                const lang = e.target.value as string;
                try {
                  await changeLanguage(lang);
                  updateUser({ lang });
                  i18n.changeLanguage(lang);
                  showToast({ message: t("languageUpdated"), severity: "success" });
                } catch (_err) {
                  showToast({ message: t("languageUpdateFailed"), severity: "error" });
                }
              }}
              sx={{ background: "white", borderRadius: 2, minWidth: 90 }}
            >
              <MenuItem value="ru">RU</MenuItem>
              <MenuItem value="en">EN</MenuItem>
              <MenuItem value="uz">UZ</MenuItem>
            </Select>
            {settingsPath && (
              <Tooltip title={t("settings")}>
                <IconButton color="inherit" onClick={() => navigate(settingsPath)}>
                  <SettingsIcon />
                </IconButton>
              </Tooltip>
            )}
            {user?.role && (
              <Chip
                label={user.role}
                size="small"
                sx={{ textTransform: "capitalize", fontWeight: 600, backgroundColor: "rgba(29, 77, 79, 0.12)" }}
              />
            )}
            <Typography variant="body2">{user?.login}</Typography>
            <Tooltip title={t("logout")}>
              <IconButton onClick={clearAuth} color="inherit">
                <LogoutIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth }
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <Toolbar />
            <Box sx={{ flex: 1, overflow: "auto" }}>{drawerContent}</Box>
          </Box>
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth, borderRight: "1px solid var(--border)" }
          }}
          open
        >
          <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <Toolbar />
            <Box sx={{ flex: 1, overflow: "auto" }}>{drawerContent}</Box>
          </Box>
        </Drawer>
      </Box>
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 4 } }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
