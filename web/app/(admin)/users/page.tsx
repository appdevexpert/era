import { getAdminPageGate } from "@/components/admin/admin-page-gate";
import { ConfigWarning } from "@/components/admin/config-warning";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getUsers } from "@/lib/admin/data";
import { dateText } from "@/lib/admin/format";

export default async function UsersPage() {
  const gate = await getAdminPageGate();
  if (gate) return gate;

  const usersState = await getUsers();
  const users = usersState.data;

  return (
    <>
      <PageHeader
        eyebrow="Users"
        title="App users"
        description="View users created through mobile authentication and their current program assignment state."
      />

      <ConfigWarning message={usersState.configError} />

      {users.length ? (
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Active assignments</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-era-white">
                        {user.full_name || "Unnamed user"}
                      </p>
                      <p className="text-xs text-muted-foreground">{user.id}</p>
                    </div>
                  </TableCell>
                  <TableCell>{user.email ?? "No email"}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === "user" ? "secondary" : "default"}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.active_assignment_count ?? 0}</TableCell>
                  <TableCell>{dateText(user.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          title="No users found"
          description="Users will appear here after they sign up and profiles are created."
        />
      )}
    </>
  );
}
