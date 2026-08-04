"use client"

import { useState, useCallback } from "react"
import { Toast } from "@base-ui/react/toast"

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
        if (err && typeof err === "object" && "digest" in err) throw err
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
