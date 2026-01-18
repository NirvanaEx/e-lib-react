import React from "react";
import {
  AppBar,
  Box,
  Button,
  Chip,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import BusinessIcon from "@mui/icons-material/Business";
import PolicyOutlinedIcon from "@mui/icons-material/PolicyOutlined";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../shared/hooks/useAuth";
import i18n from "../i18n";
import { changeLanguage } from "../../features/settings/settings.api";
import { useToast } from "../../shared/ui/ToastProvider";
import { useTranslation } from "react-i18next";
import { getDefaultRoute, hasAccess } from "../../shared/utils/access";
import { acceptUserContentPage, fetchUserContentPage } from "../../features/content-pages/content-pages.api";

export type NavItem = {
  label: string;
  path: string;
  icon?: React.ReactNode;
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

const drawerWidth = 260;
const collapsedDrawerWidth = 84;

export function BaseLayout({
  title,
  items = [],
  sections,
  children,
  sidebarContent,
  sidebarFooter,
  settingsPath,
  settingsAction,
  headerTitle,
  sidebarHeader,
  sidebarPaddingTop,
  sidebarTop,
  sidebarCollapsible = false
}: {
  title: string;
  items?: NavItem[];
  sections?: NavSection[];
  children: React.ReactNode;
  sidebarContent?: React.ReactNode | ((options: { collapsed: boolean }) => React.ReactNode);
  sidebarFooter?: React.ReactNode | ((options: { collapsed: boolean }) => React.ReactNode);
  settingsPath?: string;
  settingsAction?: () => void;
  headerTitle?: React.ReactNode;
  sidebarHeader?: React.ReactNode | ((options: { collapsed: boolean }) => React.ReactNode) | null;
  sidebarPaddingTop?: number;
  sidebarTop?: React.ReactNode | ((options: { collapsed: boolean; toggle: () => void }) => React.ReactNode) | null;
  sidebarCollapsible?: boolean;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, clearAuth, updateUser } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const collapsed = sidebarCollapsible ? isCollapsed : false;
  const effectiveDrawerWidth = collapsed ? collapsedDrawerWidth : drawerWidth;
  const [agreementOpen, setAgreementOpen] = React.useState(false);
  const [agreementDismissed, setAgreementDismissed] = React.useState(false);
  const queryClient = useQueryClient();

  const agreementKey = "user_agreement";

  const { data: agreementData, isLoading: agreementLoading } = useQuery({
    queryKey: ["content-page-user", agreementKey, user?.id, i18n.language],
    queryFn: () => fetchUserContentPage(agreementKey),
    enabled: Boolean(user?.id)
  });

  const acceptAgreementMutation = useMutation({
    mutationFn: () => acceptUserContentPage(agreementKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-page-user", agreementKey] });
    },
    onError: () => showToast({ message: t("actionFailed"), severity: "error" })
  });

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev);
  };
  const toggleCollapsed = () => {
    setIsCollapsed((prev) => !prev);
  };

  React.useEffect(() => {
    setAgreementDismissed(false);
  }, [user?.id]);

  React.useEffect(() => {
    if (agreementData?.shouldShow && !agreementDismissed) {
      setAgreementOpen(true);
    }
  }, [agreementData?.shouldShow, agreementDismissed]);

  const handleAgreementClose = () => {
    setAgreementDismissed(true);
    setAgreementOpen(false);
    if (user?.id) {
      acceptAgreementMutation.mutate();
    }
  };

  const panelLinks = React.useMemo(() => {
    const links: { key: string; label: string; path: string }[] = [];
    if (hasAccess(user, ["dashboard.access"])) {
      links.push({ key: "dashboard", label: t("dashboard"), path: getDefaultRoute(user) });
    }
    if (user?.role === "superadmin" || user?.role === "admin" || user?.role === "manager" || user?.role === "user") {
      links.push({ key: "user", label: t("user"), path: "/users" });
    }
    return links;
  }, [t, user]);

  const currentPanel = pathname.startsWith("/dashboard") ? "dashboard" : "user";
  const dashboardLink = panelLinks.find((panel) => panel.key === "dashboard");
  const userLink = panelLinks.find((panel) => panel.key === "user");
  const switchLink = currentPanel === "dashboard" ? userLink : dashboardLink;
  const userDisplayName = React.useMemo(() => {
    if (!user) return null;
    const surname = user.surname?.trim();
    const nameInitial = user.name?.trim().charAt(0);
    const patronymicInitial = user.patronymic?.trim().charAt(0);
    const initials = [nameInitial, patronymicInitial]
      .filter(Boolean)
      .map((ch) => ch?.toUpperCase())
      .join(".");
    if (surname) {
      return initials ? `${surname} ${initials}.` : surname;
    }
    if (initials) {
      return `${initials}.`;
    }
    return user.login || null;
  }, [user]);
  const showRoleChip = Boolean(
    user?.role &&
      (!userDisplayName || user.role.toLowerCase() !== userDisplayName.toLowerCase())
  );

  const defaultSidebarHeader = collapsed ? (
    <Box sx={{ mb: 2, display: "flex", justifyContent: "center" }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {t("appName")}
      </Typography>
    </Box>
  ) : (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        {t("appName")}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.16em" }}>
        {title}
      </Typography>
    </Box>
  );
  const resolvedSidebarHeader =
    sidebarHeader === undefined ? defaultSidebarHeader : typeof sidebarHeader === "function" ? sidebarHeader({ collapsed }) : sidebarHeader;
  const resolvedSidebarContent =
    typeof sidebarContent === "function" ? sidebarContent({ collapsed }) : sidebarContent;
  const resolvedSidebarFooter =
    typeof sidebarFooter === "function" ? sidebarFooter({ collapsed }) : sidebarFooter;
  const resolvedSidebarTop =
    typeof sidebarTop === "function" ? sidebarTop({ collapsed, toggle: toggleCollapsed }) : sidebarTop;
  const sidebarTopNode = sidebarTop === null ? null : (
      <Toolbar sx={{ px: 2, minHeight: { xs: 56, sm: 64 } }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          {resolvedSidebarTop}
        </Box>
      </Toolbar>
    );

  const hasNavItems = Boolean(
    (sections && sections.some((section) => section.items && section.items.length > 0)) || (items && items.length > 0)
  );

  const drawerContent = (
    <Box
      sx={{
        px: collapsed ? 1.5 : 2.5,
        pb: 2.5,
        pt: sidebarPaddingTop ?? 2.5,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background:
          "linear-gradient(170deg, rgba(29,77,79,0.06) 0%, rgba(198,138,63,0.08) 45%, rgba(255,255,255,0.9) 100%)"
      }}
    >
      {resolvedSidebarHeader}
      <Box sx={{ flex: 1, overflow: "auto", pr: collapsed ? 0 : 0.5 }}>
        {hasNavItems && (
          <List>
            {(sections && sections.length > 0 ? sections : [{ label: "", items }]).map((section) => (
              <Box key={section.label || "default"}>
                {section.label && !collapsed && (
                  <Typography
                    variant="overline"
                    color="text.secondary"
                    sx={{ letterSpacing: "0.16em", fontWeight: 700, display: "block", mb: 1 }}
                  >
                    {section.label}
                  </Typography>
                )}
                {section.items.map((item) => {
                  const active = pathname.startsWith(item.path);
                  const button = (
                    <ListItemButton
                      key={item.path}
                      selected={active}
                      onClick={() => navigate(item.path)}
                      sx={{
                        borderRadius: 2.5,
                        mb: 0.8,
                        py: 1.2,
                        justifyContent: collapsed ? "center" : "flex-start",
                        px: collapsed ? 1.2 : 2,
                        "&.Mui-selected": {
                          backgroundColor: "rgba(29, 77, 79, 0.12)"
                        },
                        "&.Mui-selected:hover": {
                          backgroundColor: "rgba(29, 77, 79, 0.16)"
                        }
                      }}
                    >
                      {item.icon && (
                        <ListItemIcon
                          sx={{
                            minWidth: collapsed ? 0 : 36,
                            mr: collapsed ? 0 : 1,
                            color: active ? "primary.main" : "text.secondary"
                          }}
                        >
                          {item.icon}
                        </ListItemIcon>
                      )}
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
                {section.label && <Box sx={{ mb: 1.5 }} />}
              </Box>
            ))}
          </List>
        )}
        {resolvedSidebarContent && (
          <Box sx={{ mt: hasNavItems ? 2 : 0 }}>
            {hasNavItems && <Divider sx={{ mb: 2 }} />}
            {resolvedSidebarContent}
          </Box>
        )}
      </Box>
      {resolvedSidebarFooter && (
        <Box sx={{ mt: 2 }}>
          <Divider sx={{ mb: 2 }} />
          {resolvedSidebarFooter}
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
          width: { md: `calc(100% - ${effectiveDrawerWidth}px)` },
          ml: { md: `${effectiveDrawerWidth}px` }
        }}
      >
        <Toolbar sx={{ display: "flex", justifyContent: "space-between", px: { xs: 2, md: 3 } }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 1, display: { md: "none" } }}>
              <MenuIcon />
            </IconButton>
            {sidebarCollapsible && (
              <IconButton
                color="inherit"
                edge="start"
                onClick={toggleCollapsed}
                sx={{ mr: 1, display: { xs: "none", md: "inline-flex" } }}
              >
                <MenuIcon />
              </IconButton>
            )}
            {headerTitle === undefined ? <Typography variant="h6">{title}</Typography> : headerTitle}
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {switchLink && (
              <Stack direction="row" spacing={1}>
                <Button size="small" variant="outlined" onClick={() => navigate(switchLink.path)}>
                  {switchLink.label}
                </Button>
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
            {(settingsPath || settingsAction) && (
              <Tooltip title={t("settings")}>
                <IconButton color="inherit" onClick={() => (settingsAction ? settingsAction() : settingsPath && navigate(settingsPath))}>
                  <SettingsIcon />
                </IconButton>
              </Tooltip>
            )}
            {user && agreementData?.isActive && (
              <Tooltip title={t("userAgreement")}>
                <IconButton color="inherit" onClick={() => setAgreementOpen(true)}>
                  <PolicyOutlinedIcon />
                </IconButton>
              </Tooltip>
            )}
            {user && (
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{
                  px: 1.5,
                  py: 0.6,
                  borderRadius: 99,
                  border: "1px solid var(--border)",
                  backgroundColor: "rgba(255,255,255,0.7)"
                }}
              >
                {user.department && (
                  <Chip
                    icon={<BusinessIcon fontSize="small" />}
                    label={user.department}
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                )}
                {showRoleChip && user?.role && (
                  <Chip
                    label={user.role}
                    size="small"
                    sx={{ textTransform: "capitalize", fontWeight: 600, backgroundColor: "rgba(29, 77, 79, 0.12)" }}
                  />
                )}
                {userDisplayName && (
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {userDisplayName}
                  </Typography>
                )}
              </Stack>
            )}
            <Tooltip title={t("logout")}>
              <IconButton onClick={clearAuth} color="inherit">
                <LogoutIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { md: effectiveDrawerWidth }, flexShrink: { md: 0 } }}>
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
            {sidebarTopNode === null ? null : sidebarTopNode ?? <Toolbar />}
            <Box sx={{ flex: 1 }}>{drawerContent}</Box>
          </Box>
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: effectiveDrawerWidth,
              borderRight: "1px solid var(--border)"
            }
          }}
          open
        >
          <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
            {sidebarTopNode === null ? null : sidebarTopNode ?? <Toolbar />}
            <Box sx={{ flex: 1 }}>{drawerContent}</Box>
          </Box>
        </Drawer>
      </Box>
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 4 } }}>
        <Toolbar />
        {children}
      </Box>
      <Dialog open={agreementOpen} onClose={handleAgreementClose} fullWidth maxWidth="sm">
        <DialogTitle>{agreementData?.title || t("userAgreement")}</DialogTitle>
        <DialogContent>
          {agreementLoading ? (
            <Typography variant="body2" color="text.secondary">
              {t("loading")}
            </Typography>
          ) : (
            <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
              {agreementData?.body || ""}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAgreementClose} variant="contained">
            {t("agreementAccept")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
