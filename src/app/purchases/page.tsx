import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Shell } from "@/components/layout/Shell";
import { PurchasesListClient } from "./PurchasesListClient";

export default async function PurchasesPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  // Check RBAC: Staff user cannot access purchases
  if (user.roleCode === "USER") {
    redirect("/dashboard");
  }

  return (
    <Shell user={user}>
      <PurchasesListClient />
    </Shell>
  );
}
