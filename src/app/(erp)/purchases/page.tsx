import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { PurchasesListClient } from "./PurchasesListClient";

export default async function PurchasesPage() {
  const user = await getSessionUser();
  if (user?.roleCode === "USER") {
    redirect("/dashboard");
  }

  return <PurchasesListClient />;
}
