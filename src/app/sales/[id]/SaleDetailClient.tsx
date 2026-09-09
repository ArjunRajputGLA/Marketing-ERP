"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Printer,
  Boxes,
  Sparkles,
  Building2,
  Calendar,
  Wallet,
  Clock,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader } from "@/components/ui/loader";
import { formatCurrency, formatDate } from "@/lib/utils";

interface SaleDetailClientProps {
  invoiceId: number;
  userRole: string;
}

export function SaleDetailClient({ invoiceId, userRole }: SaleDetailClientProps) {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payAmount, setPayAmount] = useState<string>("");
  const [payMethod, setPayMethod] = useState("UPI");
  const [payRef, setPayRef] = useState("");
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const loadInvoice = () => {
    fetch(`/api/sales/${invoiceId}`)
      .then((res) => res.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else {
          setData(d);
          const remaining = Number(d.invoice.total_amount) - Number(d.invoice.amount_paid);
          if (remaining > 0) setPayAmount(remaining.toFixed(2));
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadInvoice();
  }, [invoiceId]);

  const handleConfirmInvoice = async () => {
    setConfirming(true);
    try {
      const res = await fetch(`/api/sales/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CONFIRM" }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to confirm invoice.");
      loadInvoice();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setConfirming(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecordingPayment(true);
    try {
      const res = await fetch(`/api/sales/${invoiceId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(payAmount),
          method: payMethod,
          referenceNo: payRef,
        }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to record payment.");

      setShowPaymentModal(false);
      setPayRef("");
      loadInvoice();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRecordingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex justify-center">
        <Loader text={`Loading invoice #${invoiceId}...`} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
          {error || "Invoice not found"}
        </div>
        <Link href="/sales">
          <Button variant="outline" size="sm" className="rounded-xl">
            Back to Sales
          </Button>
        </Link>
      </div>
    );
  }

  const { invoice, items, payments } = data;
  const balanceRemaining = Math.max(
    0,
    Number(invoice.total_amount) - Number(invoice.amount_paid)
  );

  return (
    <>
      <div className="max-w-6xl mx-auto space-y-6">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/sales">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-xl border-slate-200/80 bg-white shadow-xs hover:bg-slate-50 text-slate-700"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 font-mono">
                {invoice.invoice_no}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                  invoice.status === "CONFIRMED"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : invoice.status === "DRAFT"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}
              >
                {invoice.status}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                  invoice.payment_status === "PAID"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : invoice.payment_status === "PARTIAL"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}
              >
                {invoice.payment_status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Issued on {formatDate(invoice.invoice_date)} &bull; Primary Ledger: WH-MAIN
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {invoice.status === "DRAFT" && (
            <Button
              size="sm"
              disabled={confirming}
              onClick={handleConfirmInvoice}
              className="text-xs h-9 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-medium shadow-xs"
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              {confirming ? "Confirming..." : "Confirm & Post Stock"}
            </Button>
          )}

          {invoice.status === "CONFIRMED" && balanceRemaining > 0 && (
            <Button
              size="sm"
              onClick={() => setShowPaymentModal(true)}
              className="text-xs h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
            >
              <CreditCard className="h-3.5 w-3.5 mr-1.5" />
              Record Payment
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => window.print()}
            className="text-xs h-9 px-4 rounded-xl border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 shadow-xs"
          >
            <Printer className="h-3.5 w-3.5 mr-1.5" />
            Print Invoice
          </Button>
        </div>
      </div>

      {/* Vantus Horizontal Metadata Card with Vertical Dividers */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          {/* Customer */}
          <div className="space-y-1 pr-4">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
              <Building2 className="h-3.5 w-3.5" />
              <span>Customer</span>
            </div>
            <div className="text-sm font-semibold text-slate-900 truncate">
              {invoice.customer_name}
            </div>
            <div className="text-[11px] font-mono text-sky-600">
              {invoice.customer_code}
            </div>
          </div>

          {/* Date & Warehouse */}
          <div className="space-y-1 md:px-4 pt-3 md:pt-0">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
              <Calendar className="h-3.5 w-3.5" />
              <span>Issued Date</span>
            </div>
            <div className="text-sm font-semibold text-slate-900">
              {formatDate(invoice.invoice_date)}
            </div>
            <div className="text-[11px] text-slate-500">
              {invoice.warehouse_name || "Central Warehouse"}
            </div>
          </div>

          {/* Invoiced Amount */}
          <div className="space-y-1 md:px-4 pt-3 md:pt-0">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
              <Wallet className="h-3.5 w-3.5" />
              <span>Total Invoiced</span>
            </div>
            <div className="text-sm font-bold text-slate-900 font-mono">
              {formatCurrency(invoice.total_amount)}
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              Net: {formatCurrency(Number(invoice.subtotal) - Number(invoice.discount_amount))}
            </div>
          </div>

          {/* Balance Remaining */}
          <div className="space-y-1 md:px-4 pt-3 md:pt-0">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
              <Clock className="h-3.5 w-3.5" />
              <span>Settlement Status</span>
            </div>
            <div className={`text-sm font-bold font-mono ${balanceRemaining > 0 ? "text-amber-600" : "text-emerald-600"}`}>
              {balanceRemaining > 0 ? formatCurrency(balanceRemaining) : "Settled (₹0.00)"}
            </div>
            <div className="text-[11px] text-emerald-600 font-mono">
              Paid: {formatCurrency(invoice.amount_paid)}
            </div>
          </div>

          {/* Audit Trace */}
          <div className="space-y-1 md:pl-4 pt-3 md:pt-0">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
              <Check className="h-3.5 w-3.5" />
              <span>Created By</span>
            </div>
            <div className="text-sm font-semibold text-slate-900 truncate">
              {invoice.created_by_name || "System Admin"}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {invoice.confirmed_at ? `Confirmed ${formatDate(invoice.confirmed_at)}` : "Pending post"}
            </div>
          </div>
        </div>
      </div>

      {/* Line Items Table with Generated Stored Columns */}
      <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-900">
                <Boxes className="h-4 w-4 text-sky-500" />
                Line Items Breakdown
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Lines use PostgreSQL <code className="text-sky-600 bg-sky-50 px-1 py-0.5 rounded font-mono text-[10px]">GENERATED ALWAYS AS ... STORED</code> columns
              </p>
            </div>
            {userRole !== "USER" && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 w-fit">
                Snapshotted Moving Avg COGS Active
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-100 hover:bg-transparent">
                  <TableHead className="text-xs text-slate-400 font-semibold w-12 pl-4">#</TableHead>
                  <TableHead className="text-xs text-slate-400 font-semibold">Product & SKU</TableHead>
                  <TableHead className="text-xs text-slate-400 font-semibold text-right">Quantity</TableHead>
                  <TableHead className="text-xs text-slate-400 font-semibold text-right">Unit Price</TableHead>
                  <TableHead className="text-xs text-slate-400 font-semibold text-right">Discount</TableHead>
                  <TableHead className="text-xs text-slate-400 font-semibold text-right">Tax</TableHead>
                  {userRole !== "USER" && (
                    <>
                      <TableHead className="text-xs text-slate-400 font-semibold text-right">Snapshotted Cost</TableHead>
                      <TableHead className="text-xs text-slate-400 font-semibold text-right">Line COGS</TableHead>
                    </>
                  )}
                  <TableHead className="text-xs text-slate-400 font-semibold text-right pr-4">Line Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it: any) => (
                  <TableRow key={it.sales_item_id} className="hover:bg-slate-50/70 border-b border-slate-100/80">
                    <TableCell className="text-xs text-slate-400 pl-4 font-mono">
                      {it.line_no}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-xs text-slate-900">
                        {it.product_name}
                      </div>
                      <div className="font-mono text-[10px] text-sky-600">
                        {it.sku} &bull; {it.unit}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-right font-medium text-slate-800">
                      {Number(it.quantity)}
                    </TableCell>
                    <TableCell className="text-xs text-right text-slate-700 font-mono">
                      {formatCurrency(it.unit_price)}
                    </TableCell>
                    <TableCell className="text-xs text-right text-slate-500 font-mono">
                      {formatCurrency(it.line_discount)} ({Number(it.discount_percent)}%)
                    </TableCell>
                    <TableCell className="text-xs text-right text-slate-500 font-mono">
                      {formatCurrency(it.line_tax)} ({Number(it.tax_percent)}%)
                    </TableCell>
                    {userRole !== "USER" && (
                      <>
                        <TableCell className="text-xs text-right text-sky-600 font-mono">
                          {formatCurrency(it.unit_cost)}
                        </TableCell>
                        <TableCell className="text-xs text-right text-rose-600 font-mono">
                          {formatCurrency(it.line_cogs)}
                        </TableCell>
                      </>
                    )}
                    <TableCell className="text-xs text-right font-bold text-slate-900 font-mono pr-4">
                      {formatCurrency(it.line_total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Financial Calculation Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border-t border-slate-100 bg-slate-50/50 gap-4">
            <div className="text-xs text-slate-500 space-y-1">
              <div>Invoice Notes: {invoice.notes || "None"}</div>
              <div className="flex items-center gap-1.5 text-sky-600 font-mono text-[11px]">
                <Sparkles className="h-3 w-3" /> Net Revenue = Subtotal - Discount (Taxes separated)
              </div>
            </div>

            <div className="space-y-1.5 text-right text-xs min-w-[240px]">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span className="font-mono">{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Total Discount:</span>
                <span className="font-mono text-amber-600">-{formatCurrency(invoice.discount_amount)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Total Tax:</span>
                <span className="font-mono text-slate-600">+{formatCurrency(invoice.tax_amount)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span>Grand Total:</span>
                <span className="text-sky-600 font-mono text-base">{formatCurrency(invoice.total_amount)}</span>
              </div>
              {userRole !== "USER" && (
                <div className="flex justify-between text-xs text-rose-600 font-medium pt-1 font-mono">
                  <span>Snapshotted COGS:</span>
                  <span>{formatCurrency(invoice.cogs_amount)}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments History Table */}
      <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 bg-white">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-900">
            <CreditCard className="h-4 w-4 text-emerald-500" />
            Payments Ledger
          </CardTitle>
          {invoice.status === "CONFIRMED" && balanceRemaining > 0 && (
            <Button
              size="sm"
              onClick={() => setShowPaymentModal(true)}
              className="text-xs h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
            >
              + Record Payment
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {payments.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No payments recorded for this invoice yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-100 hover:bg-transparent">
                    <TableHead className="text-xs text-slate-400 font-semibold pl-4">Payment #</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold">Date</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold">Method</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold">Reference</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold text-right pr-4">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p: any) => (
                    <TableRow key={p.payment_id} className="hover:bg-slate-50/70 border-b border-slate-100/80">
                      <TableCell className="font-mono text-xs text-sky-600 font-semibold pl-4">
                        {p.payment_no}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {formatDate(p.payment_date)}
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {p.method}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 font-mono">
                        {p.reference_no || "-"}
                      </TableCell>
                      <TableCell className="text-xs text-right font-semibold text-emerald-600 font-mono pr-4">
                        {formatCurrency(p.amount)}
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

    {/* Record Payment Modal */}
    {showPaymentModal && (
      <div className="fixed inset-0 z-50 !m-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Record Customer Payment</h3>
                  <p className="text-[11px] text-slate-500">Invoice {invoice.invoice_no}</p>
                </div>
              </div>
            </div>
            <form onSubmit={handleRecordPayment}>
              <div className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">
                    Payment Amount (₹)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={balanceRemaining}
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    required
                    className="text-sm h-10 rounded-xl border-slate-200/80 focus-visible:ring-sky-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-500">
                    Remaining balance: {formatCurrency(balanceRemaining)}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">
                    Payment Method
                  </label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                  >
                    <option value="UPI">UPI / QR</option>
                    <option value="CARD">Debit / Credit Card</option>
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
                    <option value="CASH">Cash</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">
                    Reference / Transaction ID
                  </label>
                  <Input
                    placeholder="e.g. UPI-TXN-98421098"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    className="text-xs h-10 rounded-xl border-slate-200/80 focus-visible:ring-sky-500"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2.5 p-4 border-t border-slate-100 bg-slate-50/50">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPaymentModal(false)}
                  className="rounded-xl border-slate-200 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={recordingPayment}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-xs"
                >
                  {recordingPayment ? "Recording..." : "Save Payment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
