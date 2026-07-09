import React from "react";
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  InputAdornment,
  Popover,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import TuneIcon from "@mui/icons-material/Tune";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { fetchMenu } from "./files.api";

const FILE_LIST_PATHS = ["/users", "/users/files"];

type TreeOption = { id: number; label: string; depth: number };

function orderAsTree(items: Array<{ id: number; parentId: number | null; title?: string | null; name?: string | null }>) {
  const byParent = new Map<number | null, typeof items>();
  items.forEach((item) => {
    const key = item.parentId ?? null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(item);
  });
  const result: TreeOption[] = [];
  const walk = (parentId: number | null, depth: number) => {
    (byParent.get(parentId) || []).forEach((item) => {
      result.push({ id: item.id, label: item.title || item.name || `#${item.id}`, depth });
      walk(item.id, depth + 1);
    });
  };
  walk(null, 0);
  return result;
}

function parseIds(value: string | null) {
  if (!value) return new Set<number>();
  return new Set(
    value
      .split(",")
      .map((item) => Number(item))
      .filter((id) => Number.isInteger(id) && id > 0)
  );
}

function FilterColumn({
  title,
  options,
  selected,
  onChange
}: {
  title: string;
  options: TreeOption[];
  selected: Set<number>;
  onChange: (next: Set<number>) => void;
}) {
  const { t } = useTranslation();
  const allChecked = options.length > 0 && options.every((option) => selected.has(option.id));
  const noneChecked = options.every((option) => !selected.has(option.id));

  const toggleAll = () => {
    if (allChecked) {
      onChange(new Set());
    } else {
      onChange(new Set(options.map((option) => option.id)));
    }
  };

  const toggleOne = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onChange(next);
  };

  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="overline" sx={{ letterSpacing: "0.12em", fontWeight: 700, color: "text.secondary" }}>
        {title}
      </Typography>
      <Box sx={{ mt: 0.5 }}>
        <FormControlLabel
          control={
            <Checkbox size="small" checked={allChecked} indeterminate={!allChecked && !noneChecked} onChange={toggleAll} />
          }
          label={
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {t("selectAll")}
            </Typography>
          }
          sx={{ mr: 0 }}
        />
        <Divider sx={{ my: 0.5 }} />
        <Box sx={{ maxHeight: 300, overflow: "auto", pr: 0.5 }}>
          {options.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
              {t("noData")}
            </Typography>
          ) : (
            options.map((option) => (
              <FormControlLabel
                key={option.id}
                control={<Checkbox size="small" checked={selected.has(option.id)} onChange={() => toggleOne(option.id)} />}
                label={
                  <Typography variant="body2" noWrap title={option.label}>
                    {option.label}
                  </Typography>
                }
                sx={{ display: "flex", mr: 0, ml: option.depth * 1.5, minWidth: 0, "& .MuiFormControlLabel-label": { minWidth: 0 } }}
              />
            ))
          )}
        </Box>
      </Box>
    </Box>
  );
}

export function NavbarSearch() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const muiTheme = useTheme();
  const mdUp = useMediaQuery(muiTheme.breakpoints.up("md"));

  const onFileListPage = FILE_LIST_PATHS.includes(location.pathname);
  const urlQuery = onFileListPage ? searchParams.get("q") || "" : "";
  const [value, setValue] = React.useState(urlQuery);
  const debounceRef = React.useRef<number | null>(null);

  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const { data: menuData } = useQuery({ queryKey: ["user-menu-all"], queryFn: () => fetchMenu(), enabled: Boolean(anchorEl) || onFileListPage });

  const sections = React.useMemo(
    () => (menuData?.sections || []).map((item: any) => ({ id: item.id, label: item.title || `#${item.id}`, depth: 0 })),
    [menuData]
  );
  const categories = React.useMemo(() => orderAsTree(menuData?.categories || []), [menuData]);
  const departments = React.useMemo(() => orderAsTree(menuData?.departments || []), [menuData]);

  const [selectedSections, setSelectedSections] = React.useState<Set<number>>(new Set());
  const [selectedCategories, setSelectedCategories] = React.useState<Set<number>>(new Set());
  const [selectedDepartments, setSelectedDepartments] = React.useState<Set<number>>(new Set());

  React.useEffect(() => {
    setValue(urlQuery);
  }, [urlQuery]);

  const hasAdvancedFilters = Boolean(
    searchParams.get("sectionIds") || searchParams.get("categoryIds") || searchParams.get("departmentIds")
  );

  const applySearch = React.useCallback(
    (query: string) => {
      const params = new URLSearchParams(onFileListPage ? searchParams : undefined);
      if (query.trim()) {
        params.set("q", query.trim());
      } else {
        params.delete("q");
      }
      const target = onFileListPage ? location.pathname : "/users";
      navigate({ pathname: target, search: params.toString() }, { replace: onFileListPage });
    },
    [navigate, onFileListPage, location.pathname, searchParams]
  );

  const handleChange = (next: string) => {
    setValue(next);
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => applySearch(next), 400);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    applySearch(value);
  };

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const openAdvanced = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  React.useEffect(() => {
    if (!anchorEl || !menuData) return;
    const fromUrlSections = parseIds(searchParams.get("sectionIds"));
    const fromUrlCategories = parseIds(searchParams.get("categoryIds"));
    const fromUrlDepartments = parseIds(searchParams.get("departmentIds"));
    setSelectedSections(fromUrlSections.size ? fromUrlSections : new Set(sections.map((item: TreeOption) => item.id)));
    setSelectedCategories(fromUrlCategories.size ? fromUrlCategories : new Set(categories.map((item) => item.id)));
    setSelectedDepartments(fromUrlDepartments.size ? fromUrlDepartments : new Set(departments.map((item) => item.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorEl, menuData]);

  const buildIdsParam = (selected: Set<number>, options: TreeOption[]) => {
    if (selected.size === 0 || selected.size === options.length) return null;
    return Array.from(selected).sort((a, b) => a - b).join(",");
  };

  const applyAdvanced = () => {
    const params = new URLSearchParams();
    if (value.trim()) params.set("q", value.trim());
    const sectionIds = buildIdsParam(selectedSections, sections);
    const categoryIds = buildIdsParam(selectedCategories, categories);
    const departmentIds = buildIdsParam(selectedDepartments, departments);
    if (sectionIds) params.set("sectionIds", sectionIds);
    if (categoryIds) params.set("categoryIds", categoryIds);
    if (departmentIds) params.set("departmentIds", departmentIds);
    setAnchorEl(null);
    const target = onFileListPage ? location.pathname : "/users";
    navigate({ pathname: target, search: params.toString() });
  };

  const resetAdvanced = () => {
    setSelectedSections(new Set(sections.map((item: TreeOption) => item.id)));
    setSelectedCategories(new Set(categories.map((item) => item.id)));
    setSelectedDepartments(new Set(departments.map((item) => item.id)));
  };

  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1, minWidth: 0, maxWidth: 640 }}>
      <Box component="form" onSubmit={handleSubmit} sx={{ flex: 1, minWidth: 0 }}>
        <TextField
          size="small"
          fullWidth
          value={value}
          onChange={(event) => handleChange(event.target.value)}
          placeholder={t("navbarSearchPlaceholder")}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            sx: { borderRadius: "8px", backgroundColor: "var(--surface-2)", fontSize: "0.875rem" }
          }}
        />
      </Box>
      <Badge color="primary" variant="dot" invisible={!hasAdvancedFilters}>
        <Button
          size="small"
          variant="outlined"
          onClick={openAdvanced}
          startIcon={mdUp ? <TuneIcon fontSize="small" /> : undefined}
          sx={{ borderRadius: "8px", whiteSpace: "nowrap", flexShrink: 0, px: mdUp ? 1.75 : 1, minWidth: 0, py: 0.85 }}
        >
          {mdUp ? t("advancedSearch") : <TuneIcon fontSize="small" />}
        </Button>
      </Badge>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              mt: 1.5,
              p: 2.5,
              width: "min(860px, calc(100vw - 32px))",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              boxShadow: "var(--shadow)"
            }
          }
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
          {t("advancedSearch")}
        </Typography>
        <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" } }}>
          <FilterColumn title={t("sections")} options={sections} selected={selectedSections} onChange={setSelectedSections} />
          <FilterColumn
            title={t("categories")}
            options={categories}
            selected={selectedCategories}
            onChange={setSelectedCategories}
          />
          <FilterColumn
            title={t("departments")}
            options={departments}
            selected={selectedDepartments}
            onChange={setSelectedDepartments}
          />
        </Box>
        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2 }}>
          <Button onClick={resetAdvanced}>{t("resetFilters")}</Button>
          <Button variant="contained" onClick={applyAdvanced} sx={{ boxShadow: "none" }}>
            {t("apply")}
          </Button>
        </Stack>
      </Popover>
    </Stack>
  );
}
