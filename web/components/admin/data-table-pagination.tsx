"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  ArrowLeftDoubleIcon,
  ArrowRight01Icon,
  ArrowRightDoubleIcon,
} from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 100];

export function DataTablePagination({
  page,
  totalPages,
  totalCount,
  pageSize,
  selectedCount,
  rowLabel = "row",
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  selectedCount?: number;
  rowLabel?: string;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}) {
  const safeTotalPages = Math.max(1, totalPages);
  const canPrev = page > 1;
  const canNext = page < safeTotalPages;
  const pluralRow = `${rowLabel}${totalCount === 1 ? "" : "s"}`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border px-4 py-3 text-sm">
      <p className="text-xs text-muted-foreground">
        {selectedCount !== undefined
          ? `${selectedCount} of ${totalCount} ${pluralRow} selected.`
          : `${totalCount} ${pluralRow}`}
      </p>

      <div className="flex flex-wrap items-center gap-6">
        {onPageSizeChange ? (
          <div className="flex items-center gap-2">
            <Label htmlFor="rows-per-page" className="text-xs text-muted-foreground">
              Rows per page
            </Label>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => onPageSizeChange(Number(value))}
              items={PAGE_SIZE_OPTIONS.map((n) => ({
                label: String(n),
                value: String(n),
              }))}
            >
              <SelectTrigger
                id="rows-per-page"
                size="sm"
                className="h-8 w-[70px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <p className="text-xs font-medium tabular-nums">
          Page {page} of {safeTotalPages}
        </p>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="hidden sm:inline-flex"
            disabled={!canPrev}
            onClick={() => onPageChange(1)}
            aria-label="First page"
          >
            <HugeiconsIcon icon={ArrowLeftDoubleIcon} size={14} strokeWidth={1.8} />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={!canPrev}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={14} strokeWidth={1.8} />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={!canNext}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
          >
            <HugeiconsIcon icon={ArrowRight01Icon} size={14} strokeWidth={1.8} />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="hidden sm:inline-flex"
            disabled={!canNext}
            onClick={() => onPageChange(safeTotalPages)}
            aria-label="Last page"
          >
            <HugeiconsIcon icon={ArrowRightDoubleIcon} size={14} strokeWidth={1.8} />
          </Button>
        </div>
      </div>
    </div>
  );
}
