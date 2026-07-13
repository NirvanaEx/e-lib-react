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
  Stack,
  Toolbar,
  Tooltip,
  Typography
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import { agreementSignature, isAgreementAnswered, markAgreementAnswered } from "../../shared/utils/agreementSession";
import SettingsIcon from "@mui/icons-material/Settings";
import BusinessIcon from "@mui/icons-material/Business";
import HandshakeOutlinedIcon from "@mui/icons-material/HandshakeOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import GridViewOutlinedIcon from "@mui/icons-material/GridViewOutlined";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../shared/hooks/useAuth";
import { LANGUAGES, flagFrameSx } from "../../shared/ui/LanguageMenu";
import { TestVersionRibbon, TEST_RIBBON_HEIGHT } from "../../shared/ui/TestVersionRibbon";
import i18n from "../i18n";
import { changeLanguage } from "../../features/settings/settings.api";
import { useToast } from "../../shared/ui/ToastProvider";
import { useTranslation } from "react-i18next";
import { getDashboardRoute, getDefaultRoute, hasAccess } from "../../shared/utils/access";
import { acceptUserContentPage, fetchUserContentPage } from "../../features/content-pages/content-pages.api";
import { fetchAppSettings } from "../../features/settings/app-settings.api";

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
  headerContent,
  footer,
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
  headerContent?: React.ReactNode;
  footer?: React.ReactNode;
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
  // Distinguishes the mandatory login prompt from opening the agreement to re-read it.
  const [agreementRequired, setAgreementRequired] = React.useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = React.useState<HTMLElement | null>(null);
  const queryClient = useQueryClient();

  const agreementKey = "user_agreement";

  const { data: agreementData, isLoading: agreementLoading } = useQuery({
    queryKey: ["content-page-user", agreementKey, user?.id, i18n.language],
    queryFn: () => fetchUserContentPage(agreementKey),
    enabled: Boolean(user?.id)
  });

  const { data: appSettings } = useQuery({
    queryKey: ["app-settings"],
    queryFn: fetchAppSettings,
    enabled: Boolean(user?.id)
  });
  const ribbonEnabled = Boolean(appSettings?.testRibbonEnabled);

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

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);
  const toggleCollapsed = () => {
    setIsCollapsed((prev) => !prev);
  };

  const agreementKeySignature = user?.id ? agreementSignature(user.id, agreementData?.updatedAt) : null;

  React.useEffect(() => {
    if (!agreementKeySignature) return;
    if (agreementData?.shouldShow && !isAgreementAnswered(agreementKeySignature)) {
      setAgreementRequired(true);
      setAgreementOpen(true);
    }
  }, [agreementKeySignature, agreementData?.shouldShow]);

  const closeAgreement = () => {
    setAgreementOpen(false);
    setAgreementRequired(false);
  };

  const handleAgreementAccept = () => {
    closeAgreement();
    if (agreementKeySignature) {
      markAgreementAnswered(agreementKeySignature);
    }
    if (user?.id) {
      acceptAgreementMutation.mutate();
    }
  };

  const handleAgreementDecline = () => {
    closeAgreement();
    clearAuth();
  };

  // A required agreement must be answered: swallow backdrop clicks and Escape.
  const handleAgreementClose = () => {
    if (!agreementRequired) closeAgreement();
  };

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
  const roleLabel = user?.role || null;
  // Profile line shows the department; only falls back to the role when the
  // user has no department assigned.
  const profileSubtitle = user?.department || roleLabel;
  const profileSubtitleIsRole = !user?.department && Boolean(roleLabel);
  const avatarInitials = React.useMemo(() => {
    const surnameInitial = user?.surname?.trim().charAt(0);
    const nameInitial = user?.name?.trim().charAt(0);
    const combined = [surnameInitial, nameInitial].filter(Boolean).join("");
    if (combined) return combined.toUpperCase();
    const fromFull = user?.fullName?.trim().charAt(0);
    if (fromFull) return fromFull.toUpperCase();
    const fromLogin = user?.login?.trim().charAt(0);
    return fromLogin ? fromLogin.toUpperCase() : "?";
  }, [user]);

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
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        color: darkSidebar ? "#fff" : "inherit",
        background: darkSidebar ? "transparent" : "var(--surface)"
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
          backgroundColor: "var(--appbar)",
          borderBottom: "1px solid var(--border)",
          width: { md: `calc(100% - ${effectiveDrawerWidth}px)` },
          ml: { md: `${effectiveDrawerWidth}px` }
        }}
      >
        <Toolbar sx={{ display: "flex", justifyContent: "space-between", gap: { xs: 1, md: 2 }, px: { xs: 1.5, md: 3 } }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
            <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: { xs: 0, sm: 1 }, display: { md: "none" } }}>
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
          {headerContent && (
            <Box sx={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "flex-start" }}>
              {headerContent}
            </Box>
          )}
          <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.5, md: 1 }, flexShrink: 0 }}>
            {user && (
              <>
                <ButtonBase
                  onClick={(event) => setUserMenuAnchor(event.currentTarget)}
                  aria-label={t("account")}
                  sx={{
                    borderRadius: "999px",
                    pl: 0.5,
                    pr: { xs: 0.5, sm: 1.25 },
                    py: 0.5,
                    gap: 1,
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--surface)",
                    transition: "border-color 0.2s ease, background-color 0.2s ease",
                    "&:hover": { borderColor: "primary.main" }
                  }}
                >
                  <Avatar sx={{ width: 34, height: 34, fontSize: 14, fontWeight: 700, bgcolor: "primary.main", color: "#fff" }}>
                    {avatarInitials}
                  </Avatar>
                  <Box
                    sx={{
                      display: { xs: "none", sm: "flex" },
                      flexDirection: "column",
                      alignItems: "flex-start",
                      minWidth: 0,
                      maxWidth: 160
                    }}
                  >
                    {userDisplayName && (
                      <Typography variant="body2" noWrap sx={{ fontWeight: 700, lineHeight: 1.25, maxWidth: "100%" }}>
                        {userDisplayName}
                      </Typography>
                    )}
                    {profileSubtitle && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        noWrap
                        sx={{ lineHeight: 1.2, textTransform: profileSubtitleIsRole ? "capitalize" : "none", maxWidth: "100%" }}
                      >
                        {profileSubtitle}
                      </Typography>
                    )}
                  </Box>
                  <KeyboardArrowDownIcon
                    sx={{
                      fontSize: 20,
                      color: "text.secondary",
                      display: { xs: "none", sm: "block" },
                      transition: "transform 0.2s ease",
                      transform: userMenuAnchor ? "rotate(180deg)" : "none"
                    }}
                  />
                </ButtonBase>
                <Menu
                  open={Boolean(userMenuAnchor)}
                  anchorEl={userMenuAnchor}
                  onClose={() => setUserMenuAnchor(null)}
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  transformOrigin={{ vertical: "top", horizontal: "right" }}
                  slotProps={{
                    paper: { sx: { mt: 1, borderRadius: "12px", border: "1px solid var(--border)", minWidth: 250, overflow: "hidden" } }
                  }}
                >
                  <Stack direction="row" spacing={1.25} alignItems="center" sx={{ px: 2, pt: 1.75, pb: 1.5 }}>
                    <Avatar sx={{ width: 44, height: 44, fontSize: 16, fontWeight: 700, bgcolor: "primary.main", color: "#fff" }}>
                      {avatarInitials}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      {userDisplayName && (
                        <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>
                          {userDisplayName}
                        </Typography>
                      )}
                      {user?.department ? (
                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.25, color: "text.secondary" }}>
                          <BusinessIcon sx={{ fontSize: 14 }} />
                          <Typography variant="caption" noWrap>
                            {user.department}
                          </Typography>
                        </Stack>
                      ) : roleLabel ? (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          noWrap
                          sx={{ display: "block", textTransform: "capitalize" }}
                        >
                          {roleLabel}
                        </Typography>
                      ) : null}
                    </Box>
                  </Stack>
                  <Divider />
                  {switchLink && (
                    <MenuItem
                      onClick={() => {
                        setUserMenuAnchor(null);
                        navigate(switchLink.path);
                      }}
                    >
                      <ListItemIcon>
                        <GridViewOutlinedIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primaryTypographyProps={{ variant: "body2", fontWeight: 600 }}>
                        {switchLink.label}
                      </ListItemText>
                    </MenuItem>
                  )}
                  {(settingsPath || settingsAction) && (
                    <MenuItem
                      onClick={() => {
                        setUserMenuAnchor(null);
                        if (settingsAction) settingsAction();
                        else if (settingsPath) navigate(settingsPath);
                      }}
                    >
                      <ListItemIcon>
                        <SettingsIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primaryTypographyProps={{ variant: "body2", fontWeight: 600 }}>
                        {t("settings")}
                      </ListItemText>
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
                        <HandshakeOutlinedIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primaryTypographyProps={{ variant: "body2", fontWeight: 600 }}>
                        {t("userAgreement")}
                      </ListItemText>
                    </MenuItem>
                  )}
                  <Divider />
                  <Typography
                    variant="overline"
                    color="text.secondary"
                    sx={{ px: 2, pt: 0.75, display: "block", letterSpacing: "0.14em", lineHeight: 2 }}
                  >
                    {t("language")}
                  </Typography>
                  {LANGUAGES.map((item) => {
                    const currentLang = (i18n.language || "ru").split("-")[0];
                    return (
                      <MenuItem
                        key={item.code}
                        selected={item.code === currentLang}
                        onClick={() => {
                          setUserMenuAnchor(null);
                          if (item.code !== currentLang) {
                            handleLanguageChange(item.code);
                          }
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 34 }}>
                          <Box sx={flagFrameSx}>{item.flag}</Box>
                        </ListItemIcon>
                        <ListItemText
                          primaryTypographyProps={{ variant: "body2", fontWeight: item.code === currentLang ? 700 : 500 }}
                        >
                          {item.label}
                        </ListItemText>
                      </MenuItem>
                    );
                  })}
                  <Divider />
                  <MenuItem
                    onClick={() => {
                      setUserMenuAnchor(null);
                      clearAuth();
                    }}
                  >
                    <ListItemIcon>
                      <LogoutIcon fontSize="small" sx={{ color: "error.main" }} />
                    </ListItemIcon>
                    <ListItemText primaryTypographyProps={{ variant: "body2", fontWeight: 600, color: "error.main" }}>
                      {t("logout")}
                    </ListItemText>
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
            <Box sx={{ flex: 1, minHeight: 0, minWidth: 0, display: "flex" }}>{drawerContent}</Box>
          </Box>
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: effectiveDrawerWidth,
              height: ribbonEnabled ? `calc(100% - ${TEST_RIBBON_HEIGHT}px)` : "100%",
              borderRight: darkSidebar ? "none" : "1px solid var(--border)",
              overflow: "hidden",
              ...(darkSidebar ? { background: darkSidebarBackground, color: "#fff" } : {})
            }
          }}
          open
        >
          <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
            {sidebarTopNode === null ? null : sidebarTopNode ?? <Toolbar />}
            <Box sx={{ flex: 1, minHeight: 0, minWidth: 0, display: "flex" }}>{drawerContent}</Box>
          </Box>
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{ flexGrow: 1, display: "flex", flexDirection: "column", minHeight: "100vh", minWidth: 0 }}
      >
        <Toolbar />
        <Box sx={{ flex: "1 0 auto", display: "flex", flexDirection: "column", p: { xs: 2, md: 4 } }}>{children}</Box>
        {footer}
        {ribbonEnabled && <Box sx={{ flexShrink: 0, height: `${TEST_RIBBON_HEIGHT}px` }} />}
      </Box>
      <Dialog
        open={agreementOpen}
        onClose={handleAgreementClose}
        disableEscapeKeyDown={agreementRequired}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <WarningAmberOutlinedIcon sx={{ color: "warning.main" }} />
            <span>{agreementData?.title || t("userAgreement")}</span>
          </Stack>
        </DialogTitle>
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
          {agreementRequired && !agreementLoading && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
              {t("agreementDeclineHint")}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          {agreementRequired ? (
            <Button onClick={handleAgreementDecline} color="error">
              {t("agreementDecline")}
            </Button>
          ) : (
            <Button onClick={closeAgreement}>{t("close")}</Button>
          )}
          <Button onClick={handleAgreementAccept} variant="contained">
            {t("agreementAccept")}
          </Button>
        </DialogActions>
      </Dialog>
      {ribbonEnabled && <TestVersionRibbon />}
    </Box>
  );
}
