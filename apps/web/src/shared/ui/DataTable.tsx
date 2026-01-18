import React from "react";
import type { SxProps, Theme } from "@mui/material/styles";
import {
  Box,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

export type Column<T> = {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
  align?: "left" | "center" | "right";
  width?: number | string;
  minWidth?: number | string;
  headerSx?: SxProps<Theme>;
  cellSx?: SxProps<Theme>;
  sortable?: boolean;
  sortKey?: string;
  sortValue?: (row: T) => string | number | null;
};

export function DataTable<T extends { id: number | string }>({
  rows,
  columns,
  rowKey,
  onRowClick,
  sort,
  onSortChange,
  reverseSortIcons = false,
  sortIconVariant = "chevron"
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey?: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  sort?: { key: string | null; direction: "asc" | "desc" | null };
  onSortChange?: (key: string, direction: "asc" | "desc" | null) => void;
  reverseSortIcons?: boolean;
  sortIconVariant?: "arrow" | "chevron";
}) {
  const [internalSort, setInternalSort] = React.useState<{ key: string | null; direction: "asc" | "desc" | null }>({
    key: null,
    direction: null
  });
  const isControlledSort = Boolean(onSortChange);
  const activeSort = sort ?? internalSort;
  const updateSort = onSortChange ?? ((key: string, direction: "asc" | "desc" | null) => setInternalSort({ key: direction ? key : null, direction }));

  const isChevronIcons = sortIconVariant === "chevron";
  const BaseAscIcon = isChevronIcons ? KeyboardArrowUpIcon : ArrowUpwardIcon;
  const BaseDescIcon = isChevronIcons ? KeyboardArrowDownIcon : ArrowDownwardIcon;
  const AscIcon = reverseSortIcons ? BaseDescIcon : BaseAscIcon;
  const DescIcon = reverseSortIcons ? BaseAscIcon : BaseDescIcon;
  const neutralIcon = isChevronIcons ? (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 0.45 }}>
      <KeyboardArrowUpIcon fontSize="inherit" />
      <KeyboardArrowDownIcon fontSize="inherit" sx={{ mt: -1.1 }} />
    </Box>
  ) : (
    <UnfoldMoreIcon fontSize="inherit" />
  );

  const rowsToRender = React.useMemo(() => {
    if (isControlledSort || !activeSort.key || !activeSort.direction) return rows;
    const column = columns.find((col) => (col.sortKey || String(col.key)) === activeSort.key);
    if (!column) return rows;
    const getValue =
      column.sortValue ??
      ((row: T) => {
        const key = column.sortKey || column.key;
        return (row as any)[key];
      });
    const normalize = (value: unknown) => {
      if (value === null || value === undefined) return null;
      if (typeof value === "boolean") return value ? 1 : 0;
      if (typeof value === "number") return value;
      return String(value).toLowerCase();
    };
    const compare = (a: T, b: T) => {
      const aVal = normalize(getValue(a));
      const bVal = normalize(getValue(b));
      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      if (typeof aVal === "number" && typeof bVal === "number") {
        return aVal - bVal;
      }
      return String(aVal).localeCompare(String(bVal), undefined, { numeric: true, sensitivity: "base" });
    };
    const sorted = [...rows].sort(compare);
    return activeSort.direction === "asc" ? sorted : sorted.reverse();
  }, [rows, columns, activeSort, isControlledSort]);

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
            {columns.map((col) => {
              const key = col.sortKey || String(col.key);
              const sortable = col.sortable ?? Boolean(col.sortKey || col.sortValue || !isControlledSort);
              const isActive = activeSort.key === key;
              const direction = isActive ? activeSort.direction : null;
              const handleSort = () => {
                if (!sortable) return;
                const nextDirection = !isActive || direction === null ? "asc" : direction === "asc" ? "desc" : null;
                updateSort(key, nextDirection);
              };
              const sortIcon = !sortable ? null : direction === "asc" ? (
                <AscIcon fontSize="inherit" />
              ) : direction === "desc" ? (
                <DescIcon fontSize="inherit" />
              ) : (
                neutralIcon
              );
              return (
                <TableCell
                  key={String(col.key)}
                  align={col.align}
                  onClick={handleSort}
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
                    cursor: sortable ? "pointer" : "default",
                    ...col.headerSx
                  }}
                >
                  <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.3 }}>
                    <span>{col.label}</span>
                    {sortable && (
                      <IconButton size="small" sx={{ p: 0, fontSize: 14 }}>
                        {sortIcon}
                      </IconButton>
                    )}
                  </Box>
                </TableCell>
              );
            })}
          </TableRow>
        </TableHead>
        <TableBody>
          {rowsToRender.map((row) => (
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
