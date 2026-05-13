export type AdminRole = "admin" | "coach";

const ADMIN_ROLES = new Set<string>(["admin", "coach"]);

export function isAdminRole(role: string | null | undefined): role is AdminRole {
  return Boolean(role && ADMIN_ROLES.has(role));
}

export function isAdminRoutePath(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/exercises" ||
    pathname.startsWith("/exercises/") ||
    pathname === "/programs" ||
    pathname.startsWith("/programs/") ||
    pathname === "/users" ||
    pathname.startsWith("/users/")
  );
}

export function safeNextPath(value: unknown, fallback = "/") {
  if (typeof value !== "string") return fallback;

  const trimmed = value.trim();
  if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallback;
  }

  try {
    const url = new URL(trimmed, "https://era.local");

    if (!isAdminRoutePath(url.pathname)) {
      return fallback;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function loginRedirectPath(nextPath: unknown) {
  return `/login?next=${encodeURIComponent(safeNextPath(nextPath))}`;
}
