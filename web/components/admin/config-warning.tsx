import { AlertTriangle } from "lucide-react";

export function ConfigWarning({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div className="flex gap-3 rounded-lg border border-era-gold-60 bg-era-gold-16 p-4 text-sm text-era-gold-light">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <div>
        <p className="font-medium text-era-gold-light">Supabase admin access is not ready</p>
        <p className="mt-1 text-era-white-72">
          {message}. Add `SUPABASE_SERVICE_ROLE_KEY` in the web app environment
          before using owner-only admin writes and full metrics.
        </p>
      </div>
    </div>
  );
}
