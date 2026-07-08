import React from "react";
import { Box, IconButton, InputAdornment, TextField, Tooltip, Typography } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CheckIcon from "@mui/icons-material/Check";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import { useTranslation } from "react-i18next";
import { ICON_COLORS, ICON_LIBRARY, LibraryIcon } from "./iconLibrary";

export function IconColorPicker({
  icon,
  color,
  onIconChange,
  onColorChange
}: {
  icon: string | null;
  color: string | null;
  onIconChange: (icon: string | null) => void;
  onColorChange: (color: string | null) => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = React.useState("");
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ICON_LIBRARY;
    return ICON_LIBRARY.filter((item) => item.name.includes(q));
  }, [query]);
  const activeColor = color || "#2563eb";

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {t("icon")}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5, flexWrap: "wrap" }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: "10px",
            display: "grid",
            placeItems: "center",
            backgroundColor: `${activeColor}1a`,
            color: activeColor,
            border: "1px solid var(--border)",
            flexShrink: 0
          }}
        >
          <LibraryIcon name={icon} />
        </Box>
        <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
          {ICON_COLORS.map((item) => (
            <Box
              key={item}
              onClick={() => onColorChange(item)}
              sx={{
                width: 26,
                height: 26,
                borderRadius: "8px",
                backgroundColor: item,
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
                color: "#fff",
                border: color === item ? "2px solid #16233d" : "2px solid transparent"
              }}
            >
              {color === item && <CheckIcon sx={{ fontSize: 16 }} />}
            </Box>
          ))}
        </Box>
      </Box>
      <TextField
        size="small"
        fullWidth
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t("searchIcons")}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          )
        }}
        sx={{ mb: 1 }}
      />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(40px, 1fr))",
          gap: 0.5,
          maxHeight: 216,
          overflow: "auto",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          p: 1
        }}
      >
        <Tooltip title={t("noIcon")}>
          <IconButton
            onClick={() => onIconChange(null)}
            sx={{
              borderRadius: "8px",
              color: "text.disabled",
              border: !icon ? `2px solid ${activeColor}` : "2px solid transparent"
            }}
          >
            <BlockOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {filtered.map(({ name, Icon }) => (
          <Tooltip key={name} title={name}>
            <IconButton
              onClick={() => onIconChange(name)}
              sx={{
                borderRadius: "8px",
                color: icon === name ? activeColor : "text.secondary",
                backgroundColor: icon === name ? `${activeColor}1a` : "transparent",
                border: icon === name ? `2px solid ${activeColor}` : "2px solid transparent"
              }}
            >
              <Icon fontSize="small" />
            </IconButton>
          </Tooltip>
        ))}
      </Box>
    </Box>
  );
}
