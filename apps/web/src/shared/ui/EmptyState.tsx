import React from "react";
import { Box, Typography } from "@mui/material";

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <Box sx={{ py: 6, textAlign: "center", color: "text.secondary" }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        {title}
      </Typography>
      {subtitle && <Typography variant="body2">{subtitle}</Typography>}
    </Box>
  );
}
