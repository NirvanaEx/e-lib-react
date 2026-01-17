import React from "react";
import { Box, Paper, Stack } from "@mui/material";

export function FiltersBar({
  children,
  actions
}: {
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <Paper
      sx={{
        p: 2,
        mb: 2,
        borderRadius: 3,
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow)",
        background: "var(--surface)"
      }}
    >
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
            {children}
          </Stack>
        </Box>
        {actions && <Box>{actions}</Box>}
      </Stack>
    </Paper>
  );
}
