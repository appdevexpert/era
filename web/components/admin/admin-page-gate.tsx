import { redirect } from "next/navigation";

import { ForbiddenState } from "@/components/admin/forbidden-state";
import {
  getAdminAuthState,
  getCurrentAdminPath,
  loginRedirectPath,
} from "@/lib/admin/auth";

export async function getAdminPageGate() {
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

  return null;
}
