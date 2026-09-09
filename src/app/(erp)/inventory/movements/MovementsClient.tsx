"use client";

import React, { useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  Calendar,
  ChevronDown,
  Filter,
  RefreshCw,
  Search,
  ShieldCheck,
  Tag,
  Warehouse as WarehouseIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import Loader from "@/components/ui/loader";

export function MovementsClient() {
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const loadMovements = () => {
    setLoading(true);
    fetch("/api/inventory")
      .then((res) => res.json())
      .then((data) => {
        setLedger(data.ledger || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadMovements();
  }, []);

  // Filter logic
  const filteredLedger = ledger.filter((m) => {
    const matchesSearch =
      m.product_name?.toLowerCase().includes(search.toLowerCase()) ||
      m.sku?.toLowerCase().includes(search.toLowerCase()) ||
      m.reference_doc?.toLowerCase().includes(search.toLowerCase()) ||
      m.notes?.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (typeFilter === "ALL") return true;
    if (typeFilter === "INFLOW") {
      return ["PURCHASE_IN", "RETURN_IN", "OPENING", "ADJUSTMENT_IN"].includes(
        m.movement_type
      );
    }
    if (typeFilter === "OUTFLOW") {
      return ["SALE_OUT", "DAMAGE_OUT", "RETURN_OUT", "ADJUSTMENT_OUT"].includes(
        m.movement_type
      );
    }
    return m.movement_type === typeFilter;
  });

  // KPI Calculations
  const totalInflow = ledger
    .filter((m) => Number(m.signed_quantity) > 0)
    .reduce((sum, m) => sum + Number(m.quantity || 0), 0);

  const totalOutflow = ledger
    .filter((m) => Number(m.signed_quantity) < 0)
    .reduce((sum, m) => sum + Number(m.quantity || 0), 0);

  const netUnits = totalInflow - totalOutflow;

  const getTypeBadgeStyle = (type: string) => {
    switch (type) {
      case "PURCHASE_IN":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "SALE_OUT":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "OPENING":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "ADJUSTMENT_IN":
      case "ADJUSTMENT_OUT":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "DAMAGE_OUT":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Boxes className="h-6 w-6 text-sky-500" />
            Stock Movements & Audit Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative, append-only inventory ledger recorded by database transactions & triggers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadMovements}
            className="h-10 px-3.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Inflow</span>
            <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownLeft className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            +{totalInflow.toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">
            Purchases & Returns In
          </div>
        </Card>

        <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Outflow</span>
            <div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            -{totalOutflow.toLocaleString()}
          </div>
          <div className="text-[11px] text-blue-600 font-medium mt-1">
            Sales & Dispatches Out
          </div>
        </Card>

        <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Net Movement</span>
            <div className="h-7 w-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Boxes className="h-4 w-4" />
            </div>
          </div>
          <div
            className={`text-2xl font-bold mt-2 font-mono ${
              netUnits >= 0 ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            {netUnits >= 0 ? `+${netUnits.toLocaleString()}` : netUnits.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            Current Net Change
          </div>
        </Card>

        <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Ledger Entries</span>
            <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
            {ledger.length}
          </div>
          <div className="text-[11px] text-indigo-600 font-medium mt-1">
            100% Append-Only Integrity
          </div>
        </Card>
      </div>

      {/* Main Ledger Table Card */}
      <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <CardHeader className="p-5 border-b border-slate-100 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100/80 border border-slate-200/60 w-fit overflow-x-auto">
              {[
                { id: "ALL", label: `All (${ledger.length})` },
                { id: "INFLOW", label: "Inflow" },
                { id: "OUTFLOW", label: "Outflow" },
                { id: "PURCHASE_IN", label: "Purchases" },
                { id: "SALE_OUT", label: "Sales" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTypeFilter(tab.id)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
                    typeFilter === tab.id
                      ? "bg-sky-500 text-white shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search SKU, product, doc..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 rounded-xl border-slate-200/80 text-xs"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <Loader size="sm" text="Loading stock ledger records..." />
          ) : filteredLedger.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400 font-medium">
              No stock movements found matching current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-100 hover:bg-transparent">
                    <TableHead className="text-xs text-slate-400 font-semibold pl-5">
                      Log ID
                    </TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold">
                      Date & Time
                    </TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold">
                      Movement Type
                    </TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold">
                      Product & SKU
                    </TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold">
                      Facility
                    </TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold text-right">
                      Quantity
                    </TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold text-right">
                      Unit Cost
                    </TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold">
                      Reference Document
                    </TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold pr-5">
                      Actor
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLedger.map((m) => {
                    const isPositive = Number(m.signed_quantity) > 0;
                    return (
                      <TableRow
                        key={m.movement_id}
                        className="hover:bg-slate-50/70 border-b border-slate-100/80"
                      >
                        <TableCell className="font-mono text-xs text-slate-400 pl-5">
                          #{m.movement_id}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 font-mono whitespace-nowrap">
                          {new Date(m.created_at || m.movement_date).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border ${getTypeBadgeStyle(
                              m.movement_type
                            )}`}
                          >
                            {m.movement_type}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-xs text-slate-900">
                            {m.product_name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {m.sku}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-slate-600">
                          {m.warehouse_name || "WH-MAIN"}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md ${
                              isPositive
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {isPositive ? `+${m.quantity}` : `-${m.quantity}`}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-slate-700 text-right">
                          {m.unit_cost ? formatCurrency(m.unit_cost) : "-"}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-sky-600">
                          {m.reference_doc || m.reference_type || "Direct Movement"}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 pr-5">
                          {m.created_by_name || "System Automation"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
