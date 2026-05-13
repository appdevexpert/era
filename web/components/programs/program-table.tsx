"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreHorizontal, Pencil, Wrench } from "lucide-react";

import { DeleteConfirmDialog, DeleteMenuItem, type DeleteTarget } from "@/components/admin/delete-confirm-dialog";
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
import { deleteProgram } from "@/lib/admin/actions";
import { dateText, translation } from "@/lib/admin/format";
import type { ProgramRow } from "@/lib/admin/types";

export function ProgramTable({ programs }: { programs: ProgramRow[] }) {
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  if (!programs.length) {
    return (
      <EmptyState
        title="No programs yet"
        description="Create a 12-week program, then open the builder to add weeks, days, exercises, and sets."
      />
    );
  }

  return (
    <>
    <div className="rounded-lg border border-border bg-card">
      <Table className="min-w-[760px]">
        <TableHeader>
          <TableRow>
            <TableHead>Program</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Weeks</TableHead>
            <TableHead>Days</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {programs.map((program) => (
            <TableRow key={program.id}>
              <TableCell>
                <div>
                  <p className="font-medium text-era-white">
                    {translation(program.title_translations, "en", program.title)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {translation(program.title_translations, "nb", program.title)}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={program.status === "active" ? "default" : "secondary"}>
                  {program.status}
                </Badge>
              </TableCell>
              <TableCell>{program.weekCount ?? 0}</TableCell>
              <TableCell>{program.dayCount ?? 0}</TableCell>
              <TableCell>{dateText(program.updated_at)}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontal />
                        <span className="sr-only">Program actions</span>
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem render={<Link href={`/programs/${program.id}`} />}>
                      <Wrench />
                      Open builder
                    </DropdownMenuItem>
                    <DropdownMenuItem render={<Link href={`/programs?edit=${program.id}`} />}>
                      <Pencil />
                      Edit
                    </DropdownMenuItem>
                    <DeleteMenuItem
                      onConfirm={() =>
                        setDeleteTarget({
                          name: translation(program.title_translations, "en", program.title),
                          type: "program",
                          action: deleteProgram,
                          formFields: { id: program.id },
                          description: `This will delete "${translation(program.title_translations, "en", program.title)}" and all its weeks, days, exercises, and sets. This cannot be undone.`,
                        })
                      }
                    />
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>

    <DeleteConfirmDialog
      target={deleteTarget}
      onClose={() => setDeleteTarget(null)}
    />
    </>
  );
}
