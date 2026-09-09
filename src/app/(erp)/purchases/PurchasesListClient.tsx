"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  ShoppingCart,
  CheckCircle2,
  Clock,
  MoreVertical,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Loader } from "@/components/ui/loader";

export function PurchasesListClient() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const loadInvoices = () => {
    setLoading(true);
    const url = activeTab === "ALL" ? "/api/purchases" : `/api/purchases?status=${activeTab}`;
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
      inv.supplier_name.toLowerCase().includes(search.toLowerCase())
  );

  const totalProcurement = invoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
  const confirmedCount = invoices.filter((inv) => inv.status === "CONFIRMED").length;
  const draftCount = invoices.filter((inv) => inv.status === "DRAFT").length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Purchase Orders</h1>
          <p className="text-xs text-slate-500 mt-1">
            Supplier procurement entries that recalibrate moving-average unit cost price and stock on hand
          </p>
        </div>
        <Link href="/purchases/new">
          <Button className="h-10 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-medium shadow-xs transition-colors">
            <Plus className="h-4 w-4 mr-1.5" />
            New Purchase Invoice
          </Button>
        </Link>
      </div>

      {/* 3-Card KPI Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Procurement Value</span>
            <button className="text-slate-400 hover:text-slate-600">
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 font-mono">
              {formatCurrency(totalProcurement)}
            </span>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              <TrendingUp className="h-3 w-3" />
              <span>↑ Active</span>
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Confirmed Orders Posted</span>
            <button className="text-slate-400 hover:text-slate-600">
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 font-mono">
              {confirmedCount} Orders
            </span>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="h-3 w-3" />
              <span>In Stock</span>
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Draft Invoices Awaiting Intake</span>
            <button className="text-slate-400 hover:text-slate-600">
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-amber-600 font-mono">
              {draftCount} Drafts
            </span>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              <Clock className="h-3 w-3" />
              <span>Pending Intake</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <CardHeader className="p-5 border-b border-slate-100 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Vantus Tab Pill Switcher */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100/80 border border-slate-200/60 w-fit">
              {(["ALL", "CONFIRMED", "DRAFT"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition-all ${
                    activeTab === tab
                      ? "bg-sky-500 text-white shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search purchase order or supplier..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs h-9 rounded-xl border-slate-200/80 bg-slate-50/50 focus-visible:bg-white focus-visible:ring-sky-500"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 flex justify-center">
              <Loader size="sm" text="Loading purchase invoices..." />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500">
              No purchase orders recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-100 hover:bg-transparent">
                    <TableHead className="text-xs text-slate-400 font-semibold pl-5">Invoice #</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold">Date</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold">Supplier Account</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold text-right">Subtotal</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold text-right">Tax</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold text-right">Total Amount</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold">Payment Status</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold pr-5">Invoice Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((inv) => (
                    <TableRow key={inv.purchase_invoice_id} className="hover:bg-slate-50/70 border-b border-slate-100/80">
                      <TableCell className="font-mono text-xs font-semibold text-sky-600 pl-5">
                        {inv.invoice_no}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {formatDate(inv.invoice_date)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-xs text-slate-900">{inv.supplier_name}</div>
                        <div className="text-[10px] text-sky-600 font-mono">{inv.supplier_code}</div>
                      </TableCell>
                      <TableCell className="text-xs text-right text-slate-600 font-mono">
                        {formatCurrency(inv.subtotal)}
                      </TableCell>
                      <TableCell className="text-xs text-right text-slate-400 font-mono">
                        {formatCurrency(inv.tax_amount)}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-right text-slate-900 font-mono">
                        {formatCurrency(inv.total_amount)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                            inv.payment_status === "PAID"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : inv.payment_status === "PARTIAL"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {inv.payment_status}
                        </span>
                      </TableCell>
                      <TableCell className="pr-5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                            inv.status === "CONFIRMED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
