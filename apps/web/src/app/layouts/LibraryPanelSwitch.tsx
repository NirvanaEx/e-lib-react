import React from "react";
import { Box, List, ListItemButton, ListItemIcon, ListItemText, Tooltip, Typography } from "@mui/material";
import LibraryBooksOutlinedIcon from "@mui/icons-material/LibraryBooksOutlined";
import FolderSharedOutlinedIcon from "@mui/icons-material/FolderSharedOutlined";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function LibraryPanelSwitch({ collapsed }: { collapsed: boolean }) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const isMyLibrary = location.pathname.startsWith("/users/my-library");

  const sharedItem = { label: t("sharedLibrary"), path: "/users", icon: <LibraryBooksOutlinedIcon fontSize="small" /> };
  const myItem = { label: t("myLibrary"), path: "/users/my-library/requests", icon: <FolderSharedOutlinedIcon fontSize="small" /> };
  const switchItem = isMyLibrary ? sharedItem : myItem;

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
      {collapsed ? (
        <Tooltip title={switchItem.label} placement="right">
          <ListItemButton
            onClick={() => navigate(switchItem.path)}
            sx={{ ...itemSx, justifyContent: "center" }}
          >
            <ListItemIcon sx={{ minWidth: 0 }}>
              <Box sx={menuIconSx}>{switchItem.icon}</Box>
            </ListItemIcon>
          </ListItemButton>
        </Tooltip>
      ) : (
        <ListItemButton onClick={() => navigate(switchItem.path)} sx={itemSx}>
          <ListItemIcon sx={{ minWidth: 40, mr: 1 }}>
            <Box sx={menuIconSx}>{switchItem.icon}</Box>
          </ListItemIcon>
          <ListItemText
            primary={
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {switchItem.label}
              </Typography>
            }
          />
        </ListItemButton>
      )}
    </List>
  );
}
