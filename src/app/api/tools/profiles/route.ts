import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { queryWithContext } from "@/lib/db";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profiles = await queryWithContext(
      user.userId,
      user.roleCode,
      `SELECT
         profile_name,
         description,
         weight_evidence,
         weight_consistency,
         weight_domain_fit,
         weight_historical_rel,
         is_default
       FROM ai.consensus_weight_profiles
       ORDER BY profile_name ASC`
    );

    const models = await queryWithContext(
      user.userId,
      user.roleCode,
      `SELECT
         model_id,
         name,
         model_type,
         domain,
         version,
         is_active
       FROM ai.model_registry
       ORDER BY domain, name ASC`
    );

    return NextResponse.json({ profiles, models });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch AI layer metadata" },
      { status: 500 }
    );
  }
}
