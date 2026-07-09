import React from "react";
import { Badge, Box, Button, InputAdornment, Stack, TextField, Tooltip, useMediaQuery, useTheme } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import TuneIcon from "@mui/icons-material/Tune";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AdvancedSearchDialog } from "./AdvancedSearchDialog";

const FILE_LIST_PATHS = ["/users", "/users/files"];

export function NavbarSearch() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const muiTheme = useTheme();
  const mdUp = useMediaQuery(muiTheme.breakpoints.up("md"));
  const [advancedOpen, setAdvancedOpen] = React.useState(false);

  const onFileListPage = FILE_LIST_PATHS.includes(location.pathname);
  const urlQuery = onFileListPage ? searchParams.get("q") || "" : "";
  const [value, setValue] = React.useState(urlQuery);
  const debounceRef = React.useRef<number | null>(null);
  const hasAdvancedFilters = Boolean(
    searchParams.get("sectionIds") || searchParams.get("categoryIds") || searchParams.get("departmentIds")
  );

  React.useEffect(() => {
    setValue(urlQuery);
  }, [urlQuery]);

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

  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1, minWidth: 0, maxWidth: 620 }}>
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
        <Tooltip title={t("advancedSearch")}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => setAdvancedOpen(true)}
            startIcon={mdUp ? <TuneIcon fontSize="small" /> : undefined}
            sx={{ borderRadius: "8px", whiteSpace: "nowrap", flexShrink: 0, px: mdUp ? 1.75 : 1, py: 0.85, minWidth: 0 }}
          >
            {mdUp ? t("advancedSearch") : <TuneIcon fontSize="small" />}
          </Button>
        </Tooltip>
      </Badge>
      <AdvancedSearchDialog open={advancedOpen} onClose={() => setAdvancedOpen(false)} />
    </Stack>
  );
}
