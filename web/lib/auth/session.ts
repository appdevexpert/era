export const SESSION_COOKIE = "era_admin_session";

export const DUMMY_USER = {
  id: "demo",
  email: "admin@era.local",
  full_name: "ERA Admin",
  avatar_url: null as string | null,
  role: "admin",
};

export function getDummyAdminEmail() {
  return (
    process.env.DUMMY_ADMIN_EMAIL?.trim() || DUMMY_USER.email
  ).toLowerCase();
}

export function getDummyAdminPassword() {
  return process.env.DUMMY_ADMIN_PASSWORD?.trim() || "era2026";
}
