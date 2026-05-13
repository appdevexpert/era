import { redirect } from "next/navigation";

import { ForbiddenState } from "@/components/admin/forbidden-state";
import { getAdminAuthState } from "@/lib/admin/auth";
import { safeNextPath } from "@/lib/admin/auth-paths";
import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(next);
  const authState = await getAdminAuthState();

  if (authState.status === "authorized") {
    redirect(nextPath);
  }

  if (authState.status === "unauthorized") {
    return <ForbiddenState authState={authState} nextPath={nextPath} />;
  }

  const configError =
    authState.status === "configuration_error" ? authState.message : null;

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center">
        <section className="grid w-full gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="max-w-md">
            <p className="text-xs font-semibold uppercase text-era-gold-dark">
              ERA Admin
            </p>
            <h1 className="mt-4 font-display text-5xl leading-tight text-era-white">
              Secure dashboard access
            </h1>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Sign in with the email attached to an existing admin or coach
              profile. ERA will send a one-time code to verify the session.
            </p>
          </div>

          <LoginForm nextPath={nextPath} configError={configError} />
        </section>
      </div>
    </main>
  );
}
