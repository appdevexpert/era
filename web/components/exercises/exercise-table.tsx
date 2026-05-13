"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MoreHorizontal, Pencil, Search } from "lucide-react";

import { DeleteConfirmDialog, DeleteMenuItem, type DeleteTarget } from "@/components/admin/delete-confirm-dialog";
import { EmptyState } from "@/components/admin/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  search = "",
}: {
  exercises: ExerciseRow[];
  page?: number;
  totalPages?: number;
  totalCount?: number;
  search?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  function buildHref(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    if (search) params.set("search", search);
    else params.delete("search");
    params.delete("edit");
    return `/exercises?${params.toString()}`;
  }

  function handleSearch(term: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (term) params.set("search", term);
    else params.delete("search");
    params.set("page", "1");
    params.delete("edit");
    router.push(`/exercises?${params.toString()}`);
  }

  if (!exercises.length && page === 1 && !search) {
    return (
      <EmptyState
        title="No exercises yet"
        description="Create the first exercise before building workout programs."
      />
    );
  }

  return (
    <div>
      <div className="mb-4 max-w-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search exercises..."
            defaultValue={search}
            className="pl-8"
            onChange={(e) => {
              if (timerRef.current) clearTimeout(timerRef.current);
              const value = (e.target as HTMLInputElement).value;
              timerRef.current = setTimeout(() => handleSearch(value), 300);
            }}
          />
        </div>
      </div>

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
            {exercises.length ? (
              exercises.map((exercise) => (
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
                        <DeleteMenuItem
                          onConfirm={() =>
                            setDeleteTarget({
                              name: translation(exercise.name_translations, "en", exercise.name),
                              type: "exercise",
                              action: deleteExercise,
                              formFields: { id: exercise.id },
                            })
                          }
                        />
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  No exercises match &quot;{search}&quot;
                </TableCell>
              </TableRow>
            )}
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
                    <PaginationPrevious href={buildHref(page - 1)} />
                  </PaginationItem>
                ) : null}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <PaginationItem key={p}>
                    <PaginationLink href={buildHref(p)} isActive={p === page}>
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                {page < totalPages ? (
                  <PaginationItem>
                    <PaginationNext href={buildHref(page + 1)} />
                  </PaginationItem>
                ) : null}
              </PaginationContent>
            </Pagination>
          </div>
        ) : null}
      </div>

      <DeleteConfirmDialog
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
