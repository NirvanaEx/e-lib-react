import React from "react";
import { Paper, Typography, Box } from "@mui/material";

export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Paper sx={{ p: 2.5, borderRadius: 3 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Box sx={{ mt: 1 }}>
        <Typography variant="h5">{value}</Typography>
      </Box>
    </Paper>
  );
}
