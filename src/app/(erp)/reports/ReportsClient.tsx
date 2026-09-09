"use client";

import React, { useEffect, useState } from "react";
import {
  Printer,
  BarChart3,
  TrendingUp,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Loader } from "@/components/ui/loader";

export function ReportsClient() {
  const [activeView, setActiveView] = useState<"profit" | "product" | "customer" | "supplier">("profit");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadView = (v: string) => {
    setLoading(true);
    fetch(`/api/reports?view=${v}`)
      .then((res) => res.json())
      .then((data) => {
        setRows(data.rows || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadView(activeView);
  }, [activeView]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Deterministic Analytics & Reports
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Replayable business intelligence views matching the project's exact revenue and margin conventions
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.print()}
          className="h-10 px-4 rounded-xl border-slate-200/80 bg-white text-slate-700 hover:bg-slate-50 shadow-xs text-xs font-medium"
        >
          <Printer className="h-4 w-4 mr-1.5" />
          Print / PDF Export
        </Button>
      </div>

      {/* View Selector Tabs */}
      <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <CardHeader className="p-5 border-b border-slate-100 bg-white">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "profit", label: "Monthly P&L", desc: "erp.v_profit_monthly" },
              { id: "product", label: "Product Performance", desc: "erp.v_product_performance" },
              { id: "customer", label: "Customer Sales", desc: "erp.v_customer_summary" },
              { id: "supplier", label: "Supplier Procurement", desc: "erp.v_supplier_summary" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveView(item.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                  activeView === item.id
                    ? "bg-sky-500 text-white font-semibold shadow-xs"
                    : "bg-slate-100/80 hover:bg-slate-200/60 text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>{item.label}</span>
                <span className={`text-[10px] font-mono ${activeView === item.id ? "text-sky-100" : "text-slate-400"}`}>
                  ({item.desc})
                </span>
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 flex justify-center">
              <Loader size="sm" text="Executing deterministic analytical database view..." />
            </div>
          ) : activeView === "profit" ? (
            /* Monthly P&L View */
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-100 hover:bg-transparent">
                    <TableHead className="text-xs text-slate-400 font-semibold pl-5">Month</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold text-right">Invoices</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold text-right">Gross Revenue</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold text-right">Discounts</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold text-right">Net Revenue</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold text-right">Snapshotted COGS</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold text-right">Gross Profit</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold text-right">Expenses</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold text-right">Operating Profit</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold text-right pr-5">Margin %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={i} className="hover:bg-slate-50/70 border-b border-slate-100/80">
                      <TableCell className="font-mono text-xs font-semibold text-sky-600 pl-5">
                        {formatDate(r.month)}
                      </TableCell>
                      <TableCell className="text-xs text-right text-slate-600 font-mono">
                        {r.invoice_count}
                      </TableCell>
                      <TableCell className="text-xs text-right text-slate-600 font-mono">
                        {formatCurrency(r.gross_revenue)}
                      </TableCell>
                      <TableCell className="text-xs text-right text-amber-600 font-mono">
                        -{formatCurrency(r.total_discount)}
                      </TableCell>
                      <TableCell className="text-xs text-right font-semibold text-slate-900 font-mono">
                        {formatCurrency(r.net_revenue)}
                      </TableCell>
                      <TableCell className="text-xs text-right text-rose-600 font-mono">
                        {formatCurrency(r.total_cogs)}
                      </TableCell>
                      <TableCell className="text-xs text-right font-semibold text-emerald-600 font-mono">
                        {formatCurrency(r.gross_profit)}
                      </TableCell>
                      <TableCell className="text-xs text-right text-slate-600 font-mono">
                        {formatCurrency(r.total_expenses)}
                      </TableCell>
                      <TableCell
                        className={`text-xs text-right font-bold font-mono ${
                          Number(r.operating_profit) >= 0 ? "text-emerald-700" : "text-rose-600"
                        }`}
                      >
                        {formatCurrency(r.operating_profit)}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono font-semibold pr-5">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] ${
                            Number(r.net_margin_percent) >= 20
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {Number(r.net_margin_percent || 0).toFixed(1)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : activeView === "product" ? (
            /* Product Performance View */
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-100 hover:bg-transparent">
                    <TableHead className="text-xs text-slate-400 font-semibold pl-5">SKU</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold">Product Name</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold text-right">Units Sold</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold text-right">Gross Revenue</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold text-right">Snapshotted COGS</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold text-right">Gross Profit</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold text-right pr-5">Margin %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={i} className="hover:bg-slate-50/70 border-b border-slate-100/80">
                      <TableCell className="font-mono text-xs font-semibold text-sky-600 pl-5">
                        {r.sku}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-900">
                        {r.product_name}
                      </TableCell>
                      <TableCell className="text-xs text-right font-medium text-slate-800 font-mono">
                        {r.units_sold} {r.unit}
                      </TableCell>
                      <TableCell className="text-xs text-right text-slate-900 font-mono">
                        {formatCurrency(r.gross_revenue)}
                      </TableCell>
                      <TableCell className="text-xs text-right text-rose-600 font-mono">
                        {formatCurrency(r.cogs)}
                      </TableCell>
                      <TableCell className="text-xs text-right font-bold text-emerald-600 font-mono">
                        {formatCurrency(r.gross_profit)}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono pr-5">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                          {Number(r.margin_percent || 0).toFixed(1)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : activeView === "customer" ? (
            /* Customer Summary View */
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-100 hover:bg-transparent">
                    <TableHead className="text-xs text-slate-400 font-semibold pl-5">Code</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold">Customer Name</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold text-right">Invoices</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold text-right">Gross Spend</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold text-right">Discounts Received</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold text-right">Net Invoiced</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold text-right pr-5">Outstanding Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={i} className="hover:bg-slate-50/70 border-b border-slate-100/80">
                      <TableCell className="font-mono text-xs font-semibold text-sky-600 pl-5">
                        {r.customer_code}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-900">
                        {r.customer_name}
                      </TableCell>
                      <TableCell className="text-xs text-right text-slate-600 font-mono">
                        {r.invoice_count}
                      </TableCell>
                      <TableCell className="text-xs text-right text-slate-600 font-mono">
                        {formatCurrency(r.gross_revenue)}
                      </TableCell>
                      <TableCell className="text-xs text-right text-amber-600 font-mono">
                        {formatCurrency(r.total_discount)}
                      </TableCell>
                      <TableCell className="text-xs text-right font-bold text-slate-900 font-mono">
                        {formatCurrency(r.net_revenue)}
                      </TableCell>
                      <TableCell className="text-xs text-right font-bold text-amber-600 font-mono pr-5">
                        {formatCurrency(r.outstanding_balance)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            /* Supplier Summary View */
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-100 hover:bg-transparent">
                    <TableHead className="text-xs text-slate-400 font-semibold pl-5">Supplier Code</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold">Supplier Name</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold text-right">PO Count</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold text-right">Total Procurement</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold text-right">Taxes Paid</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold text-right">Settled Amount</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold text-right pr-5">Payable Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={i} className="hover:bg-slate-50/70 border-b border-slate-100/80">
                      <TableCell className="font-mono text-xs font-semibold text-sky-600 pl-5">
                        {r.supplier_code}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-900">
                        {r.supplier_name}
                      </TableCell>
                      <TableCell className="text-xs text-right text-slate-600 font-mono">
                        {r.po_count}
                      </TableCell>
                      <TableCell className="text-xs text-right font-bold text-slate-900 font-mono">
                        {formatCurrency(r.total_purchased)}
                      </TableCell>
                      <TableCell className="text-xs text-right text-slate-500 font-mono">
                        {formatCurrency(r.total_tax)}
                      </TableCell>
                      <TableCell className="text-xs text-right text-emerald-600 font-mono">
                        {formatCurrency(r.total_paid)}
                      </TableCell>
                      <TableCell className="text-xs text-right font-bold text-rose-600 font-mono pr-5">
                        {formatCurrency(r.outstanding_payable)}
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
