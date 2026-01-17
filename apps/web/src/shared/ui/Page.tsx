import React from "react";
import { Box, Typography } from "@mui/material";

export function Page({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h5">{title}</Typography>
        {action}
      </Box>
      {children}
    </Box>
  );
}
