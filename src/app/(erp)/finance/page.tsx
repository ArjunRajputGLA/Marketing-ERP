import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { FinanceClient } from "./FinanceClient";

export default async function FinancePage() {
  const user = await getSessionUser();
  if (user?.roleCode === "USER") {
    redirect("/dashboard");
  }

  return <FinanceClient />;
}
