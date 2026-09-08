"use client";

import React, { useEffect, useState } from "react";
import {
  Bot,
  Play,
  ShieldAlert,
  ShieldCheck,
  Cpu,
  Layers,
  Terminal,
  Brain,
  Scale,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface AiAssistantClientProps {
  userRole: "ADMIN" | "MANAGER" | "USER";
  userId: number;
}

export function AiAssistantClient({ userRole, userId }: AiAssistantClientProps) {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [selectedTool, setSelectedTool] = useState("get_sales_summary");
  const [executing, setExecuting] = useState(false);
  const [execResult, setExecResult] = useState<any>(null);

  // Tool parameter states
  const [startDate, setStartDate] = useState("2026-01-01");
  const [endDate, setEndDate] = useState("2026-12-31");
  const [horizonDays, setHorizonDays] = useState("14");
  const [belowReorderOnly, setBelowReorderOnly] = useState(true);

  useEffect(() => {
    fetch("/api/tools/profiles")
      .then((res) => res.json())
      .then((d) => {
        setProfiles(d.profiles || []);
        setModels(d.models || []);
      })
      .catch(() => {});
  }, []);

  const toolDefinitions: Record<string, { label: string; scope: string; desc: string }> = {
    get_sales_summary: {
      label: "tools.get_sales_summary(start_date, end_date)",
      scope: "SALES",
      desc: "Aggregates net revenue, discounts, tax, and confirmed order volume.",
    },
    get_discount_analysis: {
      label: "tools.get_discount_analysis(start_date, end_date)",
      scope: "SALES",
      desc: "Computes effective discount rate and average customer concessions.",
    },
    get_stockout_risk: {
      label: "tools.get_stockout_risk(horizon_days)",
      scope: "INVENTORY",
      desc: "Runs runout forecasting based on 30-day velocity against stock on hand.",
    },
    get_inventory_status: {
      label: "tools.get_inventory_status(below_reorder_only)",
      scope: "INVENTORY",
      desc: "Evaluates current stock levels against minimum reorder boundaries.",
    },
    get_profit_breakdown: {
      label: "tools.get_profit_breakdown(start_date, end_date)",
      scope: "FINANCE",
      desc: "Deterministic gross profit, fixed vs variable costs, and operating margins. (ADMIN/MANAGER only).",
    },
    compare_periods: {
      label: "tools.compare_periods(cur_start, cur_end, prev_start, prev_end)",
      scope: "FINANCE",
      desc: "Period-over-period variance analysis on revenue, COGS and profit. (ADMIN/MANAGER only).",
    },
  };

  const handleExecuteTool = async () => {
    setExecuting(true);
    setExecResult(null);

    let params: any[] = [];
    if (selectedTool === "get_sales_summary" || selectedTool === "get_discount_analysis") {
      params = [startDate, endDate];
    } else if (selectedTool === "get_profit_breakdown") {
      params = [startDate, endDate];
    } else if (selectedTool === "compare_periods") {
      params = [startDate, endDate, "2025-01-01", "2025-12-31"];
    } else if (selectedTool === "get_stockout_risk") {
      params = [Number(horizonDays)];
    } else if (selectedTool === "get_inventory_status") {
      params = [belowReorderOnly];
    }

    try {
      const res = await fetch("/api/tools/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toolName: selectedTool,
          params,
        }),
      });

      const data = await res.json();
      setExecResult(data);
    } catch (err: any) {
      setExecResult({
        success: false,
        error: err.message,
      });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Research Project Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100 shadow-xs">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                AI Decision Support & Controlled Tools Surface
              </h1>
              <p className="text-xs text-slate-500">
                Evidence-Grounded Multi-Agent Intelligence Architecture
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200 font-mono">
            GLA University B.Tech Research
          </span>
        </div>
        <p className="text-xs text-slate-600 max-w-4xl leading-relaxed">
          The research contribution evaluates an <strong>evidence-weighted consensus mechanism</strong> across
          specialist Sales, Inventory, and Finance agents. To prevent hallucination, the AI service holds zero table
          privileges on business tables. It calls only whitelisted, parameterized <code className="text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded font-mono text-[11px]">SECURITY DEFINER</code> functions
          in the <code className="text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded font-mono text-[11px]">tools</code> schema.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controlled Tools Execution Sandbox */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <CardHeader className="p-5 border-b border-slate-100 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-900">
                    <Terminal className="h-4 w-4 text-sky-500" />
                    Controlled Tools Execution Sandbox
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Execute whitelisted database functions with authenticated role context
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-slate-400">Active Role:</span>
                  <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                    {userRole}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {/* Tool Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">
                  Select Function in tools.*
                </label>
                <select
                  value={selectedTool}
                  onChange={(e) => {
                    setSelectedTool(e.target.value);
                    setExecResult(null);
                  }}
                  className="w-full h-10 rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-xs font-mono text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 shadow-xs"
                >
                  {Object.entries(toolDefinitions).map(([key, def]) => (
                    <option key={key} value={key}>
                      [{def.scope}] {def.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500">
                  {toolDefinitions[selectedTool]?.desc}
                </p>
              </div>

              {/* Dynamic Parameter Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50/70 border border-slate-200/60 text-xs">
                {(selectedTool.includes("sales") ||
                  selectedTool.includes("profit") ||
                  selectedTool.includes("discount") ||
                  selectedTool.includes("compare")) && (
                  <>
                    <div className="space-y-1">
                      <label className="text-slate-600 font-semibold">Start Date</label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="h-9 rounded-xl border-slate-200 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-600 font-semibold">End Date</label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="h-9 rounded-xl border-slate-200 text-xs"
                      />
                    </div>
                  </>
                )}

                {selectedTool === "get_stockout_risk" && (
                  <div className="space-y-1">
                    <label className="text-slate-600 font-semibold">Forecast Horizon (Days)</label>
                    <Input
                      type="number"
                      value={horizonDays}
                      onChange={(e) => setHorizonDays(e.target.value)}
                      className="h-9 rounded-xl border-slate-200 text-xs"
                    />
                  </div>
                )}

                {selectedTool === "get_inventory_status" && (
                  <div className="flex items-center gap-2 pt-5">
                    <input
                      type="checkbox"
                      id="belowReorder"
                      checked={belowReorderOnly}
                      onChange={(e) => setBelowReorderOnly(e.target.checked)}
                      className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                    <label htmlFor="belowReorder" className="text-slate-700 font-medium cursor-pointer">
                      Only items below minimum reorder level
                    </label>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="flex justify-end pt-1">
                <Button
                  onClick={handleExecuteTool}
                  disabled={executing}
                  className="h-10 px-5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-medium text-xs shadow-xs"
                >
                  <Play className="h-3.5 w-3.5 mr-1.5" />
                  {executing ? "Executing in DB Sandbox..." : "Run Security Definer Probe"}
                </Button>
              </div>

              {/* Execution Result Terminal Display */}
              {execResult && (
                <div className="mt-4 p-4 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono space-y-2 border border-slate-800">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-emerald-400 flex items-center gap-1.5 font-semibold">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Status: {execResult.success ? "200 OK - Deterministic Evidence Grounded" : "FAILED / RLS BLOCKED"}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Audit Execution Logged
                    </span>
                  </div>

                  {execResult.error ? (
                    <div className="text-rose-400 py-2">
                      Error: {execResult.error}
                    </div>
                  ) : (
                    <pre className="overflow-x-auto max-h-64 py-2 text-[11px] leading-relaxed scrollbar-thin">
                      {JSON.stringify(execResult.data, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Multi-Agent Architecture Sidebar */}
        <div className="space-y-4">
          <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <CardHeader className="p-5 border-b border-slate-100 bg-white">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-900">
                <Scale className="h-4 w-4 text-sky-500" />
                Specialist Consensus Grid
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Multi-agent tri-domain evidence weighting
              </p>
            </CardHeader>
            <CardContent className="p-5 space-y-3.5">
              <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Sales Specialist</span>
                  <span className="font-mono text-[11px] font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded">
                    Weight 0.35
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Evaluates demand trends, net revenue velocity, discount leakage, and customer volume.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Inventory Specialist</span>
                  <span className="font-mono text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                    Weight 0.35
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Monitors stock runout horizons, warehouse bottlenecks, and supplier replenishment lead times.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Finance Specialist</span>
                  <span className="font-mono text-[11px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                    Weight 0.30
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Audits gross margins, fixed vs variable operating cost overhead, and net profitability.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <CardHeader className="p-5 border-b border-slate-100 bg-white">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-900">
                <ShieldAlert className="h-4 w-4 text-sky-500" />
                Security Boundary Assertions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-2.5 text-xs text-slate-600">
              <div className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-sky-500 mt-1.5 shrink-0" />
                <span>Zero direct SELECT/INSERT/UPDATE grants on raw tables in <code className="text-slate-800 font-mono text-[11px]">erp.*</code> schema</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-sky-500 mt-1.5 shrink-0" />
                <span>Functions run under <code className="text-slate-800 font-mono text-[11px]">erp_tools_owner</code> with explicit schema search path</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-sky-500 mt-1.5 shrink-0" />
                <span>Financial tools assert <code className="text-slate-800 font-mono text-[11px]">current_setting(&apos;app.current_user_role&apos;)</code> at runtime</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
