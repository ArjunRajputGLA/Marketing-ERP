"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Eye, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

export function SalesListClient() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const loadInvoices = () => {
    setLoading(true);
    const url = activeTab === "ALL" ? "/api/sales" : `/api/sales?status=${activeTab}`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setInvoices(data.invoices || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadInvoices();
  }, [activeTab]);

  const filtered = invoices.filter(
    (inv) =>
      inv.invoice_no.toLowerCase().includes(search.toLowerCase()) ||
      inv.customer_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Sales Invoices</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Authoritative billing entries with immutable stock movements upon confirmation
          </p>
        </div>
        <Link href="/sales/new">
          <Button className="h-10 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-medium shadow-sm shadow-sky-500/20 text-xs">
            <Plus className="h-4 w-4 mr-1.5" />
            New Sales Invoice
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100/80 border border-slate-200/60">
            {(["ALL", "CONFIRMED", "DRAFT", "CANCELLED"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  activeTab === tab
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search invoice or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-xs h-9 rounded-xl border-slate-200"
            />
          </div>
        </div>

        <div>
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Loading sales invoices...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No sales invoices found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-medium">
                    <th className="text-left pb-3 font-semibold">Invoice #</th>
                    <th className="text-left pb-3 font-semibold">Date</th>
                    <th className="text-left pb-3 font-semibold">Customer</th>
                    <th className="text-right pb-3 font-semibold">Subtotal</th>
                    <th className="text-right pb-3 font-semibold">Tax</th>
                    <th className="text-right pb-3 font-semibold">Total Amount</th>
                    <th className="text-center pb-3 font-semibold">Payment</th>
                    <th className="text-center pb-3 font-semibold">Workflow</th>
                    <th className="text-right pb-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((inv) => (
                    <tr key={inv.sales_invoice_id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 font-mono font-semibold text-sky-600 hover:underline">
                        <Link href={`/sales/${inv.sales_invoice_id}`}>
                          {inv.invoice_no}
                        </Link>
                      </td>
                      <td className="py-3 text-slate-400 font-medium">
                        {formatDate(inv.invoice_date)}
                      </td>
                      <td className="py-3">
                        <div className="font-semibold text-xs text-slate-900">{inv.customer_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{inv.customer_code}</div>
                      </td>
                      <td className="py-3 text-right font-medium text-slate-700">
                        {formatCurrency(inv.subtotal)}
                      </td>
                      <td className="py-3 text-right text-slate-400">
                        {formatCurrency(inv.tax_amount)}
                      </td>
                      <td className="py-3 text-right font-bold text-slate-900">
                        {formatCurrency(inv.total_amount)}
                      </td>
                      <td className="py-3 text-center">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                          inv.payment_status === "PAID"
                            ? "bg-emerald-50 text-emerald-700"
                            : inv.payment_status === "PARTIAL"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-rose-50 text-rose-700"
                        }`}>
                          {inv.payment_status}
                        </span>
                      </td>
                      <td className="py-3 text-center">
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
                      <td className="py-3 text-right">
                        <Link href={`/sales/${inv.sales_invoice_id}`}>
                          <button className="h-7 px-2.5 rounded-lg text-xs font-semibold text-sky-600 hover:bg-sky-50 transition-colors inline-flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            View
                          </button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
