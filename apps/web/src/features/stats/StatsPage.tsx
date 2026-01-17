import React from "react";
import { Grid, Paper, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { fetchTopFiles, fetchDownloadsByPeriod } from "./stats.api";
import { Page } from "../../shared/ui/Page";
import { StatCard } from "../../shared/ui/StatCard";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function StatsPage() {
  const { data: top } = useQuery({ queryKey: ["stats-top"], queryFn: fetchTopFiles });
  const { data: period } = useQuery({ queryKey: ["stats-period"], queryFn: fetchDownloadsByPeriod });

  const topFiles = top?.data || [];
  const downloads = (period?.data || []).map((row: any) => ({
    bucket: row.bucket,
    count: Number(row.count)
  }));

  return (
    <Page title="Statistics">
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}>
          <StatCard label="Top files" value={topFiles.length} />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard label="Buckets" value={downloads.length} />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard label="Total downloads" value={downloads.reduce((acc: number, row: any) => acc + row.count, 0)} />
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          Downloads by period
        </Typography>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={downloads}>
            <XAxis dataKey="bucket" hide />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#0f766e" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          Top files
        </Typography>
        {topFiles.map((row: any) => (
          <Typography key={row.file_item_id} variant="body2">
            {row.title || `File ${row.file_item_id}`} - {row.count}
          </Typography>
        ))}
      </Paper>
    </Page>
  );
}
