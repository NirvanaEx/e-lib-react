import React from "react";
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, Select, Stack, Tooltip, Typography } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useMutation, useQuery } from "@tanstack/react-query";
import { downloadUserFile, fetchMenu, fetchUserFiles } from "./files.api";
import { DataTable } from "../../shared/ui/DataTable";
import { Page } from "../../shared/ui/Page";
import { EmptyState } from "../../shared/ui/EmptyState";
import { LoadingState } from "../../shared/ui/LoadingState";
import { FiltersBar } from "../../shared/ui/FiltersBar";
import { PaginationBar } from "../../shared/ui/PaginationBar";
import { SearchField } from "../../shared/ui/SearchField";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatBytes } from "../../shared/utils/format";
import { formatDateTime } from "../../shared/utils/date";
import { getFilenameFromDisposition } from "../../shared/utils/download";

export default function UserFilesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [sortBy, setSortBy] = React.useState("created_at");
  const [sortDir, setSortDir] = React.useState("desc");
  const [downloadTarget, setDownloadTarget] = React.useState<{
    id: number;
    title: string | null;
    langs: string[];
    sizes: Record<string, number>;
  } | null>(null);
  const sectionId = Number(searchParams.get("sectionId") || 0) || undefined;
  const categoryId = Number(searchParams.get("categoryId") || 0) || undefined;

  React.useEffect(() => {
    setPage(1);
  }, [search, pageSize, sortBy, sortDir, sectionId, categoryId]);

  const { data, isLoading } = useQuery({
    queryKey: ["user-files", page, pageSize, search, sortBy, sortDir, sectionId, categoryId],
    queryFn: () => fetchUserFiles({ page, pageSize, q: search, sortBy, sortDir, sectionId, categoryId })
  });
  const { data: menuData } = useQuery({ queryKey: ["user-menu-all"], queryFn: () => fetchMenu() });

  const rows = data?.data || [];
  const meta = data?.meta || { page, pageSize, total: 0 };
  const sections = menuData?.sections || [];
  const categories = menuData?.categories || [];
  const sectionsById = React.useMemo(() => new Map(sections.map((item: any) => [item.id, item])), [sections]);
  const categoriesById = React.useMemo(() => new Map(categories.map((item: any) => [item.id, item])), [categories]);

  const getCategoryPath = (id: number) => {
    const segments: string[] = [];
    let current = categoriesById.get(id);
    while (current) {
      segments.unshift(current.title || `#${current.id}`);
      current = current.parentId ? categoriesById.get(current.parentId) : null;
    }
    return segments.length ? segments : [`#${id}`];
  };

  const renderPath = (segments: string[]) => (
    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexWrap: "wrap" }}>
      {segments.map((segment, index) => (
        <React.Fragment key={`${segment}-${index}`}>
          {index > 0 && <ChevronRightIcon fontSize="small" sx={{ color: "text.disabled" }} />}
          <Box component="span" sx={{ minWidth: 0 }}>
            {segment}
          </Box>
        </React.Fragment>
      ))}
    </Stack>
  );

  const downloadMutation = useMutation({
    mutationFn: ({ id, lang }: { id: number; lang?: string | null; title?: string | null }) =>
      downloadUserFile(id, lang || undefined),
    onSuccess: (response, variables) => {
      const blob = response.data;
      const filename =
        getFilenameFromDisposition(response.headers?.["content-disposition"]) ||
        `${variables.title || "file"}${variables.lang ? `_${variables.lang.toUpperCase()}` : ""}`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  });

  const resolveRowSize = (row: any) => {
    const sizes = row.availableAssetSizes || [];
    const currentLang = (i18n.language || "ru").split("-")[0];
    const direct = sizes.find((item: any) => item.lang === currentLang)?.size;
    if (direct !== undefined) return direct;
    if (sizes.length === 1) return sizes[0].size;
    return row.currentAssetSize ?? null;
  };

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
            {
              key: "title",
              label: t("title"),
              render: (row) => (
                <Typography
                  sx={{ cursor: "pointer", color: "primary.main", fontWeight: 600 }}
                  onClick={() => navigate(`/users/${row.id}`)}
                >
                  {row.title || t("file")}
                </Typography>
              )
            },
            {
              key: "section",
              label: t("section"),
              render: (row) => {
                const item = row.sectionId ? sectionsById.get(row.sectionId) : null;
                return item?.title || (row.sectionId ? `#${row.sectionId}` : "-");
              }
            },
            {
              key: "category",
              label: t("category"),
              render: (row) => (row.categoryId ? renderPath(getCategoryPath(row.categoryId)) : "-")
            },
            {
              key: "accessType",
              label: t("access"),
              render: (row) => (
                <Chip size="small" label={row.accessType === "restricted" ? t("accessRestricted") : t("accessPublic")} />
              )
            },
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
              key: "size",
              label: t("fileSize"),
              render: (row) => {
                const size = resolveRowSize(row);
                return size === null || size === undefined ? "-" : formatBytes(size);
              }
            },
            {
              key: "createdAt",
              label: t("createdAt"),
              render: (row) => formatDateTime(row.createdAt)
            },
            {
              key: "updatedAt",
              label: t("updatedAt"),
              render: (row) => formatDateTime(row.updatedAt)
            },
            {
              key: "download",
              label: t("download"),
              align: "center",
              render: (row) => {
                const langs = row.availableAssetLangs || row.availableLangs || [];
                const disabled = langs.length === 0;
                const sizes = (row.availableAssetSizes || []).reduce<Record<string, number>>((acc: Record<string, number>, item: any) => {
                  acc[item.lang] = item.size;
                  return acc;
                }, {});
                return (
                  <Tooltip title={disabled ? t("noAssets") : t("download")}>
                    <span>
                      <IconButton
                        size="small"
                        disabled={disabled}
                        onClick={() => {
                          if (langs.length > 1) {
                            setDownloadTarget({ id: row.id, title: row.title, langs, sizes });
                            return;
                          }
                          const lang = langs[0];
                          downloadMutation.mutate({ id: row.id, lang, title: row.title });
                        }}
                      >
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                );
              }
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

      <Dialog open={!!downloadTarget} onClose={() => setDownloadTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>{t("download")}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5}>
            {(downloadTarget?.langs || []).map((lang) => (
              <Button
                key={lang}
                variant="outlined"
                onClick={() => {
                  downloadMutation.mutate({ id: downloadTarget!.id, lang, title: downloadTarget?.title });
                  setDownloadTarget(null);
                }}
                sx={{ justifyContent: "space-between" }}
              >
                <span>{lang.toUpperCase()}</span>
                <Typography variant="caption" color="text.secondary">
                  {formatBytes(downloadTarget?.sizes?.[lang] || 0)}
                </Typography>
              </Button>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDownloadTarget(null)}>{t("cancel")}</Button>
        </DialogActions>
      </Dialog>
    </Page>
  );
}
