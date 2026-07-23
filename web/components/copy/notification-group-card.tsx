"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveAppCopyGroup } from "@/lib/admin/actions";
import { relativeTimeText } from "@/lib/admin/format";
import type { AppCopyRow } from "@/lib/admin/types";
import { useFormAction } from "@/lib/admin/use-form-action";

export type NotificationGroup = {
  // Human label like "Streak warning" — shown as the card title.
  label: string;
  // Rendered under the label so admins know when/why it fires.
  description: string | null;
  // Title + body rows for the same notification. Either may be missing if
  // the DB doesn't have both halves yet.
  title: AppCopyRow | null;
  body: AppCopyRow | null;
};

function newestUpdatedAt(group: NotificationGroup): string | null {
  const dates = [group.title?.updated_at, group.body?.updated_at].filter(
    (d): d is string => Boolean(d),
  );
  if (dates.length === 0) return null;
  return dates.sort().reverse()[0];
}

export function NotificationGroupCard({ group }: { group: NotificationGroup }) {
  const rows = [group.title, group.body].filter(
    (r): r is AppCopyRow => r !== null,
  );
  const keys = rows.map((r) => r.key);
  const newest = newestUpdatedAt(group);

  const { handleSubmit, pending } = useFormAction(saveAppCopyGroup, {
    success: `${group.label} saved`,
  });

  return (
    <Card className="@container/card">
      <CardHeader className="grid gap-1">
        <CardTitle className="font-sans">{group.label}</CardTitle>
        {group.description ? (
          <p className="text-sm text-muted-foreground">{group.description}</p>
        ) : null}
        {newest ? (
          <p className="text-xs text-muted-foreground">
            Updated {relativeTimeText(newest)}
          </p>
        ) : null}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-6">
          <input type="hidden" name="keys" value={keys.join(",")} />
          <input type="hidden" name="group_label" value={group.label} />

          {group.title ? (
            <FieldPair label="Title" row={group.title} rows={2} />
          ) : null}
          {group.body ? (
            <FieldPair label="Body" row={group.body} rows={3} />
          ) : null}

          <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              Placeholders like <code className="font-mono">{"{{exercise}}"}</code>{" "}
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

function FieldPair({
  label,
  row,
  rows,
}: {
  label: string;
  row: AppCopyRow;
  rows: number;
}) {
  return (
    <div className="grid gap-3">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`en-${row.key}`}>English</Label>
          <Textarea
            id={`en-${row.key}`}
            name={`en_${row.key}`}
            defaultValue={row.translations.en ?? ""}
            rows={rows}
            spellCheck
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`nb-${row.key}`}>Norwegian Bokmål</Label>
          <Textarea
            id={`nb-${row.key}`}
            name={`nb_${row.key}`}
            defaultValue={row.translations.nb ?? ""}
            rows={rows}
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}
