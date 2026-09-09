import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AdminClient } from "./AdminClient";

export default async function AdminPage() {
  const user = await getSessionUser();
  if (user?.roleCode !== "ADMIN") {
    redirect("/dashboard");
  }

  return <AdminClient />;
}
