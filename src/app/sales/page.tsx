import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Shell } from "@/components/layout/Shell";
import { SalesListClient } from "./SalesListClient";

export default async function SalesPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <Shell user={user}>
      <SalesListClient />
    </Shell>
  );
}
