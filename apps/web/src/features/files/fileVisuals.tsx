import React from "react";
import { Box, Typography } from "@mui/material";

export const accessChipSx = (accessType: string) =>
  accessType === "public"
    ? { backgroundColor: "rgba(22, 163, 74, 0.12)", color: "#15803d" }
    : accessType === "department_closed"
    ? { backgroundColor: "rgba(2, 132, 199, 0.12)", color: "#0369a1" }
    : { backgroundColor: "rgba(217, 119, 6, 0.14)", color: "#b45309" };

export const fileTypeInfo = (ext?: string | null) => {
  const value = (ext || "").toLowerCase();
  if (value === "pdf") return { label: "PDF", color: "#dc2626" };
  if (["doc", "docx", "rtf", "odt"].includes(value)) return { label: value.toUpperCase(), color: "#2563eb" };
  if (["xls", "xlsx", "csv", "ods"].includes(value)) return { label: value.toUpperCase(), color: "#16a34a" };
  if (["ppt", "pptx"].includes(value)) return { label: value.toUpperCase(), color: "#ea580c" };
  if (["zip", "rar", "7z"].includes(value)) return { label: value.toUpperCase(), color: "#7c3aed" };
  if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(value)) return { label: value.toUpperCase(), color: "#0ea5e9" };
  return { label: value ? value.toUpperCase().slice(0, 4) : "DOC", color: "#64748b" };
};

export const extOf = (name?: string | null) => {
  const value = String(name || "");
  const idx = value.lastIndexOf(".");
  return idx > 0 ? value.slice(idx + 1) : null;
};

export function FileTypeBadge({ ext, small }: { ext?: string | null; small?: boolean }) {
  const info = fileTypeInfo(ext);
  const width = small ? 30 : 46;
  const height = small ? 36 : 54;
  return (
    <Box
      sx={{
        width,
        height,
        borderRadius: small ? "7px" : "10px",
        backgroundColor: info.color,
        position: "relative",
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
        overflow: "hidden",
        boxShadow: `0 6px 14px ${info.color}33`
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: 0,
          right: 0,
          width: small ? 10 : 15,
          height: small ? 10 : 15,
          backgroundColor: "rgba(255,255,255,0.4)",
          borderBottomLeftRadius: small ? 6 : 8
        }}
      />
      <Typography sx={{ color: "#fff", fontWeight: 800, fontSize: small ? 8.5 : 11, letterSpacing: "0.03em", lineHeight: 1 }}>
        {info.label}
      </Typography>
    </Box>
  );
}
