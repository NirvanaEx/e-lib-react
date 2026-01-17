import React from "react";
import { Box, Button, Typography } from "@mui/material";

export function EmptyState({
  title,
  subtitle,
  action
}: {
  title: string;
  subtitle?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <Box
      sx={{
        py: 6,
        px: 3,
        textAlign: "center",
        color: "text.secondary",
        borderRadius: 4,
        border: "1px dashed var(--border)",
        background: "var(--surface-2)"
      }}
    >
      <Box
        sx={{
          mx: "auto",
          mb: 2,
          width: 64,
          height: 64,
          borderRadius: "20px",
          background: "linear-gradient(140deg, rgba(198,138,63,0.25), rgba(41,76,96,0.15))"
        }}
      />
      <Typography variant="h6" sx={{ mb: 1 }}>
        {title}
      </Typography>
      {subtitle && <Typography variant="body2">{subtitle}</Typography>}
      {action && (
        <Button variant="contained" sx={{ mt: 2 }} onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </Box>
  );
}
