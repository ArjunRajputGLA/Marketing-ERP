import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Shell } from "@/components/layout/Shell";
import { FinanceClient } from "./FinanceClient";

export default async function FinancePage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  // RBAC check: Staff users cannot view finance
  if (user.roleCode === "USER") {
    redirect("/dashboard");
  }

  return (
    <Shell user={user}>
      <FinanceClient />
    </Shell>
  );
}
