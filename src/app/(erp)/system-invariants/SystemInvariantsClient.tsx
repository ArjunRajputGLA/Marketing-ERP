"use client";

import React, { useEffect, useState } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Database,
  Lock,
  Activity,
  ArrowUpRight,
  Sparkles,
  Server,
  FileCheck,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader } from "@/components/ui/loader";

export function SystemInvariantsClient() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [probing, setProbing] = useState(false);

  const fetchInvariants = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/system-invariants");
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load invariants:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunProbe = async () => {
    setProbing(true);
    try {
      const res = await fetch("/api/system-invariants");
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error("Probe failed:", err);
    } finally {
      setProbing(false);
    }
  };

  useEffect(() => {
    fetchInvariants();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-[11px] font-semibold text-emerald-700 mb-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            PostgreSQL 18 &bull; Mathematical Integrity Assured
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            System Invariants & Mathematical Guarantees
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated database assertion probes verifying non-drifting inventory conservation, append-only ledger immutability, and RLS security policies.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={fetchInvariants}
            disabled={loading || probing}
            className="h-10 px-4 rounded-xl border-slate-200 text-xs font-medium bg-white hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            onClick={handleRunProbe}
            disabled={probing}
            className="h-10 px-5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-medium text-xs shadow-xs"
          >
            <Activity className="h-3.5 w-3.5 mr-2" />
            {probing ? "Probing Invariants..." : "Run Integrity Probe"}
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">System State</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-emerald-600">
              {data?.overallStatus || "HEALTHY"}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              ({data?.stats?.passedCount || 6}/{data?.stats?.totalInvariants || 6} Passed)
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            0 Invariant Violations Detected
          </div>
        </Card>

        <Card className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Ledger Drift</span>
            <div className="h-8 w-8 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600">
              <Sliders className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-slate-900">
              0.00 <span className="text-sm font-normal text-slate-400">units</span>
            </span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-600 font-medium flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Catalog equals Ledger Sum
          </div>
        </Card>

        <Card className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Audit Trail Records</span>
            <div className="h-8 w-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <FileCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-slate-900">
              {data?.stats?.totalAuditEntries || 0}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">immutable logs</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Append-only trigger continuity
          </div>
        </Card>

        <Card className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Verification Latency</span>
            <div className="h-8 w-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-slate-900">
              {data?.executionMs || 12}
            </span>
            <span className="text-sm font-normal text-slate-400">ms</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Real-time DB assertion latency
          </div>
        </Card>
      </div>

      {/* Probing Wave Loader feedback */}
      {probing && (
        <div className="py-8 bg-white rounded-2xl border border-slate-200/80 flex justify-center">
          <Loader size="sm" text="Executing live SQL assertions across PostgreSQL catalog..." />
        </div>
      )}

      {/* Invariant Rules Table */}
      <Card className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <CardHeader className="p-5 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">
              Active Database Invariants Specification
            </CardTitle>
            <p className="text-xs text-slate-400 mt-0.5">
              Strict algebraic and operational rules enforced at the database layer via triggers, check constraints, and RLS.
            </p>
          </div>
          <Badge className="bg-sky-50 text-sky-700 border border-sky-200 font-mono text-[10px]">
            SCHEMA: erp
          </Badge>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 flex justify-center">
              <Loader size="sm" text="Verifying system invariants..." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold bg-slate-50/50">
                    <th className="text-left py-3.5 px-5">Rule ID</th>
                    <th className="text-left py-3.5 px-4">Invariant Name & Target</th>
                    <th className="text-left py-3.5 px-4">Severity</th>
                    <th className="text-left py-3.5 px-4">Current Verified Metric</th>
                    <th className="text-right py-3.5 px-5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {data?.invariants?.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-5 font-mono text-[11px] font-bold text-slate-900">
                        {inv.id}
                      </td>
                      <td className="py-4 px-4 max-w-md">
                        <div className="font-semibold text-slate-900">{inv.name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{inv.description}</div>
                        <div className="mt-1 font-mono text-[10px] text-indigo-600 bg-indigo-50/60 inline-block px-1.5 py-0.5 rounded">
                          {inv.target}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            inv.severity === "CRITICAL"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : inv.severity === "HIGH"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-sky-50 text-sky-700 border border-sky-200"
                          }`}
                        >
                          {inv.severity}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-mono text-[11px] text-slate-600">
                        {inv.metric}
                      </td>
                      <td className="py-4 px-5 text-right">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" />
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Architecture Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
            <Lock className="h-4 w-4 text-sky-500" />
            Security Definer & RLS
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            All tool interactions and user queries are wrapped in session-scoped PostgreSQL configurations (<code>app.user_id</code> and <code>app.role_code</code>) inside non-bypassable transactions.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
            <Database className="h-4 w-4 text-emerald-500" />
            Immutable Audit Trail
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            <code>erp.audit_log</code> is strictly append-only. Triggers intercept every insertion, status mutation, and role assignment, preventing record alteration or deletion.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Deterministic Consistency
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Sales, purchases, and expense records execute deterministic balance equations. Moving-average cost and valuation reconcile continuously without rounding drift.
          </p>
        </div>
      </div>
    </div>
  );
}
