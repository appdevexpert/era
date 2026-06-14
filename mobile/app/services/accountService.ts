import { supabase } from "@/app/utils/auth";

type FunctionErrorWithContext = Error & {
  context?: Response;
};

async function getFunctionErrorMessage(error: unknown): Promise<string> {
  const fallback =
    error instanceof Error ? error.message : "Account deletion failed.";
  const context = (error as FunctionErrorWithContext | undefined)?.context;

  if (!context) return fallback;

  try {
    const payload = (await context.clone().json()) as { error?: unknown };
    if (typeof payload.error === "string" && payload.error.trim()) {
      return payload.error;
    }
  } catch {
    // Keep the original Supabase functions error when the response body is not JSON.
  }

  return fallback;
}

/**
 * Deletes the current authenticated user through the Supabase Edge Function.
 * The function uses the service-role key server-side to delete auth.users;
 * database rows tied with ON DELETE CASCADE are removed by Supabase/Postgres.
 */
export async function deleteAccount(): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not signed in.");
  }

  const { error } = await supabase.functions.invoke("delete-account", {
    body: {},
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    throw new Error(await getFunctionErrorMessage(error));
  }
}
