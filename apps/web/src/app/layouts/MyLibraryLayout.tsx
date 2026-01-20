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
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{ minWidth: collapsed ? 0 : 40, display: "flex", justifyContent: "center" }}>
            <MenuBookOutlinedIcon fontSize="small" />
          </Box>
          {!collapsed && (
            <Typography variant="subtitle1" sx={{ letterSpacing: "0.12em", fontWeight: 700 }}>
              E-LIB
            </Typography>
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
    "&.Mui-selected": {
      backgroundColor: "rgba(29, 77, 79, 0.12)"
    },
    "&.Mui-selected:hover": {
      backgroundColor: "rgba(29, 77, 79, 0.16)"
    }
  };
  const menuIconSx = {
    width: 28,
    height: 28,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    backgroundColor: "rgba(29, 77, 79, 0.12)",
    color: "primary.main"
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
