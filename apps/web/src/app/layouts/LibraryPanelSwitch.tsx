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
