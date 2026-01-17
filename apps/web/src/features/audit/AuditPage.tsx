import React from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAudit } from "./audit.api";
import { DataTable } from "../../shared/ui/DataTable";
import { Page } from "../../shared/ui/Page";
import { EmptyState } from "../../shared/ui/EmptyState";

export default function AuditPage({ scope }: { scope: "admin" | "manage" }) {
  const { data } = useQuery({ queryKey: ["audit", scope], queryFn: () => fetchAudit(scope, { page: 1, pageSize: 20 }) });
  const rows = data?.data || [];

  return (
    <Page title="Audit log">
      {rows.length === 0 ? (
        <EmptyState title="No audit entries" />
      ) : (
        <DataTable
          rows={rows}
          columns={[
            { key: "action", label: "Action" },
            { key: "entity_type", label: "Entity" },
            { key: "entity_id", label: "Entity ID" },
            { key: "actor_login", label: "Actor" },
            { key: "created_at", label: "Time" }
          ]}
        />
      )}
    </Page>
  );
}
