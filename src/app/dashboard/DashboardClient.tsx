"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  DollarSign,
  Package,
  AlertTriangle,
  ShoppingCart,
  ArrowUpRight,
  ArrowRight,
  CheckCircle,
  MoreVertical,
  Boxes,
  Bot,
  Activity,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";

interface DashboardClientProps {
  userRole: string;
}

export function DashboardClient({ userRole }: DashboardClientProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500 text-sm font-medium">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
          Loading authoritative ERP metrics...
        </div>
      </div>
    );
  }

  const stats = data?.stats || {};
  const monthly = data?.monthlyTrends || [];
  const recentSales = data?.recentSales || [];
  const lowStock = data?.lowStockProducts || [];

  const marginPct = stats.totalRevenue > 0
    ? ((stats.grossProfit / stats.totalRevenue) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-6">
      {/* Vantus Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Operational Intelligence Overview
            </h1>
            <span className="bg-sky-50 text-sky-700 font-semibold text-[11px] px-2.5 py-0.5 rounded-full border border-sky-200/60 font-mono">
              Deterministic v1.0
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative figures derived directly from PostgreSQL views & immutable triggers
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/sales/new">
            <Button size="sm" className="h-9 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-medium shadow-sm shadow-sky-500/20 text-xs">
              <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
              Create Sales Invoice
            </Button>
          </Link>
          <Link href="/ai-assistant">
            <Button size="sm" variant="outline" className="h-9 px-4 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs">
              <Bot className="h-3.5 w-3.5 mr-1.5 text-sky-500" />
              Ask AI Agent
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI METRICS ROW: 3 Cards matching Screenshot 1 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Total Sales / Net Confirmed Revenue */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Net Revenue</span>
            <button className="text-slate-400 hover:text-slate-600">
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 tracking-tight">
            {formatCurrency(stats.totalRevenue)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px]">{stats.confirmedInvoices} confirmed invoices</span>
            <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md flex items-center gap-0.5 text-[11px]">
              <ArrowUpRight className="h-3 w-3 stroke-[2.5]" /> Excludes tax
            </span>
          </div>
        </div>

        {/* Total Gross Profit */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              {userRole !== "USER" ? "Total Gross Profit" : "Processed Sales"}
            </span>
            <button className="text-slate-400 hover:text-slate-600">
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 tracking-tight">
            {userRole !== "USER" ? formatCurrency(stats.grossProfit) : `${stats.confirmedInvoices} Orders`}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px]">
              {userRole !== "USER" ? `COGS: ${formatCurrency(stats.totalCogs)}` : "Posted to physical stock"}
            </span>
            <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md flex items-center gap-0.5 text-[11px]">
              <ArrowUpRight className="h-3 w-3 stroke-[2.5]" /> Snapshotted
            </span>
          </div>
        </div>

        {/* Profitability Margin or Stock Watch */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              {userRole !== "USER" ? "Profitability Margin" : "Stockout Risk"}
            </span>
            <button className="text-slate-400 hover:text-slate-600">
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 tracking-tight">
            {userRole !== "USER" ? `${marginPct}%` : `${stats.lowStockCount} Items`}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px]">
              {userRole !== "USER" ? `Overhead: ${formatCurrency(stats.totalExpenses)}` : `${stats.outOfStockCount} out of stock`}
            </span>
            <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md flex items-center gap-0.5 text-[11px]">
              <ArrowUpRight className="h-3 w-3 stroke-[2.5]" /> Deterministic
            </span>
          </div>
        </div>
      </div>

      {/* Analytics Chart Card */}
      {monthly.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Revenue, Cost & Profitability Trends
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Deterministic monthly performance from view <code className="text-sky-600 font-mono text-[11px]">erp.v_profit_monthly</code>
              </p>
            </div>
            <span className="bg-slate-50 text-slate-600 font-medium text-xs px-2.5 py-1 rounded-lg border border-slate-200">
              Monthly Aggregation
            </span>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(val) => `₹${val / 1000}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderColor: "#e2e8f0",
                    borderRadius: "0.75rem",
                    fontSize: "12px",
                    color: "#0f172a",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.08)",
                  }}
                  formatter={(val: any) => formatCurrency(val)}
                />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                <Bar dataKey="net_revenue" name="Net Revenue" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cogs" name="COGS" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                {userRole !== "USER" && (
                  <Bar dataKey="gross_profit" name="Gross Profit" fill="#10b981" radius={[4, 4, 0, 0]} />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Lower Dual Columns: Recent Invoices & Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Recent Invoices Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-sky-500" />
                Recent Sales Invoices
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Latest transaction headers
              </p>
            </div>
            <Link href="/sales">
              <Button variant="ghost" size="sm" className="text-xs text-sky-600 hover:text-sky-700 hover:bg-sky-50 h-8">
                View All <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>

          <div className="overflow-x-auto">
            {recentSales.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No invoices recorded yet. Click <strong>+ New Sale</strong> to create your first draft invoice!
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-medium">
                    <th className="text-left pb-2 font-semibold">Invoice #</th>
                    <th className="text-left pb-2 font-semibold">Customer</th>
                    <th className="text-left pb-2 font-semibold">Date</th>
                    <th className="text-right pb-2 font-semibold">Total</th>
                    <th className="text-center pb-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentSales.map((inv: any) => (
                    <tr key={inv.sales_invoice_id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 font-mono font-semibold text-sky-600 hover:underline">
                        <Link href={`/sales/${inv.sales_invoice_id}`}>{inv.invoice_no}</Link>
                      </td>
                      <td className="py-2.5 font-medium text-slate-800">{inv.customer_name}</td>
                      <td className="py-2.5 text-slate-400">{formatDate(inv.invoice_date)}</td>
                      <td className="py-2.5 text-right font-bold text-slate-900">{formatCurrency(inv.total_amount)}</td>
                      <td className="py-2.5 text-center">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                          inv.status === "CONFIRMED"
                            ? "bg-emerald-50 text-emerald-700"
                            : inv.status === "DRAFT"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-rose-50 text-rose-700"
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Low Stock Alerts Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Inventory Reorder Watchlist
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Items currently at or below minimum threshold
              </p>
            </div>
            <Link href="/inventory">
              <Button variant="ghost" size="sm" className="text-xs text-sky-600 hover:text-sky-700 hover:bg-sky-50 h-8">
                Inventory Hub <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>

          <div className="overflow-x-auto">
            {lowStock.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <CheckCircle className="h-6 w-6 text-emerald-500" />
                <span>All product stock levels are above reorder thresholds.</span>
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-medium">
                    <th className="text-left pb-2 font-semibold">SKU & Item</th>
                    <th className="text-left pb-2 font-semibold">Category</th>
                    <th className="text-right pb-2 font-semibold">Stock</th>
                    <th className="text-right pb-2 font-semibold">Threshold</th>
                    <th className="text-center pb-2 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lowStock.map((prod: any) => (
                    <tr key={prod.product_id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5">
                        <div className="font-semibold text-slate-900">{prod.name}</div>
                        <div className="font-mono text-[10px] text-slate-400">{prod.sku}</div>
                      </td>
                      <td className="py-2.5 text-slate-500">{prod.category_name || "General"}</td>
                      <td className="py-2.5 text-right font-bold text-amber-600">{Number(prod.stock_on_hand)}</td>
                      <td className="py-2.5 text-right text-slate-400">{Number(prod.reorder_level)}</td>
                      <td className="py-2.5 text-center">
                        <Link href="/purchases/new">
                          <Button size="sm" variant="outline" className="text-[10px] h-6 px-2 border-slate-200 hover:bg-slate-50">
                            Restock
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
