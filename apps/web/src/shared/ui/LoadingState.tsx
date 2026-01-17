import React from "react";
import { Box, Skeleton } from "@mui/material";

export function LoadingState({ rows = 4 }: { rows?: number }) {
  return (
    <Box>
      <Skeleton variant="rounded" height={44} sx={{ mb: 1.5, borderRadius: 2 }} />
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} variant="rounded" height={52} sx={{ mb: 1, borderRadius: 2 }} />
      ))}
    </Box>
  );
}
