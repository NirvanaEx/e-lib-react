import React from "react";
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { downloadUserFile, fetchMenu, fetchUserFile, fetchUserFiles, submitUserFile } from "./files.api";
import { DataTable } from "../../shared/ui/DataTable";
import { Page } from "../../shared/ui/Page";
import { EmptyState } from "../../shared/ui/EmptyState";
import { LoadingState } from "../../shared/ui/LoadingState";
import { FiltersBar } from "../../shared/ui/FiltersBar";
import { PaginationBar } from "../../shared/ui/PaginationBar";
import { SearchField } from "../../shared/ui/SearchField";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatBytes } from "../../shared/utils/format";
import { formatDateTime } from "../../shared/utils/date";
import { getFilenameFromDisposition } from "../../shared/utils/download";
import { useToast } from "../../shared/ui/ToastProvider";
import { useAuth } from "../../shared/hooks/useAuth";
import { buildPathMap, formatPath } from "../../shared/utils/tree";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const schema = z.object({
  sectionId: z.number().min(1),
  categoryId: z.number().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  lang: z.enum(["ru", "en", "uz"])
});

type FormValues = z.infer<typeof schema>;

const defaultValues: FormValues = {
  sectionId: 0,
  categoryId: 0,
  title: "",
  description: "",
  lang: "ru"
};

export default function UserFilesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
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
  const [submitOpen, setSubmitOpen] = React.useState(false);
  const [submitFile, setSubmitFile] = React.useState<File | null>(null);
  const sectionId = Number(searchParams.get("sectionId") || 0) || undefined;
  const categoryId = Number(searchParams.get("categoryId") || 0) || undefined;
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { user } = useAuth();
  const canSubmitFiles = Boolean(user?.canSubmitFiles);

  React.useEffect(() => {
    setPage(1);
  }, [search, pageSize, sort.key, sort.direction, sectionId, categoryId]);

  const resetFilters = () => {
    setSearch("");
    setSort({ key: null, direction: null });
    setPage(1);
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    reset
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues });

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
  const { data: detailsData, isLoading: detailsLoading } = useQuery({
    queryKey: ["user-file-details", detailsId],
    queryFn: () => fetchUserFile(detailsId as number),
    enabled: !!detailsId
  });
  const { data: menuData } = useQuery({ queryKey: ["user-menu-all"], queryFn: () => fetchMenu() });

  const rows = data?.data || [];
  const meta = data?.meta || { page, pageSize, total: 0 };
  const sections = menuData?.sections || [];
  const categories = menuData?.categories || [];
  const sortedSections = React.useMemo(() => {
    const items = [...sections];
    return items.sort((a: any, b: any) =>
      (a.title || `#${a.id}`).localeCompare(b.title || `#${b.id}`, undefined, {
        numeric: true,
        sensitivity: "base"
      })
    );
  }, [sections]);
  const categoryPathById = React.useMemo(
    () =>
      buildPathMap(
        categories,
        (item) => item.id,
        (item) => item.parentId ?? null,
        (item) => item.title || `#${item.id}`
      ),
    [categories]
  );
  const getCategoryPath = (id: number) => categoryPathById.get(id) || [`#${id}`];
  const sortedCategories = React.useMemo(() => {
    const items = [...categories];
    return items.sort((a: any, b: any) =>
      formatPath(getCategoryPath(a.id)).localeCompare(formatPath(getCategoryPath(b.id)), undefined, {
        numeric: true,
        sensitivity: "base"
      })
    );
  }, [categories, getCategoryPath]);
  const sectionsById = React.useMemo(() => new Map(sections.map((item: any) => [item.id, item])), [sections]);
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

  const submitMutation = useMutation({
    mutationFn: async ({ values, asset }: { values: FormValues; asset: File }) => {
      const form = new FormData();
      form.append("sectionId", String(values.sectionId));
      form.append("categoryId", String(values.categoryId));
      form.append("title", values.title.trim());
      if (values.description?.trim()) {
        form.append("description", values.description.trim());
      }
      form.append("lang", values.lang);
      form.append("file", asset);
      return submitUserFile(form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-files"] });
      setSubmitOpen(false);
      reset(defaultValues);
      setSubmitFile(null);
      showToast({ message: t("fileSubmitted"), severity: "success" });
    },
    onError: () => showToast({ message: t("actionFailed"), severity: "error" })
  });

  const handleSubmitFile = handleSubmit((values) => {
    if (!submitFile) {
      showToast({ message: t("fileRequired"), severity: "error" });
      return;
    }
    submitMutation.mutate({ values, asset: submitFile });
  });

  const handleOpenSubmit = () => {
    reset(defaultValues);
    setSubmitFile(null);
    setSubmitOpen(true);
  };

  const handleCloseSubmit = () => {
    setSubmitOpen(false);
    reset(defaultValues);
    setSubmitFile(null);
  };

  const resolveRowSize = (row: any) => {
    const sizes = row.availableAssetSizes || [];
    const currentLang = (i18n.language || "ru").split("-")[0];
    const direct = sizes.find((item: any) => item.lang === currentLang)?.size;
    if (direct !== undefined) return direct;
    if (sizes.length === 1) return sizes[0].size;
    return row.currentAssetSize ?? null;
  };

  return (
    <Page
      title={t("files")}
      subtitle={t("userFilesSubtitle")}
      action={
        canSubmitFiles ? (
          <Button variant="contained" onClick={handleOpenSubmit}>
            {t("submitFile")}
          </Button>
        ) : undefined
      }
    >
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
      ) : rows.length === 0 ? (
        <EmptyState title={t("noFiles")} subtitle={t("noFilesSubtitle")} />
      ) : (
        <DataTable
          rows={rows}
          onRowClick={(row) => setDetailsId(row.id)}
          sort={sort}
          onSortChange={(key, direction) =>
            setSort(direction ? { key, direction } : { key: null, direction: null })
          }
          sortIconVariant="chevron"
          columns={[
            {
              key: "title",
              label: t("title"),
              sortable: true,
              sortKey: "title",
              render: (row) => (
                <Box component="span" sx={{ color: "text.primary" }}>
                  {row.title || t("file")}
                </Box>
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
              render: (row) => (row.categoryId ? renderPath(getCategoryPath(row.categoryId)) : "-"),
              sortable: true,
              sortKey: "category"
            },
            {
              key: "accessType",
              label: t("access"),
              render: (row) => (
                <Chip
                  size="small"
                  variant="outlined"
                  sx={{
                    borderColor: row.accessType === "restricted" ? "warning.main" : "success.main",
                    color: row.accessType === "restricted" ? "warning.main" : "success.main",
                    fontWeight: 600
                  }}
                  label={row.accessType === "restricted" ? t("accessRestricted") : t("accessPublic")}
                />
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
              },
              sortable: true,
              sortKey: "size"
            },
            {
              key: "createdAt",
              label: t("createdAt"),
              render: (row) => formatDateTime(row.createdAt),
              sortable: true,
              sortKey: "created_at"
            },
            {
              key: "updatedAt",
              label: t("updatedAt"),
              render: (row) => formatDateTime(row.updatedAt),
              sortable: true,
              sortKey: "updated_at"
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
                    color={disabled ? "default" : "primary"}
                    sx={disabled ? undefined : { backgroundColor: "rgba(29, 77, 79, 0.12)" }}
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

      <Dialog open={submitOpen} onClose={handleCloseSubmit} fullWidth maxWidth="md">
        <DialogTitle>{t("submitFile")}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t("submitFileSubtitle")}
            </Typography>
            <Controller
              control={control}
              name="sectionId"
              render={({ field }) => (
                <Autocomplete
                  options={sortedSections}
                  getOptionLabel={(option: any) => option.title || `#${option.id}`}
                  renderOption={(props, option: any) => {
                    const { key, ...optionProps } = props;
                    return (
                      <li key={option.id} {...optionProps}>
                        {option.title || `#${option.id}`}
                      </li>
                    );
                  }}
                  value={sortedSections.find((section: any) => section.id === field.value) || null}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  onChange={(_, value) => field.onChange(value ? value.id : 0)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t("section")}
                      required
                      error={!!errors.sectionId}
                      helperText={errors.sectionId ? t("selectSectionError") : ""}
                    />
                  )}
                />
              )}
            />
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <Autocomplete
                  options={sortedCategories}
                  getOptionLabel={(option: any) => formatPath(getCategoryPath(option.id))}
                  renderOption={(props, option: any) => {
                    const { key, ...optionProps } = props;
                    return (
                      <li key={option.id} {...optionProps}>
                        {renderPath(getCategoryPath(option.id))}
                      </li>
                    );
                  }}
                  value={sortedCategories.find((cat: any) => cat.id === field.value) || null}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  onChange={(_, value) => field.onChange(value ? value.id : 0)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t("category")}
                      required
                      error={!!errors.categoryId}
                      helperText={errors.categoryId ? t("selectCategoryError") : ""}
                    />
                  )}
                />
              )}
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label={t("title")}
                fullWidth
                required
                {...register("title")}
                error={!!errors.title}
                helperText={errors.title?.message}
              />
              <Controller
                control={control}
                name="lang"
                render={({ field }) => (
                  <TextField select label={t("language")} sx={{ minWidth: 160 }} value={field.value} onChange={field.onChange}>
                    <MenuItem value="ru">RU</MenuItem>
                    <MenuItem value="en">EN</MenuItem>
                    <MenuItem value="uz">UZ</MenuItem>
                  </TextField>
                )}
              />
            </Stack>
            <TextField
              label={t("description")}
              fullWidth
              multiline
              minRows={2}
              {...register("description")}
            />
            <Stack spacing={1}>
              <Typography variant="subtitle2">{t("file")} *</Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
                <Button component="label" variant="outlined">
                  {t("selectFile")}
                  <input type="file" hidden onChange={(event) => setSubmitFile(event.target.files?.[0] || null)} />
                </Button>
                <Typography variant="caption" color="text.secondary">
                  {submitFile ? submitFile.name : t("noFileSelected")}
                </Typography>
              </Stack>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSubmit}>{t("cancel")}</Button>
          <Button variant="contained" onClick={handleSubmitFile} disabled={submitMutation.isPending}>
            {t("submitFile")}
          </Button>
        </DialogActions>
      </Dialog>

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
                            <Chip key={user.id} size="small" label={user.fullName || user.login} />
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
