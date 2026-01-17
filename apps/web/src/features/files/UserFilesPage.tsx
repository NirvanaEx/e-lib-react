import React from "react";
import { Chip, MenuItem, Select, Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { fetchUserFiles } from "./files.api";
import { DataTable } from "../../shared/ui/DataTable";
import { Page } from "../../shared/ui/Page";
import { EmptyState } from "../../shared/ui/EmptyState";
import { LoadingState } from "../../shared/ui/LoadingState";
import { FiltersBar } from "../../shared/ui/FiltersBar";
import { PaginationBar } from "../../shared/ui/PaginationBar";
import { SearchField } from "../../shared/ui/SearchField";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function UserFilesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [sortBy, setSortBy] = React.useState("created_at");
  const [sortDir, setSortDir] = React.useState("desc");
  const sectionId = Number(searchParams.get("sectionId") || 0) || undefined;
  const categoryId = Number(searchParams.get("categoryId") || 0) || undefined;

  React.useEffect(() => {
    setPage(1);
  }, [search, pageSize, sortBy, sortDir, sectionId, categoryId]);

  const { data, isLoading } = useQuery({
    queryKey: ["user-files", page, pageSize, search, sortBy, sortDir, sectionId, categoryId],
    queryFn: () => fetchUserFiles({ page, pageSize, q: search, sortBy, sortDir, sectionId, categoryId })
  });

  const rows = data?.data || [];
  const meta = data?.meta || { page, pageSize, total: 0 };

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
              render: (row) => {
                const langs = row.availableAssetLangs || row.availableLangs || [];
                return (
                  <Stack direction="row" spacing={1}>
                    {langs.map((lang: string) => (
                      <Chip key={lang} size="small" label={lang.toUpperCase()} />
                    ))}
                  </Stack>
                );
              }
            },
            {
              key: "actions",
              label: t("actions"),
              align: "right",
              render: (row) => (
                <Typography
                  sx={{ cursor: "pointer", color: "primary.main", fontWeight: 600 }}
                  onClick={() => navigate(`/users/${row.id}`)}
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
    </Page>
  );
}
