import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Shell } from "@/components/layout/Shell";
import { MasterClient } from "./MasterClient";

export default async function MasterPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  // RBAC check: Staff user cannot manage master data
  if (user.roleCode === "USER") {
    redirect("/dashboard");
  }

  return (
    <Shell user={user}>
      <MasterClient />
    </Shell>
  );
}
