import React from "react";
import {
  AppBar,
  Avatar,
  Box,
  Badge,
  Button,
  ButtonBase,
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
  Menu,
  MenuItem,
  Toolbar,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import SettingsIcon from "@mui/icons-material/Settings";
import PolicyOutlinedIcon from "@mui/icons-material/PolicyOutlined";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import LanguageOutlinedIcon from "@mui/icons-material/LanguageOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../shared/hooks/useAuth";
import i18n from "../i18n";
import { changeLanguage } from "../../features/settings/settings.api";
import { useToast } from "../../shared/ui/ToastProvider";
import { useTranslation } from "react-i18next";
import { getDashboardRoute, getDefaultRoute, hasAccess } from "../../shared/utils/access";
import { acceptUserContentPage, fetchUserContentPage } from "../../features/content-pages/content-pages.api";

export type NavItem = {
  label: string;
  path: string;
  icon?: React.ReactNode;
  badge?: number | string;
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

const drawerWidth = 260;
const collapsedDrawerWidth = 84;
const darkSidebarBackground = "linear-gradient(180deg, #123a6b 0%, #0c2a52 55%, #081c39 100%)";

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
  sidebarCollapsible = false,
  sidebarVariant = "light"
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
  sidebarVariant?: "light" | "dark";
}) {
  const darkSidebar = sidebarVariant === "dark";
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
  const [userMenuAnchor, setUserMenuAnchor] = React.useState<null | HTMLElement>(null);
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
      links.push({ key: "dashboard", label: t("dashboard"), path: getDashboardRoute(user) });
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
    const buildShortName = (surname?: string | null, name?: string | null, patronymic?: string | null) => {
      const cleanSurname = surname?.trim();
      const nameInitial = name?.trim().charAt(0);
      const patronymicInitial = patronymic?.trim().charAt(0);
      const initials = [nameInitial, patronymicInitial]
        .filter(Boolean)
        .map((ch) => ch?.toUpperCase())
        .join(".");
      if (cleanSurname) {
        return initials ? `${cleanSurname} ${initials}.` : cleanSurname;
      }
      if (initials) {
        return `${initials}.`;
      }
      return null;
    };

    const direct = buildShortName(user.surname, user.name, user.patronymic);
    if (direct) return direct;

    const fullName = user.fullName?.trim();
    if (fullName) {
      const [surname, name, patronymic] = fullName.split(/\s+/);
      const fromFull = buildShortName(surname, name, patronymic);
      if (fromFull) return fromFull;
      return surname || fullName;
    }

    return user.login || null;
  }, [user]);
  const userInitials = React.useMemo(() => {
    const source =
      [user?.surname, user?.name].filter(Boolean).join(" ") ||
      user?.fullName ||
      userDisplayName ||
      user?.login ||
      "";
    const parts = source.trim().split(/\s+/).filter(Boolean);
    const letters = parts
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
    return letters || "U";
  }, [user, userDisplayName]);

  const userSubtitle = React.useMemo(() => {
    if (!user) return null;
    return [user.role, user.department].filter(Boolean).join(" • ") || null;
  }, [user]);

  const handleLanguageChange = async (lang: string) => {
    try {
      await changeLanguage(lang);
      updateUser({ lang });
      i18n.changeLanguage(lang);
      showToast({ message: t("languageUpdated"), severity: "success" });
    } catch (_err) {
      showToast({ message: t("languageUpdateFailed"), severity: "error" });
    }
  };

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
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        color: darkSidebar ? "#fff" : "inherit",
        background: darkSidebar
          ? "transparent"
          : "linear-gradient(170deg, rgba(37,99,235,0.06) 0%, rgba(14,165,233,0.06) 45%, rgba(255,255,255,0.9) 100%)"
      }}
    >
      {resolvedSidebarHeader}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          mx: collapsed ? -1.5 : -2.5,
          px: collapsed ? 1.5 : 2.5
        }}
      >
        {hasNavItems && (
          <List>
            {(sections && sections.length > 0 ? sections : [{ label: "", items }]).map((section) => (
              <Box key={section.label || "default"}>
                {section.label && !collapsed && (
                  <Typography
                    variant="overline"
                    color={darkSidebar ? "rgba(255,255,255,0.6)" : "text.secondary"}
                    sx={{ letterSpacing: "0.16em", fontWeight: 700, display: "block", mb: 1 }}
                  >
                    {section.label}
                  </Typography>
                )}
                {section.items.map((item) => {
                  const active = pathname.startsWith(item.path);
                  const badgeValue =
                    item.badge === undefined || item.badge === null
                      ? null
                      : typeof item.badge === "number"
                      ? item.badge
                      : Number.isNaN(Number(item.badge))
                      ? item.badge
                      : Number(item.badge);
                  const badgeLabel =
                    badgeValue === null
                      ? null
                      : typeof badgeValue === "number"
                      ? badgeValue > 9
                        ? "9+"
                        : String(badgeValue)
                      : String(badgeValue);
                  const showBadge = badgeLabel !== null && badgeLabel !== "0";
                  const iconNode =
                    item.icon && collapsed && showBadge ? (
                      <Badge color="error" badgeContent={badgeLabel}>
                        {item.icon}
                      </Badge>
                    ) : (
                      item.icon
                    );
                  const button = (
                    <ListItemButton
                      key={item.path}
                      selected={active}
                      onClick={() => navigate(item.path)}
                      sx={{
                        borderRadius: "8px",
                        mb: 0.8,
                        py: 1.2,
                        justifyContent: collapsed ? "center" : "flex-start",
                        px: collapsed ? 1.2 : 2,
                        ...(darkSidebar
                          ? {
                              color: "rgba(255,255,255,0.85)",
                              "&:hover": { backgroundColor: "rgba(255,255,255,0.08)" },
                              "&.Mui-selected": { backgroundColor: "rgba(37, 99, 235, 0.9)", color: "#fff" },
                              "&.Mui-selected:hover": { backgroundColor: "#2563eb" }
                            }
                          : {
                              "&.Mui-selected": { backgroundColor: "rgba(37, 99, 235, 0.12)" },
                              "&.Mui-selected:hover": { backgroundColor: "rgba(37, 99, 235, 0.18)" }
                            })
                      }}
                    >
                      {item.icon && (
                        <ListItemIcon
                          sx={{
                            minWidth: collapsed ? 0 : 36,
                            mr: collapsed ? 0 : 1,
                            color: darkSidebar
                              ? active
                                ? "#fff"
                                : "rgba(255,255,255,0.7)"
                              : active
                              ? "primary.main"
                              : "text.secondary"
                          }}
                        >
                          {iconNode}
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
                      {!collapsed && showBadge && (
                        <Box sx={{ ml: "auto" }}>
                          <Chip size="small" label={badgeLabel} color="error" sx={{ fontWeight: 700 }} />
                        </Box>
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
            {hasNavItems && <Divider sx={{ mb: 2, borderColor: darkSidebar ? "rgba(255,255,255,0.14)" : undefined }} />}
            {resolvedSidebarContent}
          </Box>
        )}
      </Box>
      {resolvedSidebarFooter && (
        <Box sx={{ mt: "auto", pt: 2 }}>
          <Divider sx={{ mb: 2, borderColor: darkSidebar ? "rgba(255,255,255,0.14)" : undefined }} />
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
          backgroundColor: "rgba(255, 255, 255, 0.88)",
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
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {user && (
              <>
                <ButtonBase
                  onClick={(event) => setUserMenuAnchor(event.currentTarget)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.25,
                    px: 1.25,
                    py: 0.6,
                    borderRadius: "10px",
                    border: "1px solid var(--border)",
                    backgroundColor: "#fff",
                    textAlign: "left"
                  }}
                >
                  <Avatar
                    sx={{
                      width: 34,
                      height: 34,
                      fontSize: 13,
                      fontWeight: 700,
                      bgcolor: "rgba(37, 99, 235, 0.12)",
                      color: "primary.main"
                    }}
                  >
                    {userInitials}
                  </Avatar>
                  <Box sx={{ display: { xs: "none", sm: "block" }, minWidth: 0, maxWidth: 220 }}>
                    <Typography variant="body2" noWrap sx={{ fontWeight: 700, lineHeight: 1.25 }}>
                      {userDisplayName || user.login}
                    </Typography>
                    {userSubtitle && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        noWrap
                        sx={{ display: "block", lineHeight: 1.25, textTransform: "capitalize" }}
                      >
                        {userSubtitle}
                      </Typography>
                    )}
                  </Box>
                  <ExpandMoreIcon fontSize="small" sx={{ color: "text.secondary" }} />
                </ButtonBase>
                <Menu
                  anchorEl={userMenuAnchor}
                  open={Boolean(userMenuAnchor)}
                  onClose={() => setUserMenuAnchor(null)}
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  transformOrigin={{ vertical: "top", horizontal: "right" }}
                  slotProps={{
                    paper: {
                      sx: { mt: 1, minWidth: 240, borderRadius: "10px", border: "1px solid var(--border)", boxShadow: "0 12px 32px rgba(15, 42, 90, 0.12)" }
                    }
                  }}
                >
                  {switchLink && (
                    <MenuItem
                      onClick={() => {
                        setUserMenuAnchor(null);
                        navigate(switchLink.path);
                      }}
                    >
                      <ListItemIcon>
                        <SwapHorizIcon fontSize="small" />
                      </ListItemIcon>
                      {switchLink.label}
                    </MenuItem>
                  )}
                  {(settingsPath || settingsAction) && (
                    <MenuItem
                      onClick={() => {
                        setUserMenuAnchor(null);
                        if (settingsAction) {
                          settingsAction();
                        } else if (settingsPath) {
                          navigate(settingsPath);
                        }
                      }}
                    >
                      <ListItemIcon>
                        <SettingsIcon fontSize="small" />
                      </ListItemIcon>
                      {t("settings")}
                    </MenuItem>
                  )}
                  {agreementData?.isActive && (
                    <MenuItem
                      onClick={() => {
                        setUserMenuAnchor(null);
                        setAgreementOpen(true);
                      }}
                    >
                      <ListItemIcon>
                        <PolicyOutlinedIcon fontSize="small" />
                      </ListItemIcon>
                      {t("userAgreement")}
                    </MenuItem>
                  )}
                  <Divider sx={{ my: 0.5 }} />
                  <Box sx={{ px: 2, py: 1, display: "flex", alignItems: "center", gap: 1.25 }}>
                    <LanguageOutlinedIcon fontSize="small" sx={{ color: "text.secondary" }} />
                    <ToggleButtonGroup
                      size="small"
                      exclusive
                      value={(i18n.language || "ru").split("-")[0]}
                      onChange={(_event, value) => {
                        if (value) handleLanguageChange(value);
                      }}
                    >
                      <ToggleButton value="ru" sx={{ px: 1.5, py: 0.4, fontWeight: 700 }}>
                        RU
                      </ToggleButton>
                      <ToggleButton value="en" sx={{ px: 1.5, py: 0.4, fontWeight: 700 }}>
                        EN
                      </ToggleButton>
                      <ToggleButton value="uz" sx={{ px: 1.5, py: 0.4, fontWeight: 700 }}>
                        UZ
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                  <Divider sx={{ my: 0.5 }} />
                  <MenuItem
                    onClick={() => {
                      setUserMenuAnchor(null);
                      clearAuth();
                    }}
                    sx={{ color: "error.main" }}
                  >
                    <ListItemIcon sx={{ color: "error.main" }}>
                      <LogoutIcon fontSize="small" />
                    </ListItemIcon>
                    {t("logout")}
                  </MenuItem>
                </Menu>
              </>
            )}
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
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
              overflow: "hidden",
              ...(darkSidebar ? { background: darkSidebarBackground, color: "#fff" } : {})
            }
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
            {sidebarTopNode === null ? null : sidebarTopNode ?? <Toolbar />}
            <Box sx={{ flex: 1, minHeight: 0, display: "flex" }}>{drawerContent}</Box>
          </Box>
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: effectiveDrawerWidth,
              borderRight: darkSidebar ? "none" : "1px solid var(--border)",
              overflow: "hidden",
              ...(darkSidebar ? { background: darkSidebarBackground, color: "#fff" } : {})
            }
          }}
          open
        >
          <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
            {sidebarTopNode === null ? null : sidebarTopNode ?? <Toolbar />}
            <Box sx={{ flex: 1, minHeight: 0, display: "flex" }}>{drawerContent}</Box>
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
