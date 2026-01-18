import React from "react";
import {
  Autocomplete,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  IconButton,
  Stack,
  TextField,
  Tooltip
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useQuery } from "@tanstack/react-query";
import { fetchAudit } from "./audit.api";
import { fetchUsers } from "../admin-users/users.api";
import { DataTable } from "../../shared/ui/DataTable";
import { Page } from "../../shared/ui/Page";
import { EmptyState } from "../../shared/ui/EmptyState";
import { FiltersBar } from "../../shared/ui/FiltersBar";
import { PaginationBar } from "../../shared/ui/PaginationBar";
import { LoadingState } from "../../shared/ui/LoadingState";
import { formatDateTime } from "../../shared/utils/date";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../shared/hooks/useAuth";
import { hasAccess } from "../../shared/utils/access";

const actionOptions = [
  "FILE_CREATED",
  "FILE_UPDATED",
  "FILE_ACCESS_CHANGED",
  "FILE_VERSION_CREATED",
  "FILE_VERSION_SET_CURRENT",
  "FILE_ASSET_UPLOADED",
  "FILE_ASSET_DELETED",
  "FILE_VERSION_DELETED",
  "FILE_VERSION_RESTORED",
  "FILE_TRASHED",
  "FILE_RESTORED",
  "FILE_FORCE_DELETED",
  "SECTION_CREATED",
  "SECTION_UPDATED",
  "SECTION_DELETED",
  "CATEGORY_CREATED",
  "CATEGORY_UPDATED",
  "CATEGORY_DELETED",
  "DEPARTMENT_CREATED",
  "DEPARTMENT_UPDATED",
  "DEPARTMENT_DELETED",
  "USER_CREATED",
  "USER_UPDATED",
  "USER_DELETED",
  "USER_RESTORED",
  "USER_PASSWORD_RESET"
];

const entityOptions = ["FILE", "FILE_VERSION", "SECTION", "CATEGORY", "USER", "DEPARTMENT"];

export default function AuditPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [actorId, setActorId] = React.useState<number | null>(null);
  const [actorSearch, setActorSearch] = React.useState("");
  const [action, setAction] = React.useState<string | null>(null);
  const [entityType, setEntityType] = React.useState<string | null>(null);
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [selectedLog, setSelectedLog] = React.useState<any | null>(null);

  React.useEffect(() => {
    setPage(1);
  }, [actorId, action, entityType, from, to, pageSize]);

  const { data, isLoading } = useQuery({
    queryKey: ["audit", page, pageSize, actorId, action, entityType, from, to],
    queryFn: () =>
      fetchAudit({
        page,
        pageSize,
        actorId: actorId || undefined,
        action: action || undefined,
        entityType: entityType || undefined,
        from: from || undefined,
        to: to || undefined
      })
  });

  const canReadUsers = hasAccess(user, ["user.read"]);

  const { data: usersData } = useQuery({
    queryKey: ["users", "options", actorSearch],
    queryFn: () => fetchUsers({ page: 1, pageSize: 50, q: actorSearch }),
    enabled: canReadUsers
  });

  const rows = data?.data || [];
  const meta = data?.meta || { page, pageSize, total: 0 };
  const userOptions = canReadUsers ? usersData?.data || [] : [];

  return (
    <Page title={t("audit")} subtitle={t("auditSubtitle")}>
      <FiltersBar>
        <Autocomplete
          options={userOptions}
          getOptionLabel={(option: any) => option.login}
          value={userOptions.find((user: any) => user.id === actorId) || null}
          isOptionEqualToValue={(option: any, value: any) => option.id === value.id}
          onChange={(_, value: any | null) => setActorId(value ? value.id : null)}
          onInputChange={(_, value) => setActorSearch(value)}
          renderInput={(params) => <TextField {...params} size="small" label={t("actor")} />}
          sx={{ minWidth: 200 }}
        />
        <Autocomplete
          options={actionOptions}
          value={action}
          onChange={(_, value) => setAction(value)}
          isOptionEqualToValue={(option, value) => option === value}
          renderInput={(params) => <TextField {...params} size="small" label={t("action")} />}
          freeSolo
          sx={{ minWidth: 220 }}
        />
        <Autocomplete
          options={entityOptions}
          value={entityType}
          onChange={(_, value) => setEntityType(value)}
          isOptionEqualToValue={(option, value) => option === value}
          renderInput={(params) => <TextField {...params} size="small" label={t("entityType")} />}
          sx={{ minWidth: 180 }}
        />
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            type="date"
            size="small"
            label={t("from")}
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            type="date"
            size="small"
            label={t("to")}
            value={to}
            onChange={(event) => setTo(event.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Stack>
      </FiltersBar>

      {isLoading ? (
        <LoadingState rows={6} />
      ) : rows.length === 0 ? (
        <EmptyState title={t("auditEmpty")} subtitle={t("auditEmptySubtitle")} />
      ) : (
        <DataTable
          rows={rows}
          columns={[
            { key: "action", label: t("action") },
            { key: "entity_type", label: t("entityType") },
            { key: "entity_id", label: t("entityId") },
            { key: "actor_login", label: t("actor") },
            {
              key: "created_at",
              label: t("time"),
              render: (row: any) => formatDateTime(row.created_at)
            },
            {
              key: "view",
              label: t("details"),
              align: "right",
              sortable: false,
              render: (row: any) => (
                <Tooltip title={t("viewDetails")}>
                  <IconButton size="small" onClick={() => setSelectedLog(row)}>
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
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

      <Dialog open={!!selectedLog} onClose={() => setSelectedLog(null)} fullWidth maxWidth="md">
        <DialogTitle>{t("auditDetails")}</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <TextField label={t("action")} value={selectedLog?.action || ""} InputProps={{ readOnly: true }} />
            <TextField label={t("entityType")} value={selectedLog?.entity_type || ""} InputProps={{ readOnly: true }} />
            <TextField label={t("entityId")} value={selectedLog?.entity_id || ""} InputProps={{ readOnly: true }} />
            <TextField label={t("actor")} value={selectedLog?.actor_login || ""} InputProps={{ readOnly: true }} />
            <TextField label={t("ip")} value={selectedLog?.ip || ""} InputProps={{ readOnly: true }} />
            <TextField label={t("userAgent")} value={selectedLog?.user_agent || ""} InputProps={{ readOnly: true }} />
            <TextField
              label={t("diff")}
              value={selectedLog?.diff ? JSON.stringify(selectedLog.diff, null, 2) : "-"}
              multiline
              minRows={6}
              InputProps={{ readOnly: true }}
            />
            <TextField
              label={t("meta")}
              value={selectedLog?.meta ? JSON.stringify(selectedLog.meta, null, 2) : "-"}
              multiline
              minRows={4}
              InputProps={{ readOnly: true }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedLog(null)}>{t("close")}</Button>
        </DialogActions>
      </Dialog>
    </Page>
  );
}
