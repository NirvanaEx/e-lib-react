import React from "react";
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DeleteIcon from "@mui/icons-material/Delete";
import RestoreFromTrashIcon from "@mui/icons-material/RestoreFromTrash";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchFile,
  fetchVersions,
  createVersion,
  setCurrentVersion,
  uploadAsset,
  updateFile,
  updateAccess,
  deleteVersion,
  restoreVersion,
  deleteAsset
} from "./files.api";
import { fetchSections } from "../sections/sections.api";
import { fetchCategories } from "../categories/categories.api";
import { fetchDepartmentOptions } from "../departments/departments.api";
import { fetchUserOptions } from "../admin-users/users.api";
import { Page } from "../../shared/ui/Page";
import { TranslationsEditor } from "../../shared/ui/TranslationsEditor";
import { ConfirmDialog } from "../../shared/ui/ConfirmDialog";
import { useToast } from "../../shared/ui/ToastProvider";
import { useTranslation } from "react-i18next";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatDateTime } from "../../shared/utils/date";
import { formatBytes } from "../../shared/utils/format";
import { getErrorMessage } from "../../shared/utils/errors";
import { buildPathMap, formatPath } from "../../shared/utils/tree";

const metadataSchema = z.object({
  sectionId: z.number().min(1),
  categoryId: z.number().min(1)
});

type MetadataForm = z.infer<typeof metadataSchema>;

type AccessForm = {
  accessType: "public" | "restricted";
  accessDepartmentIds: number[];
  accessUserIds: number[];
};

type CategoryOption = { id: number; title?: string | null; parentId?: number | null };
type DepartmentOption = { id: number; name: string; parent_id?: number | null };

type FileDetailsPanelProps = {
  fileId: number;
  variant?: "page" | "dialog";
};

export function FileDetailsPanel({ fileId, variant = "page" }: FileDetailsPanelProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [tab, setTab] = React.useState(0);
  const [translations, setTranslations] = React.useState<any[]>([]);
  const [comment, setComment] = React.useState("");
  const [copyFromCurrent, setCopyFromCurrent] = React.useState(false);
  const [uploadState, setUploadState] = React.useState<Record<number, { lang: string; file: File | null }>>({});
  const [confirmVersion, setConfirmVersion] = React.useState<null | { type: "delete" | "restore"; versionId: number }>(null);
  const [confirmAsset, setConfirmAsset] = React.useState<null | { versionId: number; assetId: number }>(null);

  const { data: file } = useQuery({ queryKey: ["file", fileId], queryFn: () => fetchFile(fileId) });
  const { data: versions } = useQuery({ queryKey: ["versions", fileId], queryFn: () => fetchVersions(fileId) });

  const { data: sectionsData } = useQuery({
    queryKey: ["sections", "options", 200],
    queryFn: () => fetchSections({ page: 1, pageSize: 200 })
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["categories", "options", 500],
    queryFn: () => fetchCategories({ page: 1, pageSize: 500 })
  });

  const { data: departmentsData } = useQuery({
    queryKey: ["departments", "options", 200],
    queryFn: () => fetchDepartmentOptions({ page: 1, pageSize: 200 })
  });

  const { data: usersData } = useQuery({
    queryKey: ["users", "options", "file-access"],
    queryFn: () => fetchUserOptions({ page: 1, pageSize: 100 })
  });

  const sections = sectionsData?.data || [];
  const categories: CategoryOption[] = categoriesData?.data || [];
  const departments: DepartmentOption[] = departmentsData?.data || [];
  const users = usersData?.data || [];

  const metadataForm = useForm<MetadataForm>({
    resolver: zodResolver(metadataSchema),
    defaultValues: { sectionId: 0, categoryId: 0 }
  });

  const accessForm = useForm<AccessForm>({
    defaultValues: { accessType: "public", accessDepartmentIds: [], accessUserIds: [] }
  });

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

  const departmentPathById = React.useMemo(
    () =>
      buildPathMap(
        departments,
        (item) => item.id,
        (item) => item.parent_id ?? null,
        (item) => item.name
      ),
    [departments]
  );

  const getCategoryPath = (id: number) => categoryPathById.get(id) || [`#${id}`];
  const getDepartmentPath = (id: number) => departmentPathById.get(id) || [`#${id}`];

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

  React.useEffect(() => {
    if (file) {
      metadataForm.reset({
        sectionId: file.sectionId,
        categoryId: file.categoryId
      });
      accessForm.reset({
        accessType: file.accessType,
        accessDepartmentIds: file.accessDepartmentIds || [],
        accessUserIds: file.accessUserIds || []
      });
      setTranslations(file.translations || []);
    }
  }, [file, metadataForm, accessForm]);

  const updateMetadataMutation = useMutation({
    mutationFn: (payload: any) => updateFile(fileId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["file", fileId] });
      queryClient.invalidateQueries({ queryKey: ["files"] });
      showToast({ message: t("fileUpdated"), severity: "success" });
    },
    onError: (error) => showToast({ message: getErrorMessage(error, t("actionFailed")), severity: "error" })
  });

  const updateAccessMutation = useMutation({
    mutationFn: (payload: any) => updateAccess(fileId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["file", fileId] });
      queryClient.invalidateQueries({ queryKey: ["files"] });
      showToast({ message: t("accessUpdated"), severity: "success" });
    },
    onError: (error) => showToast({ message: getErrorMessage(error, t("actionFailed")), severity: "error" })
  });

  const createVersionMutation = useMutation({
    mutationFn: () => createVersion(fileId, { comment, copyFromCurrent }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["versions", fileId] });
      setComment("");
      setCopyFromCurrent(false);
      showToast({ message: t("versionCreated"), severity: "success" });
    },
    onError: (error) => showToast({ message: getErrorMessage(error, t("actionFailed")), severity: "error" })
  });

  const setCurrentMutation = useMutation({
    mutationFn: (versionId: number) => setCurrentVersion(fileId, { versionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["file", fileId] });
      queryClient.invalidateQueries({ queryKey: ["files"] });
      showToast({ message: t("currentVersionUpdated"), severity: "success" });
    },
    onError: (error) => showToast({ message: getErrorMessage(error, t("actionFailed")), severity: "error" })
  });

  const deleteVersionMutation = useMutation({
    mutationFn: (versionId: number) => deleteVersion(fileId, versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["versions", fileId] });
      showToast({ message: t("versionDeleted"), severity: "success" });
    },
    onError: (error) => showToast({ message: getErrorMessage(error, t("actionFailed")), severity: "error" })
  });

  const restoreVersionMutation = useMutation({
    mutationFn: (versionId: number) => restoreVersion(fileId, versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["versions", fileId] });
      showToast({ message: t("versionRestored"), severity: "success" });
    },
    onError: (error) => showToast({ message: getErrorMessage(error, t("actionFailed")), severity: "error" })
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ versionId, lang, file }: { versionId: number; lang: string; file: File }) => {
      const form = new FormData();
      form.append("lang", lang);
      form.append("file", file);
      return uploadAsset(fileId, versionId, form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["versions", fileId] });
      queryClient.invalidateQueries({ queryKey: ["files"] });
      showToast({ message: t("assetUploaded"), severity: "success" });
    },
    onError: (error) => showToast({ message: getErrorMessage(error, t("actionFailed")), severity: "error" })
  });

  const deleteAssetMutation = useMutation({
    mutationFn: ({ versionId, assetId }: { versionId: number; assetId: number }) => deleteAsset(fileId, versionId, assetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["versions", fileId] });
      queryClient.invalidateQueries({ queryKey: ["files"] });
      showToast({ message: t("assetDeleted"), severity: "success" });
    },
    onError: (error) => showToast({ message: getErrorMessage(error, t("actionFailed")), severity: "error" })
  });

  const handleUpload = (versionId: number) => {
    const current = uploadState[versionId];
    if (!current?.file || !current?.lang) return;
    uploadMutation.mutate({ versionId, lang: current.lang, file: current.file });
  };

  const handleSaveMetadata = metadataForm.handleSubmit((values) => {
    if (!values.sectionId) {
      showToast({ message: t("selectSectionError"), severity: "error" });
      return;
    }
    if (!values.categoryId) {
      showToast({ message: t("selectCategoryError"), severity: "error" });
      return;
    }

    const normalizedTranslations = translations
      .map((item) => ({
        lang: item.lang,
        title: (item.title || "").trim(),
        description: (item.description || "").trim() || null
      }))
      .filter((item) => item.title.length > 0);

    if (normalizedTranslations.length === 0) {
      showToast({ message: t("translationsRequired"), severity: "error" });
      return;
    }

    updateMetadataMutation.mutate({
      sectionId: Number(values.sectionId),
      categoryId: Number(values.categoryId),
      translations: normalizedTranslations
    });
  });

  const handleSaveAccess = accessForm.handleSubmit((values) => {
    updateAccessMutation.mutate({
      accessType: values.accessType,
      accessDepartmentIds: values.accessType === "restricted" ? values.accessDepartmentIds : [],
      accessUserIds: values.accessType === "restricted" ? values.accessUserIds : []
    });
  });

  const content = (
    <>
      <Paper sx={{ p: 2, mb: 2, borderRadius: 3, border: "1px solid var(--border)" }}>
        <Tabs value={tab} onChange={(_, value) => setTab(value)}>
          <Tab label={t("metadata")} />
          <Tab label={t("access")} />
          <Tab label={t("versions")} />
        </Tabs>
      </Paper>

      {tab === 0 && (
        <Stack spacing={2}>
          <Paper sx={{ p: 2, borderRadius: 3, border: "1px solid var(--border)" }}>
            <Stack spacing={2}>
              <Controller
                control={metadataForm.control}
                name="sectionId"
                render={({ field }) => (
                  <Autocomplete
                    options={sections}
                    getOptionLabel={(option) => option.title || `#${option.id}`}
                    renderOption={(props, option) => {
                      const { key, ...optionProps } = props;
                      return (
                        <li key={option.id} {...optionProps}>
                          {option.title || `#${option.id}`}
                        </li>
                      );
                    }}
                    value={sections.find((section: any) => section.id === field.value) || null}
                    isOptionEqualToValue={(option: any, value: any) => option.id === value.id}
                    onChange={(_, value: any | null) => field.onChange(value ? value.id : 0)}
                    renderInput={(params) => <TextField {...params} label={t("section")} required />}
                  />
                )}
              />
              <Controller
                control={metadataForm.control}
                name="categoryId"
                render={({ field }) => (
                  <Autocomplete
                    options={categories}
                    getOptionLabel={(option) => formatPath(getCategoryPath(option.id))}
                    renderOption={(props, option) => {
                      const { key, ...optionProps } = props;
                      return (
                        <li key={option.id} {...optionProps}>
                          {renderPath(getCategoryPath(option.id))}
                        </li>
                      );
                    }}
                    value={categories.find((cat: any) => cat.id === field.value) || null}
                    isOptionEqualToValue={(option: any, value: any) => option.id === value.id}
                    onChange={(_, value: any | null) => field.onChange(value ? value.id : 0)}
                    renderInput={(params) => <TextField {...params} label={t("category")} required />}
                  />
                )}
              />
              <TranslationsEditor
                value={translations}
                onChange={setTranslations}
                showDescription
                titleLabel={t("title")}
                descriptionLabel={t("description")}
                helperText={t("translationsHint")}
                requiredTitle
              />
              <Button variant="contained" onClick={handleSaveMetadata} disabled={updateMetadataMutation.isPending}>
                {t("saveChanges")}
              </Button>
            </Stack>
          </Paper>
        </Stack>
      )}

      {tab === 1 && (
        <Paper sx={{ p: 2, borderRadius: 3, border: "1px solid var(--border)" }}>
          <Stack spacing={2}>
            <Controller
              control={accessForm.control}
              name="accessType"
              render={({ field }) => (
                <TextField select label={t("access")} value={field.value} onChange={(event) => field.onChange(event.target.value)}>
                  <MenuItem value="public">{t("accessPublic")}</MenuItem>
                  <MenuItem value="restricted">{t("accessRestricted")}</MenuItem>
                </TextField>
              )}
            />
            {accessForm.watch("accessType") === "restricted" && (
              <Stack spacing={2}>
                <Controller
                  control={accessForm.control}
                  name="accessDepartmentIds"
                  render={({ field }) => (
                    <Autocomplete
                      multiple
                      options={departments}
                      getOptionLabel={(option: DepartmentOption) => formatPath(getDepartmentPath(option.id))}
                      renderOption={(props, option: any) => {
                        const { key, ...optionProps } = props;
                        return (
                          <li key={option.id} {...optionProps}>
                            {renderPath(getDepartmentPath(option.id))}
                          </li>
                        );
                      }}
                      value={departments.filter((dept) => field.value.includes(dept.id))}
                      isOptionEqualToValue={(option, value) => option.id === value.id}
                      onChange={(_, value) => field.onChange(value.map((item) => item.id))}
                      renderInput={(params) => <TextField {...params} label={t("allowedDepartments")} />}
                    />
                  )}
                />
                <Controller
                  control={accessForm.control}
                  name="accessUserIds"
                  render={({ field }) => (
                    <Autocomplete
                      multiple
                      options={users}
                      getOptionLabel={(option: any) => option.login}
                      renderOption={(props, option: any) => {
                        const { key, ...optionProps } = props;
                        return (
                          <li key={option.id} {...optionProps}>
                            {option.login}
                          </li>
                        );
                      }}
                      value={users.filter((user: any) => field.value.includes(user.id))}
                      isOptionEqualToValue={(option: any, value: any) => option.id === value.id}
                      onChange={(_, value) => field.onChange(value.map((item: any) => item.id))}
                      renderInput={(params) => <TextField {...params} label={t("allowedUsers")} />}
                    />
                  )}
                />
              </Stack>
            )}
            <Button variant="contained" onClick={handleSaveAccess} disabled={updateAccessMutation.isPending}>
              {t("saveChanges")}
            </Button>
          </Stack>
        </Paper>
      )}

      {tab === 2 && (
        <Stack spacing={2}>
          <Paper sx={{ p: 2, borderRadius: 3, border: "1px solid var(--border)" }}>
            <Stack spacing={2}>
              <TextField
                label={t("versionComment")}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
              />
              <FormControlLabel
                control={<Switch checked={copyFromCurrent} onChange={(event) => setCopyFromCurrent(event.target.checked)} />}
                label={t("copyAssetsFromCurrent")}
              />
              <Button variant="contained" onClick={() => createVersionMutation.mutate()} disabled={createVersionMutation.isPending}>
                {t("createVersion")}
              </Button>
            </Stack>
          </Paper>

          <Stack spacing={2}>
            {(versions?.data || []).map((version: any) => (
              <Paper key={version.id} sx={{ p: 2, borderRadius: 3, border: "1px solid var(--border)" }}>
                <Stack spacing={2}>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
                    <Stack spacing={0.5} sx={{ flex: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="h6">v{version.version_number}</Typography>
                        {file?.currentVersionId === version.id && (
                          <Chip icon={<CheckCircleIcon />} size="small" color="success" label={t("current")} />
                        )}
                        {version.deleted_at && <Chip size="small" color="warning" label={t("deleted")} />}
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        {version.comment || t("noComment")}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDateTime(version.created_at)}
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1}>
                      {!version.deleted_at && file?.currentVersionId !== version.id && (
                        <Button size="small" onClick={() => setCurrentMutation.mutate(version.id)}>
                          {t("setCurrent")}
                        </Button>
                      )}
                      {!version.deleted_at ? (
                        <Tooltip title={t("delete")}>
                          <IconButton size="small" color="error" onClick={() => setConfirmVersion({ type: "delete", versionId: version.id })}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title={t("restore")}>
                          <IconButton size="small" onClick={() => setConfirmVersion({ type: "restore", versionId: version.id })}>
                            <RestoreFromTrashIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </Stack>

                  <Divider />

                  <Stack spacing={1}>
                    {(version.assets || []).length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        {t("noAssets")}
                      </Typography>
                    ) : (
                      (version.assets || []).map((asset: any) => (
                        <Stack key={asset.id} direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Chip size="small" label={asset.lang.toUpperCase()} />
                            <Typography variant="body2">{asset.originalName}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatBytes(asset.size)}
                            </Typography>
                          </Stack>
                          <Tooltip title={t("delete")}>
                            <IconButton size="small" color="error" onClick={() => setConfirmAsset({ versionId: version.id, assetId: asset.id })}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      ))
                    )}
                  </Stack>

                  <Divider />

                  <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
                    <TextField
                      select
                      label={t("language")}
                      value={uploadState[version.id]?.lang || "ru"}
                      onChange={(event) =>
                        setUploadState((prev) => ({
                          ...prev,
                          [version.id]: { lang: event.target.value, file: prev[version.id]?.file || null }
                        }))
                      }
                      sx={{ minWidth: 120 }}
                    >
                      <MenuItem value="ru">RU</MenuItem>
                      <MenuItem value="en">EN</MenuItem>
                      <MenuItem value="uz">UZ</MenuItem>
                    </TextField>
                    <Button component="label" variant="outlined" startIcon={<UploadFileIcon />}>
                      {t("selectFile")}
                      <input
                        type="file"
                        hidden
                        onChange={(event) =>
                          setUploadState((prev) => ({
                            ...prev,
                            [version.id]: { lang: prev[version.id]?.lang || "ru", file: event.target.files?.[0] || null }
                          }))
                        }
                      />
                    </Button>
                    <Button
                      variant="contained"
                      onClick={() => handleUpload(version.id)}
                      disabled={!uploadState[version.id]?.file || uploadMutation.isPending}
                    >
                      {t("upload")}
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Stack>
      )}

      <ConfirmDialog
        open={!!confirmVersion}
        title={confirmVersion?.type === "delete" ? t("confirmDelete") : t("confirmRestore")}
        description={confirmVersion?.type === "delete" ? t("confirmDeleteVersion") : t("confirmRestoreVersion")}
        confirmLabel={confirmVersion?.type === "delete" ? t("delete") : t("restore")}
        onConfirm={() => {
          if (!confirmVersion) return;
          if (confirmVersion.type === "delete") {
            deleteVersionMutation.mutate(confirmVersion.versionId);
          } else {
            restoreVersionMutation.mutate(confirmVersion.versionId);
          }
          setConfirmVersion(null);
        }}
        onCancel={() => setConfirmVersion(null)}
      />

      <ConfirmDialog
        open={!!confirmAsset}
        title={t("confirmDelete")}
        description={t("confirmDeleteAsset")}
        confirmLabel={t("delete")}
        onConfirm={() => {
          if (confirmAsset) {
            deleteAssetMutation.mutate({ versionId: confirmAsset.versionId, assetId: confirmAsset.assetId });
            setConfirmAsset(null);
          }
        }}
        onCancel={() => setConfirmAsset(null)}
      />
    </>
  );

  if (variant === "page") {
    return (
      <Page
        title={file?.title || t("fileDetails")}
        subtitle={t("fileDetailsSubtitle")}
        action={
          <Stack direction="row" spacing={1} alignItems="center">
            {file?.availableLangs?.map((lang: string) => (
              <Chip key={lang} size="small" label={lang.toUpperCase()} />
            ))}
          </Stack>
        }
      >
        {content}
      </Page>
    );
  }

  return (
    <Box sx={{ width: "100%" }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: { md: "center" },
          justifyContent: "space-between",
          gap: 2,
          mb: 3
        }}
      >
        <Box>
          <Typography variant="h5">{file?.title || t("fileDetails")}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {t("fileDetailsSubtitle")}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          {file?.availableLangs?.map((lang: string) => (
            <Chip key={lang} size="small" label={lang.toUpperCase()} />
          ))}
        </Stack>
      </Box>
      {content}
    </Box>
  );
}
