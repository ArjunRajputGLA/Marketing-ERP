import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Shell } from "@/components/layout/Shell";
import { ReportsClient } from "./ReportsClient";

export default async function ReportsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  // RBAC check: Staff users cannot view analytical reporting views
  if (user.roleCode === "USER") {
    redirect("/dashboard");
  }

  return (
    <Shell user={user}>
      <ReportsClient />
    </Shell>
  );
}
