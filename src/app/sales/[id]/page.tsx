import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Shell } from "@/components/layout/Shell";
import { SaleDetailClient } from "./SaleDetailClient";

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;

  return (
    <Shell user={user}>
      <SaleDetailClient invoiceId={Number(id)} userRole={user.roleCode} />
    </Shell>
  );
}
