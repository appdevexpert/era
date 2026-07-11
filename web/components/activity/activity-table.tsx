"use client";

import { useMemo, useRef, useState } from "react";

import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";

import { DataTablePagination } from "@/components/admin/data-table-pagination";
import { EmptyState } from "@/components/admin/empty-state";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { dateText, relativeTimeText } from "@/lib/admin/format";
import type { AuditLogRow } from "@/lib/admin/types";

type ActionFilter = "all" | "create" | "update" | "delete";

const ACTION_TABS: { value: ActionFilter; label: string }[] = [
  { value: "all", label: "All actions" },
  { value: "create", label: "Created" },
  { value: "update", label: "Updated" },
  { value: "delete", label: "Deleted" },
];

const ACTION_STYLE: Record<string, string> = {
  create: "bg-emerald-500/15 text-emerald-500",
  update: "bg-era-gold-dark/15 text-era-gold-dark",
  delete: "bg-destructive/15 text-destructive",
};

const ACTION_LABEL: Record<string, string> = {
  create: "Created",
  update: "Updated",
  delete: "Deleted",
};

function ActionPill({ action }: { action: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
        ACTION_STYLE[action] ?? "bg-muted text-muted-foreground"
      }`}
    >
      {ACTION_LABEL[action] ?? action}
    </span>
  );
}

export function ActivityTable({ entries }: { entries: AuditLogRow[] }) {
  const [adminFilter, setAdminFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<ActionFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  // The set of admins that actually appear in the log, for the filter tabs.
  const admins = useMemo(() => {
    const byId = new Map<string, string>();
    for (const entry of entries) {
      if (!byId.has(entry.admin_id)) byId.set(entry.admin_id, entry.admin_name);
    }
    return Array.from(byId, ([id, name]) => ({ id, name }));
  }, [entries]);

  const filtered = useMemo(() => {
    let rows = entries;
    if (adminFilter !== "all") {
      rows = rows.filter((entry) => entry.admin_id === adminFilter);
    }
    if (actionFilter !== "all") {
      rows = rows.filter((entry) => entry.action === actionFilter);
    }
    if (search.trim()) {
      const needle = search.trim().toLowerCase();
      rows = rows.filter((entry) => {
        return (
          entry.summary.toLowerCase().includes(needle) ||
          entry.entity.toLowerCase().includes(needle) ||
          entry.table_name.toLowerCase().includes(needle) ||
          (entry.record_id ?? "").toLowerCase().includes(needle)
        );
      });
    }
    return rows;
  }, [entries, adminFilter, actionFilter, search]);

  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  if (!entries.length) {
    return (
      <EmptyState
        title="No activity yet"
        description="Every create, update, and delete made from this panel will show up here — who did it, what changed, and when."
      />
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={adminFilter}
          onValueChange={(v) => {
            setAdminFilter(v);
            setPage(1);
          }}
          className="min-w-0"
        >
          <TabsList>
            <TabsTrigger value="all">Everyone</TabsTrigger>
            {admins.map((admin) => (
              <TabsTrigger key={admin.id} value={admin.id}>
                {admin.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap items-center gap-2">
          <Tabs
            value={actionFilter}
            onValueChange={(v) => {
              setActionFilter(v as ActionFilter);
              setPage(1);
            }}
            className="min-w-0"
          >
            <TabsList>
              {ACTION_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="relative">
            <HugeiconsIcon
              icon={Search01Icon}
              size={14}
              strokeWidth={1.8}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              placeholder="Search changes..."
              defaultValue={search}
              className="h-8 w-56 pl-8 text-sm"
              onChange={(e) => {
                if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
                const value = (e.target as HTMLInputElement).value;
                searchTimerRef.current = setTimeout(() => {
                  setSearch(value);
                  setPage(1);
                }, 200);
              }}
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/60">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs uppercase tracking-[0.12em]">Who</TableHead>
                <TableHead className="text-xs uppercase tracking-[0.12em]">Action</TableHead>
                <TableHead className="text-xs uppercase tracking-[0.12em]">What changed</TableHead>
                <TableHead className="text-xs uppercase tracking-[0.12em]">Table</TableHead>
                <TableHead className="text-xs uppercase tracking-[0.12em]">When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length ? (
                pageRows.map((entry) => {
                  const initial = (entry.admin_name || "?")
                    .trim()
                    .charAt(0)
                    .toUpperCase();
                  return (
                    <TableRow key={entry.id} className="hover:bg-muted/50">
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-era-gold-dark/15 text-xs font-medium text-primary">
                            {initial}
                          </span>
                          <span className="font-medium text-foreground">
                            {entry.admin_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <ActionPill action={entry.action} />
                      </TableCell>
                      <TableCell className="py-3">
                        <p className="text-foreground">{entry.summary}</p>
                        {entry.record_id ? (
                          <p className="truncate text-[10px] text-muted-foreground">
                            {entry.record_id}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="py-3">
                        <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                          {entry.table_name}
                        </code>
                      </TableCell>
                      <TableCell className="py-3">
                        <span
                          className="text-muted-foreground"
                          title={dateText(entry.created_at)}
                        >
                          {relativeTimeText(entry.created_at)}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No activity matches this filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <DataTablePagination
          page={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          rowLabel="change"
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>
    </div>
  );
}
