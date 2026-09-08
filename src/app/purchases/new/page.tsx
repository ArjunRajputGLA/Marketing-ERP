import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Shell } from "@/components/layout/Shell";
import { NewPurchaseClient } from "./NewPurchaseClient";

export default async function NewPurchasePage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  if (user.roleCode === "USER") {
    redirect("/dashboard");
  }

  return (
    <Shell user={user}>
      <NewPurchaseClient />
    </Shell>
  );
}
