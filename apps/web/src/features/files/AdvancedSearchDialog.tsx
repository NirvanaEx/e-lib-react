import React from "react";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
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

/** Длинные списки (отделы) получают собственный поиск внутри группы. */
const SEARCHABLE_FROM = 8;

/**
 * Группа фильтра: заголовок со счётчиком, локальный поиск и список чекбоксов
 * с отступами по вложенности. Раньше здесь была «стена» чипов — длинные
 * названия обрезались, а список отделов растягивал диалог на несколько экранов.
 */
function FilterFacet({
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
  const [query, setQuery] = React.useState("");
  const searchable = options.length > SEARCHABLE_FROM;
  const allActive = selected.size === 0;
  const searching = query.trim().length > 0;

  const visibleOptions = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) => option.path.toLowerCase().includes(needle));
  }, [options, query]);

  const toggle = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    // Выбраны все — это то же самое, что фильтр не задан.
    onChange(next.size === options.length ? new Set() : next);
  };

  return (
    <Box sx={{ border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden" }}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ px: 1.5, py: 0.75, backgroundColor: "var(--surface-2)" }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700, flex: 1, minWidth: 0 }}>
          {label}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {allActive ? t("selectAll") : `${selected.size} / ${options.length}`}
        </Typography>
        {!allActive && (
          <Button size="small" onClick={() => onChange(new Set())} sx={{ minWidth: 0, px: 1 }}>
            {t("clear")}
          </Button>
        )}
      </Stack>
      {searchable && (
        <Box sx={{ px: 1.5, pt: 1.25 }}>
          <TextField
            size="small"
            fullWidth
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("filterSearchPlaceholder")}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              sx: { borderRadius: "8px" }
            }}
          />
        </Box>
      )}
      {/* Короткие списки показываем целиком — вложенная прокрутка нужна только
          длинным (отделы), иначе в диалоге получается скролл внутри скролла. */}
      <Box
        sx={{
          maxHeight: searchable ? 216 : "none",
          overflowY: searchable ? "auto" : "visible",
          px: 1,
          py: 0.75
        }}
      >
        {visibleOptions.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ px: 0.5, py: 0.75 }}>
            {t("filterNothingFound")}
          </Typography>
        ) : (
          visibleOptions.map((option) => (
            <FormControlLabel
              key={option.id}
              control={
                <Checkbox size="small" checked={selected.has(option.id)} onChange={() => toggle(option.id)} />
              }
              // При поиске показываем полный путь: родители могут быть отфильтрованы,
              // и один отступ уже ничего не объясняет.
              label={
                <Typography variant="body2" sx={{ py: 0.25 }}>
                  {searching ? option.path : option.label}
                </Typography>
              }
              sx={{
                display: "flex",
                width: "100%",
                m: 0,
                pr: 1,
                ml: searching ? 0 : option.depth * 2.5,
                borderRadius: "8px",
                "&:hover": { backgroundColor: "var(--surface-2)" }
              }}
            />
          ))
        )}
      </Box>
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
          <FilterFacet
            label={t("sections")}
            options={sections}
            selected={selection.sectionIds}
            onChange={(next) => setSelection((prev) => ({ ...prev, sectionIds: next }))}
          />
          <FilterFacet
            label={t("categories")}
            options={categories}
            selected={selection.categoryIds}
            onChange={(next) => setSelection((prev) => ({ ...prev, categoryIds: next }))}
          />
          <FilterFacet
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
