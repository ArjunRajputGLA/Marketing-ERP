import { getSessionUser } from "@/lib/auth";
import { SaleDetailClient } from "./SaleDetailClient";

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  const { id } = await params;

  return (
    <SaleDetailClient
      invoiceId={Number(id)}
      userRole={user?.roleCode || "USER"}
    />
  );
}
