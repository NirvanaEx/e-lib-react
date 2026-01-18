import React from "react";
import type { SxProps, Theme } from "@mui/material/styles";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from "@mui/material";

export type Column<T> = {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
  align?: "left" | "center" | "right";
  width?: number | string;
  minWidth?: number | string;
  headerSx?: SxProps<Theme>;
  cellSx?: SxProps<Theme>;
};

export function DataTable<T extends { id: number | string }>({
  rows,
  columns,
  rowKey,
  onRowClick
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey?: (row: T) => string | number;
  onRowClick?: (row: T) => void;
}) {
  return (
    <TableContainer
      component={Paper}
      sx={{
        borderRadius: 3,
        boxShadow: "var(--shadow)",
        border: "1px solid var(--border)"
      }}
    >
      <Table size="small" stickyHeader sx={{ tableLayout: "auto" }}>
        <TableHead>
          <TableRow>
            {columns.map((col) => (
              <TableCell
                key={String(col.key)}
                align={col.align}
                sx={{
                  fontWeight: 700,
                  color: "text.secondary",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  fontSize: "0.7rem",
                  borderBottomColor: "var(--border)",
                  whiteSpace: "nowrap",
                  verticalAlign: "middle",
                  width: col.width,
                  minWidth: col.minWidth,
                  ...col.headerSx
                }}
              >
                {col.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={rowKey ? rowKey(row) : row.id}
              hover
              sx={{
                cursor: onRowClick ? "pointer" : "default",
                "&:hover": {
                  backgroundColor: "rgba(41, 76, 96, 0.06)"
                }
              }}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((col) => (
                <TableCell
                  key={String(col.key)}
                  align={col.align}
                  sx={{
                    borderBottomColor: "var(--border)",
                    color: "text.primary",
                    py: 1.5,
                    verticalAlign: "middle",
                    ...col.cellSx
                  }}
                >
                  <Box sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {col.render ? col.render(row) : (row as any)[col.key]}
                  </Box>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
