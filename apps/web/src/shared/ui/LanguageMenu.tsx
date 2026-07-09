import React from "react";
import { Box, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from "@mui/material";

function RuFlag() {
  return (
    <svg width="22" height="16" viewBox="0 0 22 16">
      <rect width="22" height="16" fill="#fff" />
      <rect y="5.33" width="22" height="5.34" fill="#0039a6" />
      <rect y="10.67" width="22" height="5.33" fill="#d52b1e" />
    </svg>
  );
}

function GbFlag() {
  return (
    <svg width="22" height="16" viewBox="0 0 22 16">
      <rect width="22" height="16" fill="#012169" />
      <path d="M0,0 L22,16 M22,0 L0,16" stroke="#fff" strokeWidth="3.2" />
      <path d="M0,0 L22,16 M22,0 L0,16" stroke="#c8102e" strokeWidth="1.4" />
      <path d="M11,0 V16 M0,8 H22" stroke="#fff" strokeWidth="5" />
      <path d="M11,0 V16 M0,8 H22" stroke="#c8102e" strokeWidth="2.8" />
    </svg>
  );
}

function UzFlag() {
  return (
    <svg width="22" height="16" viewBox="0 0 22 16">
      <rect width="22" height="5" fill="#0099b5" />
      <rect y="5" width="22" height="0.7" fill="#ce1126" />
      <rect y="5.7" width="22" height="4.6" fill="#fff" />
      <rect y="10.3" width="22" height="0.7" fill="#ce1126" />
      <rect y="11" width="22" height="5" fill="#1eb53a" />
      <circle cx="4.4" cy="2.5" r="1.5" fill="#fff" />
      <circle cx="5" cy="2.3" r="1.35" fill="#0099b5" />
    </svg>
  );
}

const LANGUAGES: Array<{ code: string; label: string; flag: React.ReactNode }> = [
  { code: "ru", label: "Русский", flag: <RuFlag /> },
  { code: "en", label: "English", flag: <GbFlag /> },
  { code: "uz", label: "O'zbekcha", flag: <UzFlag /> }
];

const flagFrameSx = {
  width: 24,
  height: 18,
  borderRadius: "3px",
  overflow: "hidden",
  border: "1px solid var(--border)",
  display: "grid",
  placeItems: "center",
  backgroundColor: "var(--surface)",
  flexShrink: 0,
  "& svg": { display: "block" }
} as const;

export function LanguageMenu({
  value,
  tooltip,
  onChange
}: {
  value: string;
  tooltip?: string;
  onChange: (lang: string) => void;
}) {
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const normalized = (value || "ru").split("-")[0];
  const current = LANGUAGES.find((item) => item.code === normalized) || LANGUAGES[0];

  return (
    <>
      <Tooltip title={tooltip || ""}>
        <IconButton size="small" onClick={(event) => setAnchorEl(event.currentTarget)} sx={{ borderRadius: "8px", p: 0.75 }}>
          <Box sx={flagFrameSx}>{current.flag}</Box>
        </IconButton>
      </Tooltip>
      <Menu
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        slotProps={{ paper: { sx: { mt: 1, borderRadius: "8px", border: "1px solid var(--border)", minWidth: 160 } } }}
      >
        {LANGUAGES.map((item) => (
          <MenuItem
            key={item.code}
            selected={item.code === current.code}
            onClick={() => {
              setAnchorEl(null);
              if (item.code !== current.code) {
                onChange(item.code);
              }
            }}
            sx={{ py: 0.75 }}
          >
            <ListItemIcon sx={{ minWidth: 34 }}>
              <Box sx={flagFrameSx}>{item.flag}</Box>
            </ListItemIcon>
            <ListItemText primaryTypographyProps={{ variant: "body2", fontWeight: item.code === current.code ? 700 : 500 }}>
              {item.label}
            </ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
