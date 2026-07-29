import React from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";

/**
 * The panel every dashboard block sits in. Pages used to hand-roll
 * `<Paper sx={{ p: 2, borderRadius: "10px", border: "1px solid var(--border)" }}>`
 * with slightly different padding and heading markup each time; this keeps the
 * surface, radius, border and heading rhythm identical across the admin area.
 */
export function SectionCard({
  title,
  subtitle,
  action,
  icon,
  dense = false,
  disablePadding = false,
  children,
  sx
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  dense?: boolean;
  /** For tables that bring their own padding. */
  disablePadding?: boolean;
  children: React.ReactNode;
  sx?: SxProps<Theme>;
}) {
  const hasHeader = Boolean(title || subtitle || action);
  return (
    <Paper
      sx={{
        p: disablePadding ? 0 : dense ? 2 : 2.5,
        mb: 2,
        borderRadius: "10px",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow)",
        background: "var(--surface)",
        ...sx
      }}
    >
      {hasHeader && (
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems={{ sm: "center" }}
          justifyContent="space-between"
          sx={{ mb: 2, px: disablePadding ? 2.5 : 0, pt: disablePadding ? 2.5 : 0 }}
        >
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
            {icon && <Box sx={{ display: "flex", color: "text.secondary" }}>{icon}</Box>}
            <Box sx={{ minWidth: 0 }}>
              {title && (
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {title}
                </Typography>
              )}
              {subtitle && (
                <Typography variant="caption" color="text.secondary">
                  {subtitle}
                </Typography>
              )}
            </Box>
          </Stack>
          {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
        </Stack>
      )}
      {children}
    </Paper>
  );
}
