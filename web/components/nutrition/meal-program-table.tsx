"use client";

import { useState } from "react";
import Link from "next/link";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  CheckmarkCircle01Icon,
  MoreHorizontalIcon,
  PauseCircleIcon,
  PencilEdit01Icon,
} from "@hugeicons/core-free-icons";

import {
  DeleteConfirmDialog,
  DeleteMenuItem,
  type DeleteTarget,
} from "@/components/admin/delete-confirm-dialog";
import { EmptyState } from "@/components/admin/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteMealProgram } from "@/lib/admin/actions";
import { dateText, translation } from "@/lib/admin/format";
import type { MealProgramRow } from "@/lib/admin/types";

export function MealProgramTable({ programs }: { programs: MealProgramRow[] }) {
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  if (!programs.length) {
    return (
      <EmptyState
        title="No meal programs yet"
        description="Create the first meal program. Three phases and 21 weekday slots will be set up automatically — you only need to fill in the meals."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <Table>
        <TableHeader className="bg-muted/60">
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-xs uppercase tracking-[0.12em]">
              Program
            </TableHead>
            <TableHead className="text-xs uppercase tracking-[0.12em]">
              Norwegian
            </TableHead>
            <TableHead className="text-xs uppercase tracking-[0.12em]">
              Phases / Meals
            </TableHead>
            <TableHead className="text-xs uppercase tracking-[0.12em]">
              Status
            </TableHead>
            <TableHead className="text-xs uppercase tracking-[0.12em]">
              Updated
            </TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {programs.map((program) => (
            <TableRow key={program.id} className="hover:bg-muted/50">
              <TableCell className="py-3">
                <Link
                  href={`/nutrition/programs/${program.id}`}
                  className="font-medium text-foreground transition-colors hover:text-primary"
                >
                  {translation(program.title_translations, "en", "Untitled")}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  {program.duration_days} days
                </p>
              </TableCell>
              <TableCell className="py-3 text-muted-foreground">
                {translation(program.title_translations, "nb", "—")}
              </TableCell>
              <TableCell className="py-3">
                <div className="flex flex-wrap gap-1.5">
                  <Badge
                    variant="outline"
                    className="border-border bg-transparent text-muted-foreground"
                  >
                    {program.phaseCount ?? 0} phases
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-border bg-transparent text-muted-foreground"
                  >
                    {program.itemCount ?? 0} meals
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="py-3">
                <Badge
                  variant="outline"
                  className="gap-1.5 border-border bg-transparent text-muted-foreground"
                >
                  <HugeiconsIcon
                    icon={
                      program.is_active
                        ? CheckmarkCircle01Icon
                        : PauseCircleIcon
                    }
                    size={12}
                    strokeWidth={2}
                    className={
                      program.is_active
                        ? "text-era-success"
                        : "text-muted-foreground"
                    }
                  />
                  {program.is_active ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell className="py-3 text-muted-foreground">
                {dateText(program.updated_at)}
              </TableCell>
              <TableCell className="py-3">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    render={
                      <Link
                        href={`/nutrition/programs/${program.id}`}
                        className="gap-1.5"
                      >
                        Open
                        <HugeiconsIcon
                          icon={ArrowRight01Icon}
                          size={14}
                          strokeWidth={1.8}
                        />
                      </Link>
                    }
                  />
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
                      <DropdownMenuItem
                        render={
                          <Link
                            href={`/nutrition/programs?edit=${program.id}`}
                          />
                        }
                      >
                        <HugeiconsIcon
                          icon={PencilEdit01Icon}
                          size={16}
                          strokeWidth={1.8}
                        />
                        Edit
                      </DropdownMenuItem>
                      {program.is_active ? (
                        <DeleteMenuItem
                          onConfirm={() =>
                            setDeleteTarget({
                              name: translation(
                                program.title_translations,
                                "en",
                                "Untitled",
                              ),
                              type: "program",
                              action: deleteMealProgram,
                              formFields: { id: program.id },
                            })
                          }
                        />
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <DeleteConfirmDialog
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
