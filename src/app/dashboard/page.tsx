import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Shell } from "@/components/layout/Shell";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <Shell user={user}>
      <DashboardClient userRole={user.roleCode} />
    </Shell>
  );
}
