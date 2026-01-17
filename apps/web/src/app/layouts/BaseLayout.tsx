import React from "react";
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  MenuItem,
  Select
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../shared/hooks/useAuth";
import i18n from "../i18n";
import { changeLanguage } from "../../features/settings/settings.api";

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
  const { user, clearAuth } = useAuth();

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev);
  };

  const drawer = (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {title}
      </Typography>
      <List>
        {items.map((item) => (
          <ListItemButton
            key={item.path}
            selected={pathname.startsWith(item.path)}
            onClick={() => navigate(item.path)}
            sx={{ borderRadius: 2, mb: 0.5 }}
          >
            {item.icon && <ListItemIcon>{item.icon}</ListItemIcon>}
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppBar
        position="fixed"
        color="transparent"
        elevation={0}
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, backdropFilter: "blur(8px)" }}
      >
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
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
                await changeLanguage(lang);
                i18n.changeLanguage(lang);
              }}
              sx={{ background: "white", borderRadius: 2 }}
            >
              <MenuItem value="ru">RU</MenuItem>
              <MenuItem value="en">EN</MenuItem>
              <MenuItem value="uz">UZ</MenuItem>
            </Select>
            <Typography variant="body2">{user?.login}</Typography>
            <IconButton onClick={clearAuth} color="inherit">
              <LogoutIcon />
            </IconButton>
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
            "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth }
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 3 }, mt: 8 }}>
        {children}
      </Box>
    </Box>
  );
}
