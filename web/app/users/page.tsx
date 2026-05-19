import { ConfigWarning } from "@/components/admin/config-warning";
import { PageHeader } from "@/components/admin/page-header";
import { UserTable } from "@/components/users/user-table";
import { getUsers } from "@/lib/admin/data";

export default async function UsersPage() {
  const usersState = await getUsers();

  return (
    <>
      <PageHeader
        eyebrow="Users"
        title="App users"
        description="View users created through mobile authentication and their current program assignment state."
      />

      <ConfigWarning message={usersState.configError} />

      <UserTable users={usersState.data} />
    </>
  );
}
