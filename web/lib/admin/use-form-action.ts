"use client"

import { useState, useCallback } from "react"
import { Toast } from "@base-ui/react/toast"

/**
 * Whether an error is Next.js signalling control flow rather than a failure.
 *
 * `redirect()` and `notFound()` work by throwing, and those have to be re-thrown
 * so the framework can act on them. But Next.js also attaches a `digest` hash to
 * every ordinary error a Server Action throws on its way to the client, so the
 * old check — `"digest" in err` — caught those too and re-threw them instead of
 * showing a toast. Every server-side failure in the panel was therefore silent:
 * renumbering a week onto an existing number hit a unique constraint, threw, and
 * looked exactly like the Save button doing nothing.
 *
 * Control-flow digests are prefixed strings ("NEXT_REDIRECT;replace;/login;307;",
 * "NEXT_NOT_FOUND"). Server-action error digests are bare hashes.
 */
export function isFrameworkControlFlow(err: unknown): boolean {
  if (!err || typeof err !== "object" || !("digest" in err)) return false
  const digest = (err as { digest?: unknown }).digest
  return typeof digest === "string" && digest.startsWith("NEXT_")
}

/**
 * Wraps a server action with loading state and toast notifications.
 * Use on <form onSubmit={handleSubmit}> instead of <form action={fn}>.
 */
/**
 * `action` may return a string. When it does, that string becomes the success
 * toast's description — used by the propagate-to-all-weeks paths to report what
 * actually happened ("Applied to 9 weeks — 3 weeks don't have this exercise")
 * instead of a fixed message that hides a partial write.
 */
export function useFormAction(
  action: (formData: FormData) => Promise<void | string>,
  options: { success: string; onSuccess?: () => void },
) {
  const [pending, setPending] = useState(false)
  const toastManager = Toast.useToastManager()

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      setPending(true)
      try {
        const fd = new FormData(e.currentTarget)
        const detail = await action(fd)
        toastManager.add({
          type: "success",
          title: options.success,
          description: typeof detail === "string" && detail ? detail : undefined,
        })
        options.onSuccess?.()
      } catch (err: unknown) {
        if (isFrameworkControlFlow(err)) throw err
        toastManager.add({
          type: "error",
          title: "Something went wrong",
          description: err instanceof Error ? err.message : "An unexpected error occurred.",
        })
      } finally {
        setPending(false)
      }
    },
    [action, options, toastManager],
  )

  return { handleSubmit, pending }
}
