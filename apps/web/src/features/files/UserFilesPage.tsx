import React from "react";
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import StarIcon from "@mui/icons-material/Star";
import PublicIcon from "@mui/icons-material/Public";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addUserFavorite, downloadUserFile, fetchMenu, fetchUserFavorites, fetchUserFile, fetchUserFiles, removeUserFavorite } from "./files.api";
import { DataTable } from "../../shared/ui/DataTable";
import { Page } from "../../shared/ui/Page";
import { EmptyState } from "../../shared/ui/EmptyState";
import { LoadingState } from "../../shared/ui/LoadingState";
import { FiltersBar } from "../../shared/ui/FiltersBar";
import { PaginationBar } from "../../shared/ui/PaginationBar";
import { SearchField } from "../../shared/ui/SearchField";
import { useTranslation } from "react-i18next";
import { formatBytes } from "../../shared/utils/format";
import { formatDateTime } from "../../shared/utils/date";
import { getFilenameFromDisposition } from "../../shared/utils/download";
import { getErrorMessage } from "../../shared/utils/errors";
import { useSearchParams } from "react-router-dom";
import { useToast } from "../../shared/ui/ToastProvider";
import { formatUserLabel } from "../../shared/utils/userLabel";
import { sharedLibraryTableLayout } from "./fileTableLayout";

export default function UserFilesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [sort, setSort] = React.useState<{ key: string | null; direction: "asc" | "desc" | null }>({
    key: null,
    direction: null
  });
  const [downloadTarget, setDownloadTarget] = React.useState<{
    id: number;
    title: string | null;
    langs: string[];
    sizes: Record<string, number>;
  } | null>(null);
  const [detailsId, setDetailsId] = React.useState<number | null>(null);
  const [favoriteOverrides, setFavoriteOverrides] = React.useState<Record<string, boolean>>({});
  const sectionId = Number(searchParams.get("sectionId") || 0) || undefined;
  const categoryId = Number(searchParams.get("categoryId") || 0) || undefined;

  React.useEffect(() => {
    setPage(1);
  }, [search, pageSize, sort.key, sort.direction, sectionId, categoryId]);

  const resetFilters = () => {
    setSearch("");
    setSort({ key: null, direction: null });
    setPage(1);
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const { data, isLoading } = useQuery({
    queryKey: ["user-files", page, pageSize, search, sort.key, sort.direction, sectionId, categoryId],
    queryFn: () =>
      fetchUserFiles({
        page,
        pageSize,
        q: search,
        sortBy: sort.direction ? sort.key || undefined : undefined,
        sortDir: sort.direction || undefined,
        sectionId,
        categoryId
      })
  });
  const { data: favoritesData } = useQuery({
    queryKey: ["user-favorites", "ids"],
    queryFn: () => fetchUserFavorites({ page: 1, pageSize: 1000 })
  });
  const { data: detailsData, isLoading: detailsLoading } = useQuery({
    queryKey: ["user-file-details", detailsId],
    queryFn: () => fetchUserFile(detailsId as number),
    enabled: !!detailsId
  });
  const { data: menuData } = useQuery({ queryKey: ["user-menu-all"], queryFn: () => fetchMenu() });

  const rows = data?.data || [];
  const meta = data?.meta || { page, pageSize, total: 0 };
  const favoriteIds = React.useMemo(() => {
    if (!favoritesData?.data) return null;
    return new Set(favoritesData.data.map((item: any) => Number(item.id)));
  }, [favoritesData]);
  const displayRows = React.useMemo(() => {
    return rows.map((row: any) => {
      const id = Number(row.id);
      const override = favoriteOverrides[String(id)];
      if (override !== undefined) {
        return { ...row, isFavorite: override };
      }
      const isFavorite = favoriteIds ? favoriteIds.has(id) || Boolean(row.isFavorite) : Boolean(row.isFavorite);
      return { ...row, isFavorite };
    });
  }, [rows, favoriteIds, favoriteOverrides]);

  React.useEffect(() => {
    if (!favoriteIds) return;
    setFavoriteOverrides((prev) => {
      let changed = false;
      const next: Record<string, boolean> = {};
      for (const [key, value] of Object.entries(prev)) {
        const id = Number(key);
        if (favoriteIds.has(id) !== value) {
          next[key] = value;
        } else {
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [favoriteIds]);
  const sections = menuData?.sections || [];
  const categories = menuData?.categories || [];
  const sectionsById = React.useMemo(() => new Map(sections.map((item: any) => [item.id, item])), [sections]);
  const categoriesById = React.useMemo(() => new Map(categories.map((item: any) => [item.id, item])), [categories]);
  const translations = detailsData?.translations || [];
  const assets = detailsData?.assets || [];
  const accessDepartments = detailsData?.accessDepartments || [];
  const accessUsers = detailsData?.accessUsers || [];
  const currentLang = (i18n.language || "ru").split("-")[0];
  const translationsSorted = React.useMemo(() => {
    const items = [...translations];
    return items.sort((a: any, b: any) => {
      const aCurrent = a.lang === currentLang;
      const bCurrent = b.lang === currentLang;
      if (aCurrent && !bCurrent) return -1;
      if (!aCurrent && bCurrent) return 1;
      return String(a.lang).localeCompare(String(b.lang));
    });
  }, [translations, currentLang]);
  const assetsSorted = React.useMemo(() => {
    const items = [...assets];
    return items.sort((a: any, b: any) => {
      const aCurrent = a.lang === currentLang;
      const bCurrent = b.lang === currentLang;
      if (aCurrent && !bCurrent) return -1;
      if (!aCurrent && bCurrent) return 1;
      return String(a.lang).localeCompare(String(b.lang));
    });
  }, [assets, currentLang]);
  const downloadLangsSorted = React.useMemo(() => {
    if (!downloadTarget?.langs) return [];
    const items = [...downloadTarget.langs];
    return items.sort((a, b) => {
      const aCurrent = a === currentLang;
      const bCurrent = b === currentLang;
      if (aCurrent && !bCurrent) return -1;
      if (!aCurrent && bCurrent) return 1;
      return a.localeCompare(b);
    });
  }, [downloadTarget, currentLang]);
  const titleForLang = (lang?: string | null) => {
    if (!lang) return detailsData?.title || "file";
    return translations.find((item: any) => item.lang === lang)?.title || detailsData?.title || "file";
  };

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

  const updateFavoriteCaches = (id: number, nextValue: boolean) => {
    const updateRows = (data: any, removeWhenFalse = false) => {
      if (!data?.data) return data;
      const updated = data.data
        .map((item: any) => (Number(item.id) === id ? { ...item, isFavorite: nextValue } : item))
        .filter((item: any) => !(removeWhenFalse && !item.isFavorite));
      return { ...data, data: updated };
    };
    queryClient.setQueriesData({ queryKey: ["user-files"] }, (data) => updateRows(data));
    queryClient.setQueriesData({ queryKey: ["user-my-files"] }, (data) => updateRows(data));
    queryClient.setQueriesData({ queryKey: ["user-favorites"] }, (data) => updateRows(data, true));
  };

  const favoriteMutation = useMutation({
    mutationFn: ({ id, isFavorite }: { id: number; isFavorite: boolean }) =>
      isFavorite ? removeUserFavorite(id) : addUserFavorite(id),
    onMutate: ({ id, isFavorite }) => {
      updateFavoriteCaches(id, !isFavorite);
      const key = String(id);
      const previousOverride = favoriteOverrides[key];
      setFavoriteOverrides((prev) => ({ ...prev, [key]: !isFavorite }));
      return { id, previousOverride };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user-files"] });
      queryClient.invalidateQueries({ queryKey: ["user-favorites"] });
      queryClient.invalidateQueries({ queryKey: ["user-my-files"] });
      showToast({
        message: variables.isFavorite ? t("favoriteRemoved") : t("favoriteAdded"),
        severity: "success"
      });
    },
    onError: (error, _variables, context) => {
      if (context) {
        setFavoriteOverrides((prev) => {
          const next = { ...prev };
          const key = String(context.id);
          if (context.previousOverride === undefined) {
            delete next[key];
          } else {
            next[key] = context.previousOverride;
          }
          return next;
        });
      }
      queryClient.invalidateQueries({ queryKey: ["user-files"] });
      queryClient.invalidateQueries({ queryKey: ["user-favorites"] });
      queryClient.invalidateQueries({ queryKey: ["user-my-files"] });
      showToast({ message: getErrorMessage(error, t("actionFailed")), severity: "error" });
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

  const isDownloadable = (row: any) => {
    const langs = row.availableAssetLangs || row.availableLangs || [];
    return Boolean(row.canDownload) && langs.length > 0;
  };

  const renderStatusIcons = (row: any) => {
    const items: Array<{ key: string; node: React.ReactNode }> = [];

    items.push({
      key: "favorite",
      node: (
        <Tooltip title={t("favorites")}>
          <IconButton
            size="small"
            onClick={(event) => {
              event.stopPropagation();
              favoriteMutation.mutate({ id: row.id, isFavorite: Boolean(row.isFavorite) });
            }}
          >
            {row.isFavorite ? (
              <StarIcon fontSize="small" sx={{ color: "warning.main" }} />
            ) : (
              <StarBorderIcon fontSize="small" sx={{ color: "text.disabled" }} />
            )}
          </IconButton>
        </Tooltip>
      )
    });

    if (!isDownloadable(row)) {
      const tooltip = row.canDownload ? t("noAssets") : t("noAccess");
      items.push({
        key: "lock",
        node: (
          <Tooltip title={tooltip}>
            <Box sx={{ display: "inline-flex", alignItems: "center" }}>
              <LockOutlinedIcon sx={{ fontSize: 16, display: "block" }} color="action" />
            </Box>
          </Tooltip>
        )
      });
    }

    if (!items.length) return null;

    return (
      <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center" sx={{ width: "100%" }}>
        {items.map((item) => (
          <Box key={item.key} sx={{ display: "inline-flex", alignItems: "center" }}>
            {item.node}
          </Box>
        ))}
      </Stack>
    );
  };

  return (
    <Page title={t("sharedLibrary")} subtitle={t("userFilesSubtitle")}>
      <FiltersBar>
        <SearchField value={search} onChange={setSearch} placeholder={t("searchFiles")} />
        <Tooltip title={t("resetFilters")}>
          <span>
            <IconButton size="small" onClick={resetFilters}>
              <RestartAltIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </FiltersBar>

      {isLoading ? (
        <LoadingState rows={6} />
      ) : displayRows.length === 0 ? (
        <EmptyState title={t("noFiles")} subtitle={t("noFilesSubtitle")} />
      ) : (
        <DataTable
          rows={displayRows}
          onRowClick={(row) => {
            if (!isDownloadable(row)) return;
            setDetailsId(row.id);
          }}
          sort={sort}
          onSortChange={(key, direction) =>
            setSort(direction ? { key, direction } : { key: null, direction: null })
          }
          sortIconVariant="chevron"
          tableLayout="fixed"
          containerSx={{ overflowX: "visible" }}
          columns={[
            {
              key: "status",
              label: "",
              align: "center",
              sortable: false,
              ...sharedLibraryTableLayout.status,
              render: (row) => renderStatusIcons(row)
            },
            {
              key: "title",
              label: t("title"),
              sortable: true,
              sortKey: "title",
              ...sharedLibraryTableLayout.title,
              render: (row) => (
                <Box component="span" sx={{ color: "text.primary" }}>
                  {row.title || t("file")}
                </Box>
              )
            },
            {
              key: "section",
              label: t("section"),
              ...sharedLibraryTableLayout.section,
              render: (row) => {
                const item = row.sectionId ? sectionsById.get(row.sectionId) : null;
                return item?.title || (row.sectionId ? `#${row.sectionId}` : "-");
              }
            },
            {
              key: "category",
              label: t("category"),
              ...sharedLibraryTableLayout.category,
              render: (row) => (row.categoryId ? renderPath(getCategoryPath(row.categoryId)) : "-"),
              sortable: true,
              sortKey: "category",
            },
            {
              key: "accessType",
              label: t("access"),
              align: "center",
              ...sharedLibraryTableLayout.accessType,
              render: (row) => (
                <Tooltip title={row.accessType === "restricted" ? t("accessRestricted") : t("accessPublic")}>
                  <Box sx={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
                    {row.accessType === "restricted" ? (
                      <GroupOutlinedIcon fontSize="small" sx={{ color: "warning.main" }} />
                    ) : (
                      <PublicIcon fontSize="small" sx={{ color: "success.main" }} />
                    )}
                  </Box>
                </Tooltip>
              )
            },
            {
              key: "langs",
              label: t("languages"),
              ...sharedLibraryTableLayout.langs,
              render: (row) => {
                const langs = row.availableAssetLangs || row.availableLangs || [];
                return (
                  <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 0.5 }}>
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
              ...sharedLibraryTableLayout.size,
              render: (row) => {
                const size = resolveRowSize(row);
                return size === null || size === undefined ? "-" : formatBytes(size);
              },
              sortable: true,
              sortKey: "size"
            },
            {
              key: "createdAt",
              label: t("createdAt"),
              ...sharedLibraryTableLayout.createdAt,
              render: (row) => formatDateTime(row.createdAt),
              sortable: true,
              sortKey: "created_at"
            },
            {
              key: "updatedAt",
              label: t("updatedAt"),
              ...sharedLibraryTableLayout.updatedAt,
              render: (row) => formatDateTime(row.updatedAt),
              sortable: true,
              sortKey: "updated_at"
            },
            {
              key: "download",
              label: t("download"),
              align: "center",
              ...sharedLibraryTableLayout.download,
              render: (row) => {
                const langs = row.availableAssetLangs || row.availableLangs || [];
                if (!isDownloadable(row)) return "-";
                const sizes = (row.availableAssetSizes || []).reduce<Record<string, number>>((acc: Record<string, number>, item: any) => {
                  acc[item.lang] = item.size;
                  return acc;
                }, {});
                return (
                  <Tooltip title={t("download")}>
                    <span>
                      <IconButton
                        size="small"
                        color="primary"
                        sx={{ backgroundColor: "rgba(29, 77, 79, 0.12)" }}
                        onClick={(event) => {
                          event.stopPropagation();
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
            {downloadLangsSorted.map((lang) => (
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

      <Dialog open={!!detailsId} onClose={() => setDetailsId(null)} fullWidth maxWidth="md">
        <DialogTitle>{detailsData?.title || t("file")}</DialogTitle>
        <DialogContent dividers>
          {detailsLoading ? (
            <Typography color="text.secondary">{t("loading")}</Typography>
          ) : (
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {t("description")}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {detailsData?.description || "-"}
                </Typography>
              </Box>
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="subtitle2">{t("access")}</Typography>
                  <Chip
                    size="small"
                    variant="outlined"
                    sx={{
                      borderColor: detailsData?.accessType === "restricted" ? "warning.main" : "success.main",
                      color: detailsData?.accessType === "restricted" ? "warning.main" : "success.main",
                      fontWeight: 600
                    }}
                    label={detailsData?.accessType === "restricted" ? t("accessRestricted") : t("accessPublic")}
                  />
                </Stack>
                {detailsData?.accessType === "restricted" && (
                  <Stack spacing={1}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {t("departments")}
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 0.5 }}>
                        {accessDepartments.length === 0 ? (
                          <Typography variant="body2" color="text.secondary">
                            -
                          </Typography>
                        ) : (
                          accessDepartments.map((dept: any) => (
                            <Chip key={dept.id} size="small" label={dept.path || dept.name} />
                          ))
                        )}
                      </Stack>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {t("users")}
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 0.5 }}>
                        {accessUsers.length === 0 ? (
                          <Typography variant="body2" color="text.secondary">
                            -
                          </Typography>
                        ) : (
                          accessUsers.map((user: any) => (
                            <Chip key={user.id} size="small" label={formatUserLabel(user)} />
                          ))
                        )}
                      </Stack>
                    </Box>
                  </Stack>
                )}
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {t("currentVersion")}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {detailsData?.currentVersionNumber ? `#${detailsData.currentVersionNumber}` : "-"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {t("titlesByLanguage")}
                </Typography>
                <Stack spacing={1}>
                  {translations.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      -
                    </Typography>
                  ) : (
                    translationsSorted.map((item: any) => (
                      <Stack key={item.lang} direction="row" spacing={1.5} alignItems="flex-start">
                        <Chip
                          size="small"
                          label={item.lang.toUpperCase()}
                          color={item.lang === currentLang ? "primary" : "default"}
                          variant={item.lang === currentLang ? "filled" : "outlined"}
                        />
                        <Box>
                          <Typography variant="body2">{item.title}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.description || "-"}
                          </Typography>
                        </Box>
                      </Stack>
                    ))
                  )}
                </Stack>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {t("availableLanguages")}
                </Typography>
                <Stack spacing={1}>
                  {assetsSorted.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      -
                    </Typography>
                  ) : (
                    assetsSorted.map((asset: any) => (
                      <Stack key={asset.id} direction="row" spacing={1} alignItems="center">
                        <Chip size="small" label={asset.lang.toUpperCase()} />
                        <Typography variant="body2" sx={{ flex: 1 }}>
                          {asset.original_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatBytes(asset.size)}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() =>
                            downloadMutation.mutate({ id: detailsId as number, lang: asset.lang, title: titleForLang(asset.lang) })
                          }
                        >
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    ))
                  )}
                </Stack>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsId(null)}>{t("cancel")}</Button>
        </DialogActions>
      </Dialog>
    </Page>
  );
}
