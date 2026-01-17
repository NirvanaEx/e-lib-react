import React from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchSessions } from "./sessions.api";
import { DataTable } from "../../shared/ui/DataTable";
import { Page } from "../../shared/ui/Page";
import { EmptyState } from "../../shared/ui/EmptyState";

export default function SessionsPage() {
  const { data } = useQuery({ queryKey: ["sessions"], queryFn: () => fetchSessions({ page: 1, pageSize: 20 }) });
  const rows = data?.data || [];

  return (
    <Page title="Sessions">
      {rows.length === 0 ? (
        <EmptyState title="No sessions" />
      ) : (
        <DataTable
          rows={rows}
          columns={[
            { key: "login", label: "User" },
            { key: "ip", label: "IP" },
            { key: "user_agent", label: "User agent" },
            { key: "created_at", label: "Time" }
          ]}
        />
      )}
    </Page>
  );
}
