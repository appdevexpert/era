"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Delete02Icon } from "@hugeicons/core-free-icons"
import { Toast } from "@base-ui/react/toast"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"

interface DeleteTarget {
  name: string
  type: string
  action: (fd: FormData) => Promise<void>
  formFields: Record<string, string>
  description?: string
}

/**
 * Trigger button to place inside a DropdownMenu.
 * Calls `onConfirm` when clicked — does NOT render the dialog itself.
 */
export function DeleteMenuItem({ onConfirm }: { onConfirm: () => void }) {
  return (
    <DropdownMenuItem
      className="text-destructive focus:text-destructive"
      onClick={onConfirm}
    >
      <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={1.8} />
      Delete
    </DropdownMenuItem>
  )
}

/**
 * Confirmation dialog rendered OUTSIDE the dropdown.
 * Controlled by `target` state — when set, dialog opens. When null, dialog is closed.
 */
export function DeleteConfirmDialog({
  target,
  onClose,
}: {
  target: DeleteTarget | null
  onClose: () => void
}) {
  const [pending, setPending] = useState(false)
  const toastManager = Toast.useToastManager()

  async function handleDelete() {
    if (!target) return
    setPending(true)
    try {
      const fd = new FormData()
      for (const [key, val] of Object.entries(target.formFields)) {
        fd.set(key, val)
      }
      await target.action(fd)
      toastManager.add({
        type: "success",
        title: `${target.type.charAt(0).toUpperCase() + target.type.slice(1)} deleted`,
      })
      onClose()
    } catch (err: unknown) {
      if (err && typeof err === "object" && "digest" in err) throw err
      toastManager.add({
        type: "error",
        title: "Delete failed",
        description: err instanceof Error ? err.message : "An unexpected error occurred.",
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={target !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-sans">Delete {target?.type}?</DialogTitle>
          <DialogDescription>
            {target?.description ??
              `This will permanently delete "${target?.name}". This cannot be undone.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            loading={pending}
            onClick={handleDelete}
          >
            Delete {target?.type}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export type { DeleteTarget }
