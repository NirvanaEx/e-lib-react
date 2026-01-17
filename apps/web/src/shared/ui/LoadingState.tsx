import React from "react";
import { Box, Skeleton } from "@mui/material";

export function LoadingState() {
  return (
    <Box>
      <Skeleton variant="rectangular" height={48} sx={{ mb: 1, borderRadius: 2 }} />
      <Skeleton variant="rectangular" height={48} sx={{ mb: 1, borderRadius: 2 }} />
      <Skeleton variant="rectangular" height={48} sx={{ mb: 1, borderRadius: 2 }} />
    </Box>
  );
}
