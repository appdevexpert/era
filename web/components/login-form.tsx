"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";

import { HugeiconsIcon } from "@hugeicons/react";
import { Alert01Icon } from "@hugeicons/core-free-icons";

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
        <div className="rounded-md border border-era-gold-dark/30 bg-accent/50 p-3 text-xs">
          <p className="font-medium text-foreground">Demo credentials</p>
          <p className="mt-1 text-muted-foreground">
            Email: <code className="text-foreground">admin@era.local</code>
          </p>
          <p className="text-muted-foreground">
            Password: <code className="text-foreground">era2026</code>
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="admin@era.local"
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
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
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
