import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { NewPurchaseClient } from "./NewPurchaseClient";

export default async function NewPurchasePage() {
  const user = await getSessionUser();
  if (user?.roleCode === "USER") {
    redirect("/dashboard");
  }

  return <NewPurchaseClient />;
}
