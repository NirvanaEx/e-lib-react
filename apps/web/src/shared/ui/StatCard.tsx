import React from "react";
import { Box, Paper, Stack, Tooltip, Typography } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";

export type StatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ReactNode;
  /** Percentage change vs the previous period; null/undefined hides the badge. */
  delta?: number | null;
  deltaTooltip?: string;
};

function DeltaBadge({ delta, tooltip }: { delta: number; tooltip?: string }) {
  const positive = delta > 0;
  const neutral = delta === 0;
  const color = neutral ? "text.secondary" : positive ? "success.main" : "error.main";
  const Icon = neutral ? TrendingFlatIcon : positive ? TrendingUpIcon : TrendingDownIcon;
  const badge = (
    <Stack direction="row" spacing={0.25} alignItems="center" sx={{ color }}>
      <Icon sx={{ fontSize: 16 }} />
      <Typography variant="caption" sx={{ fontWeight: 700 }}>
        {neutral ? "0%" : `${positive ? "+" : ""}${Math.round(delta)}%`}
      </Typography>
    </Stack>
  );
  return tooltip ? <Tooltip title={tooltip}>{badge}</Tooltip> : badge;
}

export function StatCard({ label, value, hint, icon, delta, deltaTooltip }: StatCardProps) {
  return (
    <Paper
      sx={{
        p: 2.5,
        height: "100%",
        borderRadius: "10px",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow)",
        // Theme-driven surface: the previous hard-coded white gradient stayed
        // white in dark mode.
        background: "var(--surface)"
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        {icon && (
          <Box
            sx={{
              width: 38,
              height: 38,
              flexShrink: 0,
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "primary.main",
              backgroundColor: "rgba(37, 99, 235, 0.12)"
            }}
          >
            {icon}
          </Box>
        )}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ textTransform: "uppercase", letterSpacing: "0.08em", display: "block" }}
          >
            {label}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="baseline" sx={{ mt: 0.75 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
              {value}
            </Typography>
            {delta !== undefined && delta !== null && <DeltaBadge delta={delta} tooltip={deltaTooltip} />}
          </Stack>
          {hint && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
              {hint}
            </Typography>
          )}
        </Box>
      </Stack>
    </Paper>
  );
}
