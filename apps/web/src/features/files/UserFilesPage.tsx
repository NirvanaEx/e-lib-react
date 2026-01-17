import React from "react";
import { Box, Chip, Grid, Paper, Stack, Typography, MenuItem, Select } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { fetchUserFiles, fetchMenu } from "./files.api";
import { DataTable } from "../../shared/ui/DataTable";
import { Page } from "../../shared/ui/Page";
import { EmptyState } from "../../shared/ui/EmptyState";
import { LoadingState } from "../../shared/ui/LoadingState";
import { FiltersBar } from "../../shared/ui/FiltersBar";
import { PaginationBar } from "../../shared/ui/PaginationBar";
import { SearchField } from "../../shared/ui/SearchField";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function UserFilesPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [sortBy, setSortBy] = React.useState("created_at");
  const [sortDir, setSortDir] = React.useState("desc");

  React.useEffect(() => {
    setPage(1);
  }, [search, pageSize, sortBy, sortDir]);

  const { data, isLoading } = useQuery({
    queryKey: ["user-files", page, pageSize, search, sortBy, sortDir],
    queryFn: () => fetchUserFiles({ page, pageSize, q: search, sortBy, sortDir })
  });
  const { data: menu } = useQuery({ queryKey: ["user-menu"], queryFn: () => fetchMenu() });

  const rows = data?.data || [];
  const meta = data?.meta || { page, pageSize, total: 0 };
  const sections = menu?.sections || [];
  const categories = menu?.categories || [];

  const categoriesBySection = categories.reduce((acc: any, cat: any) => {
    acc[cat.sectionId] = acc[cat.sectionId] || [];
    acc[cat.sectionId].push(cat);
    return acc;
  }, {});

  return (
    <Page title={t("files")} subtitle={t("userFilesSubtitle")}>
      <FiltersBar>
        <SearchField value={search} onChange={setSearch} placeholder={t("searchFiles")} />
        <Select size="small" value={sortBy} onChange={(event) => setSortBy(String(event.target.value))}>
          <MenuItem value="created_at">{t("sortByDate")}</MenuItem>
          <MenuItem value="title">{t("sortByTitle")}</MenuItem>
          <MenuItem value="popular">{t("sortByPopular")}</MenuItem>
        </Select>
        <Select size="small" value={sortDir} onChange={(event) => setSortDir(String(event.target.value))}>
          <MenuItem value="desc">{t("desc")}</MenuItem>
          <MenuItem value="asc">{t("asc")}</MenuItem>
        </Select>
      </FiltersBar>

      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, borderRadius: 3, border: "1px solid var(--border)", background: "var(--surface)" }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              {t("menu")}
            </Typography>
            {sections.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {t("noSections")}
              </Typography>
            ) : (
              sections.map((section: any) => (
                <Box key={section.id} sx={{ mb: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {section.title}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                    {(categoriesBySection[section.id] || []).map((cat: any) => (
                      <Chip key={cat.id} size="small" label={cat.title} />
                    ))}
                  </Stack>
                </Box>
              ))
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={9}>
          {isLoading ? (
            <LoadingState rows={6} />
          ) : rows.length === 0 ? (
            <EmptyState title={t("noFiles")} subtitle={t("noFilesSubtitle")} />
          ) : (
            <DataTable
              rows={rows}
              columns={[
                { key: "title", label: t("title") },
                {
                  key: "langs",
                  label: t("languages"),
                  render: (row) => (
                    <Stack direction="row" spacing={1}>
                      {(row.availableLangs || []).map((lang: string) => (
                        <Chip key={lang} size="small" label={lang.toUpperCase()} />
                      ))}
                    </Stack>
                  )
                },
                {
                  key: "actions",
                  label: t("actions"),
                  align: "right",
                  render: (row) => (
                    <Typography
                      sx={{ cursor: "pointer", color: "primary.main", fontWeight: 600 }}
                      onClick={() => navigate(`/user/files/${row.id}`)}
                    >
                      {t("open")}
                    </Typography>
                  )
                }
              ]}
            />
          )}

          <PaginationBar
            page={meta.page}
            pageSize={meta.pageSize}
            total={meta.total}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </Grid>
      </Grid>
    </Page>
  );
}
