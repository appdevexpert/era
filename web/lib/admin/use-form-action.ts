"use client"

import { useState, useCallback } from "react"
import { Toast } from "@base-ui/react/toast"

/**
 * Wraps a server action with loading state and toast notifications.
 * Use on <form onSubmit={handleSubmit}> instead of <form action={fn}>.
 */
export function useFormAction(
  action: (formData: FormData) => Promise<void>,
  options: { success: string },
) {
  const [pending, setPending] = useState(false)
  const toastManager = Toast.useToastManager()

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      setPending(true)
      try {
        const fd = new FormData(e.currentTarget)
        await action(fd)
        toastManager.add({ type: "success", title: options.success })
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
    [action, options.success, toastManager],
  )

  return { handleSubmit, pending }
}
