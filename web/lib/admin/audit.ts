import "server-only";

import {
  getCurrentAdminUser,
  type CurrentAdminUser,
} from "@/lib/auth/current-user";
import { requireAdminClient } from "@/lib/admin/supabase";

export type AuditAction = "create" | "update" | "delete";

type AuditInput = {
  /** What happened to the record. */
  action: AuditAction;
  /** Friendly label for the thing changed, e.g. "Program", "Exercise". */
  entity: string;
  /** Database table affected. */
  table: string;
  /** Affected row id, when known. */
  recordId?: string | null;
  /** Short human-readable line, e.g. `Updated program "Push Day A"`. */
  summary: string;
  /** Snapshot of the new/changed values (safe to be partial). */
  details?: unknown;
  /** Pass the already-resolved actor to avoid a second getUser() round-trip. */
  actor?: CurrentAdminUser | null;
};

// Records one admin action into public.admin_audit_log. The acting admin comes
// from the signed session cookie, so it cannot be spoofed by the caller.
//
// Auditing must never break the actual mutation — every failure here is
// swallowed and logged, so a broken audit write can't stop a save from
// succeeding.
export async function logAdminAction(input: AuditInput): Promise<void> {
  try {
    const user =
      input.actor !== undefined ? input.actor : await getCurrentAdminUser();
    const supabase = requireAdminClient();

    const { error } = await supabase.from("admin_audit_log").insert({
      admin_id: user?.id ?? "unknown",
      admin_name: user?.full_name ?? user?.email ?? "Unknown",
      action: input.action,
      entity: input.entity,
      table_name: input.table,
      record_id: input.recordId ?? null,
      summary: input.summary,
      details: input.details ?? null,
    });

    if (error) {
      console.warn("[audit] failed to record admin action:", error.message);
    }
  } catch (error) {
    console.warn("[audit] failed to record admin action:", error);
  }
}
