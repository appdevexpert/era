import { redirect } from "next/navigation";

import { ForbiddenState } from "@/components/admin/forbidden-state";
import { AdminShell } from "@/components/admin/admin-shell";
import {
  getAdminAuthState,
  getCurrentAdminPath,
  loginRedirectPath,
} from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [authState, currentPath] = await Promise.all([
    getAdminAuthState(),
    getCurrentAdminPath(),
  ]);

  if (authState.status === "unauthenticated") {
    redirect(loginRedirectPath(currentPath));
  }

  if (authState.status !== "authorized") {
    return <ForbiddenState authState={authState} nextPath={currentPath} />;
  }

  return (
    <AdminShell userEmail={authState.email} userRole={authState.profile.role}>
      {children}
    </AdminShell>
  );
}
