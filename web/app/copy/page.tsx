import { ConfigWarning } from "@/components/admin/config-warning";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { CopyEditorCard } from "@/components/copy/copy-editor";
import {
  NotificationGroupCard,
  type NotificationGroup,
} from "@/components/copy/notification-group-card";
import { getAppCopyRows } from "@/lib/admin/data";
import type { AppCopyRow } from "@/lib/admin/types";

const CATEGORY_LABELS: Record<string, string> = {
  sharing: "Sharing",
  notifications: "Notifications",
  misc: "Miscellaneous",
};

// Friendly labels for the three notification groups. Keyed by the `subject`
// slug parsed out of `notification_{subject}_{title|body}` keys. Unknown
// subjects fall back to the prettified slug.
const NOTIFICATION_LABELS: Record<string, string> = {
  daily: "Daily reminder",
  streak: "Streak warning",
  pr: "PR alert",
};

function labelFor(category: string): string {
  return CATEGORY_LABELS[category] ?? category.replace(/_/g, " ");
}

function notificationLabelFor(subject: string): string {
  return (
    NOTIFICATION_LABELS[subject] ??
    subject.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

// Splits notification rows into (title, body) groups keyed by the middle
// slug of the key. Rows that don't match the `notification_{s}_{title|body}`
// pattern fall through as standalone rows — the caller renders them with the
// generic CopyEditorCard so we never silently hide a key.
function partitionNotificationRows(rows: AppCopyRow[]): {
  groups: NotificationGroup[];
  standalone: AppCopyRow[];
} {
  const bySubject = new Map<string, { title?: AppCopyRow; body?: AppCopyRow }>();
  const standalone: AppCopyRow[] = [];

  for (const row of rows) {
    const match = row.key.match(/^notification_(.+)_(title|body)$/);
    if (!match) {
      standalone.push(row);
      continue;
    }
    const [, subject, field] = match;
    const bucket = bySubject.get(subject) ?? {};
    bucket[field as "title" | "body"] = row;
    bySubject.set(subject, bucket);
  }

  // Stable order: daily → streak → pr → (anything else, alphabetically).
  const orderIndex = (subject: string) => {
    const idx = ["daily", "streak", "pr"].indexOf(subject);
    return idx === -1 ? 99 : idx;
  };

  const groups: NotificationGroup[] = Array.from(bySubject.entries())
    .sort(([a], [b]) => orderIndex(a) - orderIndex(b) || a.localeCompare(b))
    .map(([subject, { title, body }]) => ({
      label: notificationLabelFor(subject),
      // Prefer the title row's description as the group description — it
      // typically explains when/why the notification fires.
      description: title?.description ?? body?.description ?? null,
      title: title ?? null,
      body: body ?? null,
    }));

  return { groups, standalone };
}

function groupByCategory(rows: AppCopyRow[]): Array<[string, AppCopyRow[]]> {
  const groups = new Map<string, AppCopyRow[]>();
  for (const row of rows) {
    const bucket = groups.get(row.category) ?? [];
    bucket.push(row);
    groups.set(row.category, bucket);
  }
  return Array.from(groups.entries());
}

export default async function CopyPage() {
  const { data: rows, configError } = await getAppCopyRows();
  const groups = groupByCategory(rows);

  return (
    <>
      <PageHeader
        eyebrow="Copy"
        title="App copy"
        description="Edit user-facing strings that ship in the mobile app. Changes go live the next time a user opens the app — no rebuild needed."
      />

      <ConfigWarning message={configError} />

      {rows.length ? (
        <div className="grid gap-8">
          {groups.map(([category, categoryRows]) => {
            const { groups: notifGroups, standalone } =
              category === "notifications"
                ? partitionNotificationRows(categoryRows)
                : { groups: [], standalone: categoryRows };

            const itemCount = notifGroups.length + standalone.length;

            return (
              <section key={category} className="grid gap-4">
                <div>
                  <h3 className="font-sans text-lg font-medium text-foreground">
                    {labelFor(category)}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {itemCount} item{itemCount === 1 ? "" : "s"} in this group
                  </p>
                </div>
                <div className="grid gap-4">
                  {notifGroups.map((group) => (
                    <NotificationGroupCard
                      key={group.label}
                      group={group}
                    />
                  ))}
                  {standalone.map((row) => (
                    <CopyEditorCard key={row.key} row={row} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No copy keys yet"
          description="New keys are seeded from a database migration and then wired up in the mobile app."
        />
      )}
    </>
  );
}
