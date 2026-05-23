"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type VisibilityState,
} from "@tanstack/react-table";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle01Icon,
  MoreHorizontalIcon,
  PauseCircleIcon,
  PencilEdit01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";

import { DataTablePagination } from "@/components/admin/data-table-pagination";
import {
  DeleteConfirmDialog,
  DeleteMenuItem,
  type DeleteTarget,
} from "@/components/admin/delete-confirm-dialog";
import { EmptyState } from "@/components/admin/empty-state";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { deleteMealLibraryItem } from "@/lib/admin/actions";
import { dateText, numberText, translation } from "@/lib/admin/format";
import type { MealLibraryRow } from "@/lib/admin/types";

type StatusFilter = "all" | "active" | "inactive";

type Props = {
  items: MealLibraryRow[];
  page?: number;
  pageSize?: number;
  totalPages?: number;
  totalCount?: number;
  search?: string;
  statusFilter?: StatusFilter;
};

function formatCategory(category: string) {
  return category
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function MealLibraryTable({
  items,
  page = 1,
  pageSize = 10,
  totalPages = 1,
  totalCount = 0,
  search = "",
  statusFilter = "all",
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  function buildHref(overrides: Partial<{
    page: number;
    pageSize: number;
    search: string;
    status: StatusFilter;
  }>) {
    const params = new URLSearchParams(searchParams.toString());
    const next = {
      page: overrides.page ?? page,
      pageSize: overrides.pageSize ?? pageSize,
      search: overrides.search ?? search,
      status: overrides.status ?? statusFilter,
    };
    if (next.page > 1) params.set("page", String(next.page));
    else params.delete("page");
    if (next.pageSize !== 10) params.set("pageSize", String(next.pageSize));
    else params.delete("pageSize");
    if (next.search) params.set("search", next.search);
    else params.delete("search");
    if (next.status !== "all") params.set("status", next.status);
    else params.delete("status");
    params.delete("edit");
    const qs = params.toString();
    return `/nutrition/library${qs ? `?${qs}` : ""}`;
  }

  function pushSearch(term: string) {
    router.push(buildHref({ page: 1, search: term }));
  }

  function pushStatus(next: StatusFilter) {
    router.push(buildHref({ page: 1, status: next }));
  }

  function pushPage(next: number) {
    router.push(buildHref({ page: next }));
  }

  function pushPageSize(next: number) {
    router.push(buildHref({ page: 1, pageSize: next }));
  }

  const columns = useMemo<ColumnDef<MealLibraryRow>[]>(
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
        id: "name_en",
        header: "Meal",
        cell: ({ row }) => {
          const it = row.original;
          return (
            <div className="min-w-0">
              <Link
                href={`/nutrition/library?edit=${it.id}`}
                className="font-medium text-foreground transition-colors hover:text-primary"
              >
                {translation(it.name_translations, "en", it.slug)}
              </Link>
              <p className="truncate text-xs text-muted-foreground">{it.slug}</p>
            </div>
          );
        },
      },
      {
        id: "name_nb",
        header: "Norwegian",
        cell: ({ row }) =>
          translation(row.original.name_translations, "nb", "—"),
      },
      {
        id: "category",
        header: "Category",
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className="border-border bg-transparent text-muted-foreground"
          >
            {formatCategory(row.original.category)}
          </Badge>
        ),
      },
      {
        id: "macros",
        header: "Macros",
        cell: ({ row }) => {
          const it = row.original;
          return (
            <span className="text-xs text-muted-foreground">
              <span className="text-foreground">{numberText(it.kcal)}</span>{" "}
              kcal · {numberText(it.protein_g)}P · {numberText(it.carbs_g)}C ·{" "}
              {numberText(it.fats_g)}F
            </span>
          );
        },
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className="gap-1.5 border-border bg-transparent text-muted-foreground"
          >
            <HugeiconsIcon
              icon={
                row.original.is_active
                  ? CheckmarkCircle01Icon
                  : PauseCircleIcon
              }
              size={12}
              strokeWidth={2}
              className={
                row.original.is_active
                  ? "text-era-success"
                  : "text-muted-foreground"
              }
            />
            {row.original.is_active ? "Active" : "Inactive"}
          </Badge>
        ),
      },
      {
        id: "updated_at",
        header: "Updated",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {dateText(row.original.updated_at)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableHiding: false,
        cell: ({ row }) => {
          const it = row.original;
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
                    <span className="sr-only">Meal actions</span>
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  render={<Link href={`/nutrition/library?edit=${it.id}`} />}
                >
                  <HugeiconsIcon
                    icon={PencilEdit01Icon}
                    size={16}
                    strokeWidth={1.8}
                  />
                  Edit
                </DropdownMenuItem>
                {it.is_active ? (
                  <DeleteMenuItem
                    onConfirm={() =>
                      setDeleteTarget({
                        name: translation(it.name_translations, "en", it.slug),
                        type: "meal",
                        action: deleteMealLibraryItem,
                        formFields: { id: it.id },
                      })
                    }
                  />
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [],
  );

  const table = useReactTable({
    data: items,
    columns,
    state: { columnVisibility, rowSelection },
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
  });

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  if (!items.length && page === 1 && !search && statusFilter === "all") {
    return (
      <EmptyState
        title="No meals yet"
        description="Add the first meal to start authoring your meal programs."
      />
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={statusFilter}
          onValueChange={(v) => pushStatus(v as StatusFilter)}
          className="min-w-0"
        >
          <TabsList>
            <TabsTrigger value="all">
              All
              {statusFilter === "all" ? (
                <Badge
                  variant="secondary"
                  className="ml-1 h-4 px-1.5 text-[10px] tabular-nums"
                >
                  {totalCount}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="inactive">Inactive</TabsTrigger>
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
              placeholder="Search meals..."
              defaultValue={search}
              className="h-8 w-56 pl-8 text-sm"
              onChange={(e) => {
                if (timerRef.current) clearTimeout(timerRef.current);
                const value = (e.target as HTMLInputElement).value;
                timerRef.current = setTimeout(() => pushSearch(value), 300);
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
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
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
                    ? `No meals match "${search}"`
                    : "No meals in this view."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <DataTablePagination
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          selectedCount={selectedCount}
          rowLabel="meal"
          onPageChange={pushPage}
          onPageSizeChange={pushPageSize}
        />
      </div>

      <DeleteConfirmDialog
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
