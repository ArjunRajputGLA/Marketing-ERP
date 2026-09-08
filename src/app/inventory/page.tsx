import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Shell } from "@/components/layout/Shell";
import { InventoryClient } from "./InventoryClient";

export default async function InventoryPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <Shell user={user}>
      <InventoryClient />
    </Shell>
  );
}
