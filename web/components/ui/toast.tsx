"use client"

import * as React from "react"
import { Toast as ToastPrimitive } from "@base-ui/react/toast"
import { XIcon, CircleCheck, CircleAlert } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

function ToastProvider({ children, ...props }: ToastPrimitive.Provider.Props) {
  return (
    <ToastPrimitive.Provider timeout={4000} limit={3} {...props}>
      {children}
    </ToastPrimitive.Provider>
  )
}

function ToastViewport({ className, ...props }: ToastPrimitive.Viewport.Props) {
  return (
    <ToastPrimitive.Viewport
      data-slot="toast-viewport"
      className={cn(
        "fixed bottom-4 right-4 z-[100] flex w-80 flex-col gap-2",
        className,
      )}
      {...props}
    />
  )
}

function ToastRoot({
  className,
  toast,
  children,
  ...props
}: ToastPrimitive.Root.Props) {
  return (
    <ToastPrimitive.Root
      data-slot="toast-root"
      toast={toast}
      className={cn(
        "relative flex w-full items-start gap-3 rounded-lg border bg-card p-3 text-sm shadow-lg",
        "data-[type=success]:border-emerald-700",
        "data-[type=error]:border-destructive",
        "data-[ending]:animate-out data-[ending]:fade-out-0 data-[ending]:slide-out-to-right-full",
        "data-[starting]:animate-in data-[starting]:fade-in-0 data-[starting]:slide-in-from-right-full",
        className,
      )}
      {...props}
    >
      {children}
    </ToastPrimitive.Root>
  )
}

function ToastIcon({ type }: { type?: string }) {
  if (type === "success") {
    return <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-500" />
  }
  if (type === "error") {
    return <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
  }
  return null
}

function ToastTitle({ className, ...props }: ToastPrimitive.Title.Props) {
  return (
    <ToastPrimitive.Title
      data-slot="toast-title"
      className={cn("font-medium text-foreground", className)}
      {...props}
    />
  )
}

function ToastDescription({
  className,
  ...props
}: ToastPrimitive.Description.Props) {
  return (
    <ToastPrimitive.Description
      data-slot="toast-description"
      className={cn("mt-0.5 text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

function ToastClose(props: ToastPrimitive.Close.Props) {
  return (
    <ToastPrimitive.Close
      data-slot="toast-close"
      render={
        <Button
          variant="ghost"
          size="icon-sm"
          className="absolute top-2 right-2"
        />
      }
      {...props}
    >
      <XIcon className="size-3.5" />
    </ToastPrimitive.Close>
  )
}

function Toaster() {
  const toasts = ToastPrimitive.useToastManager()

  return (
    <ToastPrimitive.Portal>
      <ToastViewport>
        {toasts.toasts.map((toast) => (
          <ToastRoot key={toast.id} toast={toast}>
            <ToastIcon type={toast.type} />
            <div className="flex-1 pr-5">
              <ToastTitle>{toast.title}</ToastTitle>
              {toast.description ? (
                <ToastDescription>{toast.description}</ToastDescription>
              ) : null}
            </div>
            <ToastClose />
          </ToastRoot>
        ))}
      </ToastViewport>
    </ToastPrimitive.Portal>
  )
}

export {
  ToastProvider,
  ToastViewport,
  ToastRoot,
  ToastTitle,
  ToastDescription,
  ToastClose,
  Toaster,
}
