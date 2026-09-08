import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Shell } from "@/components/layout/Shell";
import { NewSaleClient } from "./NewSaleClient";

export default async function NewSalePage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <Shell user={user}>
      <NewSaleClient />
    </Shell>
  );
}
