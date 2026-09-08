import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Shell } from "@/components/layout/Shell";
import { AdminClient } from "./AdminClient";

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  // RBAC check: Only ADMIN can access
  if (user.roleCode !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <Shell user={user}>
      <AdminClient />
    </Shell>
  );
}
