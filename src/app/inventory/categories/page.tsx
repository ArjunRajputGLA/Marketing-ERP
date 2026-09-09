import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Shell } from "@/components/layout/Shell";
import { CategoriesClient } from "./CategoriesClient";

export default async function CategoriesPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <Shell user={user}>
      <CategoriesClient />
    </Shell>
  );
}
