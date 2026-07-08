import React from "react";
import { Box, ButtonBase, List, ListItemButton, ListItemIcon, ListItemText, Stack, Tooltip, Typography } from "@mui/material";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import PendingActionsOutlinedIcon from "@mui/icons-material/PendingActionsOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import StarBorderOutlinedIcon from "@mui/icons-material/StarBorderOutlined";
import ApartmentOutlinedIcon from "@mui/icons-material/ApartmentOutlined";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BaseLayout } from "./BaseLayout";
import { SettingsDialog } from "../../features/settings/SettingsDialog";
import { LibraryPanelSwitch } from "./LibraryPanelSwitch";
import { useAuth } from "../../shared/hooks/useAuth";

export default function MyLibraryLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const items: { label: string; path: string; icon?: React.ReactNode }[] = [];
  const sidebarTop = ({ collapsed }: { collapsed: boolean }) => (
    <Box sx={{ width: "100%" }}>
      <ButtonBase
        onClick={() => window.location.reload()}
        sx={{
          width: "100%",
          borderRadius: 2,
          px: 0.5,
          py: 0.5,
          justifyContent: collapsed ? "center" : "flex-start"
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.25}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              border: "1px solid rgba(255,255,255,0.3)",
              backgroundColor: "rgba(255,255,255,0.08)",
              flexShrink: 0
            }}
          >
            <MenuBookOutlinedIcon fontSize="small" />
          </Box>
          {!collapsed && (
            <Box sx={{ textAlign: "left" }}>
              <Typography variant="subtitle2" sx={{ letterSpacing: "0.1em", fontWeight: 800, lineHeight: 1.2, textTransform: "uppercase" }}>
                {t("appName")}
              </Typography>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.65)" }}>
                {t("heroTagline")}
              </Typography>
            </Box>
          )}
        </Stack>
      </ButtonBase>
    </Box>
  );

  const sidebarContent = ({ collapsed }: { collapsed: boolean }) => <MyLibrarySidebarMenu collapsed={collapsed} />;
  const sidebarFooter = ({ collapsed }: { collapsed: boolean }) => <LibraryPanelSwitch collapsed={collapsed} />;

  return (
    <>
      <BaseLayout
        title={t("myLibrary")}
        items={items}
        sidebarContent={sidebarContent}
        sidebarFooter={sidebarFooter}
        settingsAction={() => setSettingsOpen(true)}
        headerTitle={null}
        sidebarHeader={null}
        sidebarTop={sidebarTop}
        sidebarCollapsible
        sidebarPaddingTop={0.5}
        sidebarVariant="dark"
      >
        {children}
      </BaseLayout>
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}

function MyLibrarySidebarMenu({ collapsed }: { collapsed: boolean }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const canSubmitFiles = Boolean(user?.canSubmitFiles);
  const hasDepartment = Boolean(user?.departmentId);
  const items = [
    { label: t("favorites"), path: "/users/my-library/favorites", icon: <StarBorderOutlinedIcon fontSize="small" /> },
    ...(hasDepartment
      ? [{ label: t("departmentFiles"), path: "/users/my-library/department", icon: <ApartmentOutlinedIcon fontSize="small" /> }]
      : []),
    ...(canSubmitFiles
      ? [
          { label: t("requests"), path: "/users/my-library/requests", icon: <PendingActionsOutlinedIcon fontSize="small" /> },
          { label: t("myUploadedFiles"), path: "/users/my-library/files", icon: <DescriptionOutlinedIcon fontSize="small" /> }
        ]
      : [])
  ];
  const itemSx = {
    borderRadius: 2.5,
    mb: 0.6,
    py: 0.9,
    px: 1,
    color: "rgba(255,255,255,0.85)",
    "&:hover": {
      backgroundColor: "rgba(255,255,255,0.08)"
    },
    "&.Mui-selected": {
      backgroundColor: "rgba(37, 99, 235, 0.9)",
      color: "#fff"
    },
    "&.Mui-selected:hover": {
      backgroundColor: "#2563eb"
    }
  };
  const menuIconSx = {
    width: 28,
    height: 28,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    color: "#fff"
  };

  return (
    <List disablePadding>
      {items.map((item) => {
        const active = location.pathname.startsWith(item.path);
        const button = (
          <ListItemButton
            key={item.path}
            selected={active}
            onClick={() => navigate(item.path)}
            sx={{ ...itemSx, justifyContent: collapsed ? "center" : "flex-start" }}
          >
            <ListItemIcon sx={{ minWidth: collapsed ? 0 : 40, mr: collapsed ? 0 : 1 }}>
              <Box sx={menuIconSx}>{item.icon}</Box>
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
  );
}
