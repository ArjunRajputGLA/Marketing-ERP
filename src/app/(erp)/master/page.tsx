import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { MasterClient } from "./MasterClient";

export default async function MasterPage() {
  const user = await getSessionUser();
  if (user?.roleCode === "USER") {
    redirect("/dashboard");
  }

  return <MasterClient />;
}
