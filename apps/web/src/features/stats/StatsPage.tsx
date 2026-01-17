import React from "react";
import { Autocomplete, Grid, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { fetchTopFiles, fetchDownloadsByPeriod, fetchUserDownloads } from "./stats.api";
import { fetchUsers } from "../admin-users/users.api";
import { Page } from "../../shared/ui/Page";
import { StatCard } from "../../shared/ui/StatCard";
import { FiltersBar } from "../../shared/ui/FiltersBar";
import { DataTable } from "../../shared/ui/DataTable";
import { EmptyState } from "../../shared/ui/EmptyState";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useTranslation } from "react-i18next";
import { formatDateTime } from "../../shared/utils/date";

export default function StatsPage() {
  const { t } = useTranslation();
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [bucket, setBucket] = React.useState("day");
  const [userId, setUserId] = React.useState<number | null>(null);
  const [userSearch, setUserSearch] = React.useState("");

  const { data: top } = useQuery({
    queryKey: ["stats-top", from, to],
    queryFn: () => fetchTopFiles({ from: from || undefined, to: to || undefined })
  });

  const { data: period } = useQuery({
    queryKey: ["stats-period", from, to, bucket],
    queryFn: () => fetchDownloadsByPeriod({ from: from || undefined, to: to || undefined, bucket })
  });

  const { data: usersData } = useQuery({
    queryKey: ["users", "options", userSearch],
    queryFn: () => fetchUsers({ page: 1, pageSize: 50, q: userSearch })
  });

  const { data: userDownloads } = useQuery({
    queryKey: ["stats-user", userId, from, to],
    queryFn: () => fetchUserDownloads({ userId: userId as number, from: from || undefined, to: to || undefined }),
    enabled: !!userId
  });

  const topFiles = top?.data || [];
  const downloads = (period?.data || []).map((row: any) => ({
    bucket: row.bucket,
    count: Number(row.count)
  }));

  const userOptions = usersData?.data || [];

  return (
    <Page title={t("stats")} subtitle={t("statsSubtitle")}>
      <FiltersBar>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
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
          <TextField
            select
            size="small"
            label={t("bucket")}
            value={bucket}
            onChange={(event) => setBucket(event.target.value)}
          >
            <MenuItem value="day">{t("day")}</MenuItem>
            <MenuItem value="week">{t("week")}</MenuItem>
            <MenuItem value="month">{t("month")}</MenuItem>
          </TextField>
          <Autocomplete
            options={userOptions}
            getOptionLabel={(option: any) => option.login}
            value={userOptions.find((user: any) => user.id === userId) || null}
            isOptionEqualToValue={(option: any, value: any) => option.id === value.id}
            onChange={(_, value: any | null) => setUserId(value ? value.id : null)}
            onInputChange={(_, value) => setUserSearch(value)}
            renderInput={(params) => <TextField {...params} size="small" label={t("user")} />}
            sx={{ minWidth: 200 }}
          />
        </Stack>
      </FiltersBar>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}>
          <StatCard label={t("topFiles")} value={topFiles.length} />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard label={t("buckets")} value={downloads.length} />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard label={t("totalDownloads")} value={downloads.reduce((acc: number, row: any) => acc + row.count, 0)} />
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, mb: 2, borderRadius: 3, border: "1px solid var(--border)" }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          {t("downloadsByPeriod")}
        </Typography>
        {downloads.length === 0 ? (
          <EmptyState title={t("noData")} />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={downloads}>
              <XAxis dataKey="bucket" hide />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#1d4d4f" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Paper>

      <Paper sx={{ p: 2, mb: 2, borderRadius: 3, border: "1px solid var(--border)" }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          {t("topFiles")}
        </Typography>
        {topFiles.length === 0 ? (
          <EmptyState title={t("noData")} />
        ) : (
          <DataTable
            rows={topFiles}
            rowKey={(row: any) => row.file_item_id}
            columns={[
              { key: "title", label: t("title") },
              { key: "count", label: t("downloads") }
            ]}
          />
        )}
      </Paper>

      {userId && (
        <Paper sx={{ p: 2, borderRadius: 3, border: "1px solid var(--border)" }}>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            {t("userDownloads")}
          </Typography>
          {(userDownloads?.data || []).length === 0 ? (
            <EmptyState title={t("noData")} />
          ) : (
            <DataTable
              rows={userDownloads?.data || []}
              columns={[
                { key: "title", label: t("title") },
                { key: "created_at", label: t("time"), render: (row: any) => formatDateTime(row.created_at) }
              ]}
            />
          )}
        </Paper>
      )}
    </Page>
  );
}
