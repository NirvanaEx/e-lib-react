import React from "react";
import { Autocomplete, Stack, TextField } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { fetchSessions } from "./sessions.api";
import { fetchUsers } from "../admin-users/users.api";
import { DataTable } from "../../shared/ui/DataTable";
import { Page } from "../../shared/ui/Page";
import { EmptyState } from "../../shared/ui/EmptyState";
import { LoadingState } from "../../shared/ui/LoadingState";
import { FiltersBar } from "../../shared/ui/FiltersBar";
import { PaginationBar } from "../../shared/ui/PaginationBar";
import { formatDateTime } from "../../shared/utils/date";
import { useTranslation } from "react-i18next";

export default function SessionsPage() {
  const { t } = useTranslation();
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [userId, setUserId] = React.useState<number | null>(null);
  const [userSearch, setUserSearch] = React.useState("");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");

  React.useEffect(() => {
    setPage(1);
  }, [userId, from, to, pageSize]);

  const { data, isLoading } = useQuery({
    queryKey: ["sessions", page, pageSize, userId, from, to],
    queryFn: () => fetchSessions({ page, pageSize, userId: userId || undefined, from: from || undefined, to: to || undefined })
  });

  const { data: usersData } = useQuery({
    queryKey: ["users", "options", userSearch],
    queryFn: () => fetchUsers({ page: 1, pageSize: 50, q: userSearch })
  });

  const rows = data?.data || [];
  const meta = data?.meta || { page, pageSize, total: 0 };
  const userOptions = usersData?.data || [];

  return (
    <Page title={t("sessions")} subtitle={t("sessionsSubtitle")}>
      <FiltersBar>
        <Autocomplete
          options={userOptions}
          getOptionLabel={(option: any) => `${option.login} ${option.surname || ""} ${option.name || ""}`.trim()}
          value={userOptions.find((user: any) => user.id === userId) || null}
          isOptionEqualToValue={(option: any, value: any) => option.id === value.id}
          onChange={(_, value: any | null) => setUserId(value ? value.id : null)}
          onInputChange={(_, value) => setUserSearch(value)}
          renderInput={(params) => <TextField {...params} size="small" label={t("user")} />}
          sx={{ minWidth: 240 }}
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
        <EmptyState title={t("sessionsEmpty")} subtitle={t("sessionsEmptySubtitle")} />
      ) : (
        <DataTable
          rows={rows}
          columns={[
            { key: "login", label: t("user") },
            { key: "ip", label: t("ip") },
            { key: "user_agent", label: t("userAgent") },
            {
              key: "created_at",
              label: t("time"),
              render: (row: any) => formatDateTime(row.created_at)
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
