import React from "react";
import { Box, MenuItem, Pagination, Paper, Select, Stack, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

export function PaginationBar({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (value: number) => void;
  onPageSizeChange: (value: number) => void;
}) {
  const { t } = useTranslation();
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <Paper
      sx={{
        mt: 2,
        p: 2,
        borderRadius: 3,
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow)",
        background: "var(--surface)"
      }}
    >
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
        <Typography variant="body2" color="text.secondary">
          {t("itemsCount", { count: total })}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="body2" color="text.secondary">
            {t("rows")}
          </Typography>
          <Select
            size="small"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          >
            {[10, 20, 50, 100].map((size) => (
              <MenuItem key={size} value={size}>
                {size}
              </MenuItem>
            ))}
          </Select>
          <Pagination
            color="primary"
            page={page}
            count={pageCount}
            onChange={(_, value) => onPageChange(value)}
          />
        </Stack>
      </Stack>
    </Paper>
  );
}
