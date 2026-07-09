import React from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { fetchMenu } from "./files.api";
import { FilterOption, buildTreeOptions, parseIds, serializeIds } from "./filterUtils";

type FilterParamKey = "sectionIds" | "categoryIds" | "departmentIds";

function FilterChipGroup({
  label,
  options,
  selected,
  onChange
}: {
  label: string;
  options: FilterOption[];
  selected: Set<number>;
  onChange: (next: Set<number>) => void;
}) {
  const { t } = useTranslation();
  const allActive = selected.size === 0;

  const toggle = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    if (next.size === options.length) {
      onChange(new Set());
      return;
    }
    onChange(next);
  };

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
        {label}
      </Typography>
      <Stack direction="row" spacing={0} sx={{ flexWrap: "wrap", gap: 0.75 }}>
        <Chip
          size="small"
          label={t("selectAll")}
          onClick={() => onChange(new Set())}
          color={allActive ? "primary" : "default"}
          variant={allActive ? "filled" : "outlined"}
          sx={{ fontWeight: 600 }}
        />
        {options.map((option) => {
          const active = selected.has(option.id);
          return (
            <Chip
              key={option.id}
              size="small"
              label={option.path}
              title={option.path}
              onClick={() => toggle(option.id)}
              color={active ? "primary" : "default"}
              variant={active ? "filled" : "outlined"}
              sx={{ fontWeight: 500, maxWidth: 320 }}
            />
          );
        })}
      </Stack>
    </Box>
  );
}

export function AdvancedSearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const muiTheme = useTheme();
  const fullScreen = useMediaQuery(muiTheme.breakpoints.down("sm"));
  const { data: menuData } = useQuery({ queryKey: ["user-menu-all"], queryFn: () => fetchMenu(), enabled: open });

  const sections = React.useMemo(() => buildTreeOptions((menuData?.sections || []).map((s: any) => ({ ...s, parentId: null }))), [menuData]);
  const categories = React.useMemo(() => buildTreeOptions(menuData?.categories || []), [menuData]);
  const departments = React.useMemo(() => buildTreeOptions(menuData?.departments || []), [menuData]);

  const [query, setQuery] = React.useState("");
  // Пустой Set = «выбраны все» (фильтр не активен).
  const [selection, setSelection] = React.useState<Record<FilterParamKey, Set<number>>>({
    sectionIds: new Set(),
    categoryIds: new Set(),
    departmentIds: new Set()
  });

  React.useEffect(() => {
    if (!open) return;
    setQuery(searchParams.get("q") || "");
    const fromUrl = (key: FilterParamKey, singleKey?: string) => {
      const multi = parseIds(searchParams.get(key));
      if (multi.size) return multi;
      const single = singleKey ? Number(searchParams.get(singleKey) || 0) : 0;
      return single ? new Set([single]) : new Set<number>();
    };
    setSelection({
      sectionIds: fromUrl("sectionIds", "sectionId"),
      categoryIds: fromUrl("categoryIds", "categoryId"),
      departmentIds: fromUrl("departmentIds")
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const resetAll = () => {
    setQuery("");
    setSelection({ sectionIds: new Set(), categoryIds: new Set(), departmentIds: new Set() });
  };

  const showResults = () => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    (Object.keys(selection) as FilterParamKey[]).forEach((key) => {
      if (selection[key].size > 0) {
        params.set(key, serializeIds(selection[key]));
      }
    });
    onClose();
    navigate({ pathname: "/users", search: params.toString() });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" fullScreen={fullScreen}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", pr: 1.5 }}>
        <Typography component="span" sx={{ fontWeight: 700, flex: 1, fontSize: "1.05rem" }}>
          {t("advancedSearch")}
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ pt: 2.5 }}>
        <Stack spacing={3}>
          <TextField
            size="small"
            fullWidth
            autoFocus={!fullScreen}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                showResults();
              }
            }}
            placeholder={t("navbarSearchPlaceholder")}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              sx: { borderRadius: "8px" }
            }}
          />
          <FilterChipGroup
            label={t("sections")}
            options={sections}
            selected={selection.sectionIds}
            onChange={(next) => setSelection((prev) => ({ ...prev, sectionIds: next }))}
          />
          <FilterChipGroup
            label={t("categories")}
            options={categories}
            selected={selection.categoryIds}
            onChange={(next) => setSelection((prev) => ({ ...prev, categoryIds: next }))}
          />
          <FilterChipGroup
            label={t("departments")}
            options={departments}
            selected={selection.departmentIds}
            onChange={(next) => setSelection((prev) => ({ ...prev, departmentIds: next }))}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.75 }}>
        <Button onClick={resetAll} color="inherit">
          {t("resetFilters")}
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" onClick={showResults} sx={{ boxShadow: "none" }}>
          {t("showResults")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
