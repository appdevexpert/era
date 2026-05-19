"use client";

import { useMemo, useRef, useState } from "react";

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type RowSelectionState,
  type VisibilityState,
} from "@tanstack/react-table";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  Crown02Icon,
  Search01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";

import { DataTablePagination } from "@/components/admin/data-table-pagination";
import { EmptyState } from "@/components/admin/empty-state";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { dateText } from "@/lib/admin/format";
import type { ProfileRow } from "@/lib/admin/types";

type RoleFilter = "all" | "user" | "owner" | "admin";

const ROLE_TABS: { value: RoleFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "user", label: "Users" },
  { value: "owner", label: "Owners" },
  { value: "admin", label: "Admins" },
];

export function UserTable({ users }: { users: ProfileRow[] }) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const filteredUsers = useMemo(() => {
    let rows = users;
    if (roleFilter !== "all") {
      rows = rows.filter((u) => u.role === roleFilter);
    }
    if (search.trim()) {
      const needle = search.trim().toLowerCase();
      rows = rows.filter((u) => {
        const name = (u.full_name ?? "").toLowerCase();
        const email = (u.email ?? "").toLowerCase();
        return name.includes(needle) || email.includes(needle);
      });
    }
    return rows;
  }, [users, roleFilter, search]);

  const columns = useMemo<ColumnDef<ProfileRow>[]>(
    () => [
      {
        id: "select",
        enableHiding: false,
        header: ({ table }) => {
          const allSelected = table.getIsAllPageRowsSelected();
          const someSelected = table.getIsSomePageRowsSelected();
          return (
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected && !allSelected}
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
              aria-label="Select all"
              className="translate-y-[2px]"
            />
          );
        },
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            className="translate-y-[2px]"
          />
        ),
      },
      {
        id: "user",
        header: "User",
        cell: ({ row }) => {
          const u = row.original;
          const display = u.full_name || "Unnamed user";
          const initial = (u.full_name || u.email || "?")
            .trim()
            .charAt(0)
            .toUpperCase();
          return (
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-era-gold-dark/15 text-xs font-medium text-primary">
                {u.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={u.avatar_url}
                    alt={display}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  initial
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{display}</p>
                <p className="truncate text-[10px] text-muted-foreground">{u.id}</p>
              </div>
            </div>
          );
        },
      },
      {
        id: "email",
        header: "Email",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.email ?? "—"}</span>
        ),
      },
      {
        id: "role",
        header: "Role",
        cell: ({ row }) => {
          const role = row.original.role;
          const isStaff = role === "owner" || role === "admin";
          return (
            <Badge
              variant={isStaff ? "default" : "secondary"}
              className="gap-1 capitalize"
            >
              <HugeiconsIcon
                icon={isStaff ? Crown02Icon : UserIcon}
                size={12}
                strokeWidth={2}
              />
              {role}
            </Badge>
          );
        },
      },
      {
        id: "assignments",
        header: "Assignments",
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">
            {row.original.active_assignment_count ?? 0}
          </span>
        ),
      },
      {
        id: "created_at",
        header: "Joined",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{dateText(row.original.created_at)}</span>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: filteredUsers,
    columns,
    state: {
      columnVisibility,
      rowSelection,
      pagination,
    },
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const totalCount = filteredUsers.length;
  const totalPages = Math.max(1, table.getPageCount());
  const currentPage = pagination.pageIndex + 1;

  if (!users.length) {
    return (
      <EmptyState
        title="No users found"
        description="Users will appear here after they sign up and profiles are created."
      />
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={roleFilter}
          onValueChange={(v) => {
            setRoleFilter(v as RoleFilter);
            setPagination((prev) => ({ ...prev, pageIndex: 0 }));
          }}
          className="min-w-0"
        >
          <TabsList>
            {ROLE_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <HugeiconsIcon
              icon={Search01Icon}
              size={14}
              strokeWidth={1.8}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              placeholder="Search users..."
              defaultValue={search}
              className="h-8 w-56 pl-8 text-sm"
              onChange={(e) => {
                if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
                const value = (e.target as HTMLInputElement).value;
                searchTimerRef.current = setTimeout(() => {
                  setSearch(value);
                  setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                }, 200);
              }}
            />
          </div>

        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader className="bg-muted/60">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="text-xs uppercase tracking-[0.12em]"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/50">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  {search ? `No users match "${search}"` : "No users in this view."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <DataTablePagination
          page={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pagination.pageSize}
          selectedCount={selectedCount}
          rowLabel="user"
          onPageChange={(p) => table.setPageIndex(p - 1)}
          onPageSizeChange={(size) => table.setPageSize(size)}
        />
      </div>
    </div>
  );
}
