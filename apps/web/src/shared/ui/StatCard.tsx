import React from "react";
import { Paper, Typography, Box } from "@mui/material";

export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Paper
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow)",
        background: "linear-gradient(140deg, rgba(255,255,255,0.96), rgba(243,241,236,0.7))"
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label}
      </Typography>
      <Box sx={{ mt: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {value}
        </Typography>
      </Box>
    </Paper>
  );
}
