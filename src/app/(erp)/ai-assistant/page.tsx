import { getSessionUser } from "@/lib/auth";
import { AiAssistantClient } from "./AiAssistantClient";

export default async function AiAssistantPage() {
  const user = await getSessionUser();

  return (
    <AiAssistantClient
      userRole={user?.roleCode || "USER"}
      userId={user?.userId || 0}
    />
  );
}
