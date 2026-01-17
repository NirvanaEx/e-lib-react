import React from "react";
import { Box, Grid, Paper, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { fetchUserFiles, fetchMenu } from "./files.api";
import { DataTable } from "../../shared/ui/DataTable";
import { Page } from "../../shared/ui/Page";
import { EmptyState } from "../../shared/ui/EmptyState";
import { useNavigate } from "react-router-dom";
import { LoadingState } from "../../shared/ui/LoadingState";

export default function UserFilesPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["user-files"], queryFn: () => fetchUserFiles({ page: 1, pageSize: 20 }) });
  const { data: menu } = useQuery({ queryKey: ["user-menu"], queryFn: () => fetchMenu() });

  const rows = data?.data || [];
  const sections = menu?.sections || [];
  const categories = menu?.categories || [];

  const categoriesBySection = categories.reduce((acc: any, cat: any) => {
    acc[cat.sectionId] = acc[cat.sectionId] || [];
    acc[cat.sectionId].push(cat);
    return acc;
  }, {});

  return (
    <Page title="Files">
      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, borderRadius: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Menu
            </Typography>
            {sections.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No sections
              </Typography>
            ) : (
              sections.map((section: any) => (
                <Box key={section.id} sx={{ mb: 1.5 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {section.title}
                  </Typography>
                  {(categoriesBySection[section.id] || []).map((cat: any) => (
                    <Typography key={cat.id} variant="body2" color="text.secondary">
                      {cat.title}
                    </Typography>
                  ))}
                </Box>
              ))
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={9}>
          {isLoading ? (
            <LoadingState />
          ) : rows.length === 0 ? (
            <EmptyState title="No files available" />
          ) : (
            <DataTable
              rows={rows}
              columns={[
                { key: "title", label: "Title" },
                {
                  key: "actions",
                  label: "Actions",
                  render: (row) => (
                    <Typography
                      sx={{ cursor: "pointer", color: "primary.main" }}
                      onClick={() => navigate(`/user/files/${row.id}`)}
                    >
                      Open
                    </Typography>
                  )
                }
              ]}
            />
          )}
        </Grid>
      </Grid>
    </Page>
  );
}
