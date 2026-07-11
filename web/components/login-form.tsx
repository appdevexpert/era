"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";

import { HugeiconsIcon } from "@hugeicons/react";
import { Alert01Icon, ViewIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons";

import { signIn, type SignInState } from "@/app/login/actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const INITIAL_STATE: SignInState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Signing in…" : "Sign in"}
    </Button>
  );
}

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [state, formAction] = useActionState(signIn, INITIAL_STATE);
  const [showPassword, setShowPassword] = useState(false);
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";

  return (
    <form action={formAction} className={cn("flex flex-col gap-6", className)} {...props}>
      <input type="hidden" name="next" value={next} />
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="font-display text-2xl font-medium text-foreground">
            Welcome back
          </h1>
          <p className="text-sm text-balance text-muted-foreground">
            Sign in to manage programs, exercises, and users.
          </p>
        </div>
        {state.error ? (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <HugeiconsIcon
              icon={Alert01Icon}
              size={16}
              strokeWidth={1.8}
              className="mt-0.5 shrink-0"
            />
            <p>{state.error}</p>
          </div>
        ) : null}
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@era.com"
            autoComplete="email"
            required
          />
        </Field>
        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <a
              href="#"
              className="ml-auto text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Forgot your password?
            </a>
          </div>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              <HugeiconsIcon
                icon={showPassword ? ViewOffSlashIcon : ViewIcon}
                size={18}
                strokeWidth={1.8}
              />
            </button>
          </div>
        </Field>
        <Field>
          <SubmitButton />
          <FieldDescription className="text-center">
            Owner access only. Contact an admin if you need an account.
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}
