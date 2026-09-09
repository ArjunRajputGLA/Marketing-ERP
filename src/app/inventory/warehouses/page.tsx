import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Shell } from "@/components/layout/Shell";
import { WarehousesClient } from "./WarehousesClient";

export default async function WarehousesPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <Shell user={user}>
      <WarehousesClient />
    </Shell>
  );
}
