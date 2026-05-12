"use client";

import Link from "next/link";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { EmptyState } from "@/components/admin/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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
import { deleteExercise } from "@/lib/admin/actions";
import { dateText, listText, translation } from "@/lib/admin/format";
import type { ExerciseRow } from "@/lib/admin/types";

export function ExerciseTable({
  exercises,
  page = 1,
  totalPages = 1,
  totalCount = 0,
}: {
  exercises: ExerciseRow[];
  page?: number;
  totalPages?: number;
  totalCount?: number;
}) {
  if (!exercises.length && page === 1) {
    return (
      <EmptyState
        title="No exercises yet"
        description="Create the first exercise before building workout programs."
      />
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <Table className="min-w-[900px]">
        <TableHeader>
          <TableRow>
            <TableHead>Exercise</TableHead>
            <TableHead>Norwegian</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Muscles</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {exercises.map((exercise) => (
            <TableRow key={exercise.id}>
              <TableCell>
                <div>
                  <p className="font-medium text-era-white">
                    {translation(exercise.name_translations, "en", exercise.name)}
                  </p>
                  <p className="text-xs text-muted-foreground">{exercise.slug}</p>
                </div>
              </TableCell>
              <TableCell>
                {translation(exercise.name_translations, "nb", exercise.name)}
              </TableCell>
              <TableCell className="capitalize">
                {exercise.modality} / {exercise.category}
              </TableCell>
              <TableCell className="max-w-56 truncate">
                {listText(exercise.primary_muscles)}
              </TableCell>
              <TableCell>
                <Badge variant={exercise.is_active ? "default" : "secondary"}>
                  {exercise.is_active ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell>{dateText(exercise.updated_at)}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontal />
                        <span className="sr-only">Exercise actions</span>
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end" className="w-36">
                    <DropdownMenuItem render={<Link href={`/exercises?edit=${exercise.id}`} />}>
                      <Pencil />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => {
                        if (window.confirm(`Delete "${translation(exercise.name_translations, "en", exercise.name)}"? This cannot be undone.`)) {
                          const fd = new FormData();
                          fd.set("id", exercise.id);
                          deleteExercise(fd);
                        }
                      }}
                    >
                      <Trash2 />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {totalPages > 1 ? (
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {totalCount} exercises
          </p>
          <Pagination>
            <PaginationContent>
              {page > 1 ? (
                <PaginationItem>
                  <PaginationPrevious href={`/exercises?page=${page - 1}`} />
                </PaginationItem>
              ) : null}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <PaginationItem key={p}>
                  <PaginationLink href={`/exercises?page=${p}`} isActive={p === page}>
                    {p}
                  </PaginationLink>
                </PaginationItem>
              ))}
              {page < totalPages ? (
                <PaginationItem>
                  <PaginationNext href={`/exercises?page=${page + 1}`} />
                </PaginationItem>
              ) : null}
            </PaginationContent>
          </Pagination>
        </div>
      ) : null}
    </div>
  );
}
