"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveAppCopy } from "@/lib/admin/actions";
import { relativeTimeText } from "@/lib/admin/format";
import type { AppCopyRow } from "@/lib/admin/types";
import { useFormAction } from "@/lib/admin/use-form-action";

export function CopyEditorCard({ row }: { row: AppCopyRow }) {
  const { handleSubmit, pending } = useFormAction(saveAppCopy, {
    success: "Copy saved",
  });

  return (
    <Card className="@container/card">
      <CardHeader className="grid gap-1">
        <CardTitle className="font-mono text-sm text-foreground">
          {row.key}
        </CardTitle>
        {row.description ? (
          <p className="text-sm text-muted-foreground">{row.description}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Updated {relativeTimeText(row.updated_at)}
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-5">
          <input type="hidden" name="key" value={row.key} />

          <div className="grid gap-2">
            <Label htmlFor={`en-${row.key}`}>English</Label>
            <Textarea
              id={`en-${row.key}`}
              name="en"
              defaultValue={row.translations.en ?? ""}
              rows={3}
              spellCheck
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`nb-${row.key}`}>Norwegian Bokmål</Label>
            <Textarea
              id={`nb-${row.key}`}
              name="nb"
              defaultValue={row.translations.nb ?? ""}
              rows={3}
              spellCheck={false}
            />
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              Placeholders like <code className="font-mono">{"{{volume}}"}</code>{" "}
              are replaced by the app at render time. Keep them intact.
            </p>
            <Button type="submit" loading={pending}>
              Save
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
