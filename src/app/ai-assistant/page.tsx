import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Shell } from "@/components/layout/Shell";
import { AiAssistantClient } from "./AiAssistantClient";

export default async function AiAssistantPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <Shell user={user}>
      <AiAssistantClient userRole={user.roleCode} userId={user.userId} />
    </Shell>
  );
}
