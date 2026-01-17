import React from "react";
import {
  AppBar,
  Box,
  Chip,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  Toolbar,
  Tooltip,
  Typography
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../shared/hooks/useAuth";
import i18n from "../i18n";
import { changeLanguage } from "../../features/settings/settings.api";
import { useToast } from "../../shared/ui/ToastProvider";
import { useTranslation } from "react-i18next";

export type NavItem = {
  label: string;
  path: string;
  icon?: React.ReactNode;
};

const drawerWidth = 260;

export function BaseLayout({ title, items, children }: { title: string; items: NavItem[]; children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, clearAuth, updateUser } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev);
  };

  const drawer = (
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
          borderBottom: "1px solid var(--border)"
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
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth, borderRight: "1px solid var(--border)" }
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 4 }, mt: 9 }}>
        {children}
      </Box>
    </Box>
  );
}
