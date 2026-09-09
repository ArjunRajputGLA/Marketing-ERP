import { getSessionUser } from "@/lib/auth";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const user = await getSessionUser();
  return <DashboardClient userRole={user?.roleCode || "USER"} />;
}
