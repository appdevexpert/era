"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type PaginationState,
  type RowSelectionState,
  type VisibilityState,
} from "@tanstack/react-table";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  MoreHorizontalIcon,
  PencilEdit01Icon,
  Search01Icon,
  WrenchIcon,
} from "@hugeicons/core-free-icons";

import { DataTablePagination } from "@/components/admin/data-table-pagination";
import {
  DeleteConfirmDialog,
  DeleteMenuItem,
  type DeleteTarget,
} from "@/components/admin/delete-confirm-dialog";
import { EmptyState } from "@/components/admin/empty-state";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteProgram } from "@/lib/admin/actions";
import { dateText, translation } from "@/lib/admin/format";
import type { ProgramRow } from "@/lib/admin/types";

export function ProgramTable({ programs }: { programs: ProgramRow[] }) {
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const filteredPrograms = useMemo(() => {
    let rows = programs;
    if (search.trim()) {
      const needle = search.trim().toLowerCase();
      rows = rows.filter((p) => {
        const en = translation(p.title_translations, "en", p.title).toLowerCase();
        const nb = translation(p.title_translations, "nb", p.title).toLowerCase();
        return en.includes(needle) || nb.includes(needle);
      });
    }
    return rows;
  }, [programs, search]);

  const columns = useMemo<ColumnDef<ProgramRow>[]>(
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
        id: "title",
        header: "Program",
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div className="min-w-0">
              <Link
                href={`/programs/${p.id}`}
                className="font-medium text-foreground transition-colors hover:text-primary"
              >
                {translation(p.title_translations, "en", p.title)}
              </Link>
              <p className="truncate text-xs text-muted-foreground">
                {translation(p.title_translations, "nb", p.title)}
              </p>
            </div>
          );
        },
      },
      {
        id: "weekCount",
        header: "Weeks",
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">
            {row.original.weekCount ?? 0}
          </span>
        ),
      },
      {
        id: "dayCount",
        header: "Days",
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">
            {row.original.dayCount ?? 0}
          </span>
        ),
      },
      {
        id: "updated_at",
        header: "Updated",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{dateText(row.original.updated_at)}</span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableHiding: false,
        cell: ({ row }) => {
          const p = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon-sm">
                    <HugeiconsIcon
                      icon={MoreHorizontalIcon}
                      size={16}
                      strokeWidth={1.8}
                    />
                    <span className="sr-only">Program actions</span>
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem render={<Link href={`/programs/${p.id}`} />}>
                  <HugeiconsIcon icon={WrenchIcon} size={16} strokeWidth={1.8} />
                  Open builder
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link href={`/programs?edit=${p.id}`} />}>
                  <HugeiconsIcon icon={PencilEdit01Icon} size={16} strokeWidth={1.8} />
                  Edit
                </DropdownMenuItem>
                <DeleteMenuItem
                  onConfirm={() =>
                    setDeleteTarget({
                      name: translation(p.title_translations, "en", p.title),
                      type: "program",
                      action: deleteProgram,
                      formFields: { id: p.id },
                      description: `This will delete "${translation(p.title_translations, "en", p.title)}" and all its weeks, days, exercises, and sets. This cannot be undone.`,
                    })
                  }
                />
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [],
  );

  const table = useReactTable({
    data: filteredPrograms,
    columns,
    state: {
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const totalCount = filteredPrograms.length;
  const totalPages = Math.max(1, table.getPageCount());
  const currentPage = pagination.pageIndex + 1;

  if (!programs.length) {
    return (
      <EmptyState
        title="No programs yet"
        description="Create a 12-week program, then open the builder to add weeks, days, exercises, and sets."
      />
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-end gap-3">
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
              placeholder="Search programs..."
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
                  {search
                    ? `No programs match "${search}"`
                    : "No programs in this view."}
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
          rowLabel="program"
          onPageChange={(p) => table.setPageIndex(p - 1)}
          onPageSizeChange={(size) => table.setPageSize(size)}
        />
      </div>

      <DeleteConfirmDialog
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
