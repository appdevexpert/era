import { notFound } from "next/navigation";

import { ActivityTable } from "@/components/activity/activity-table";
import { ConfigWarning } from "@/components/admin/config-warning";
import { PageHeader } from "@/components/admin/page-header";
import { getAuditLog } from "@/lib/admin/data";
import { getCurrentAdminUser } from "@/lib/auth/current-user";

// Always read the freshest log — never serve a cached page here.
export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  // Owner-only. Anyone else (e.g. Rami) can't even reach it by URL.
  const user = await getCurrentAdminUser();
  if (!user?.canViewActivity) {
    notFound();
  }

  const logState = await getAuditLog();

  return (
    <>
      <PageHeader
        eyebrow="Activity"
        title="Admin activity log"
        description="A record of every create, update, and delete made from this panel — who did it, what changed, and when."
      />

      <ConfigWarning message={logState.configError} />

      <ActivityTable entries={logState.data} />
    </>
  );
}
