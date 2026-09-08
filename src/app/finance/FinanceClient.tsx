"use client";

import React, { useEffect, useState } from "react";
import {
  DollarSign,
  Plus,
  MoreVertical,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Building,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";

export function FinanceClient() {
  const [activeTab, setActiveTab] = useState<"EXPENSES" | "PAYMENTS">("EXPENSES");
  const [expenses, setExpenses] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New expense modal
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [amount, setAmount] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");
  const [refNo, setRefNo] = useState("");
  const [savingExpense, setSavingExpense] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/finance/expenses").then((r) => r.json()),
      fetch("/api/finance/payments").then((r) => r.json()),
      fetch("/api/master/categories").then((r) => r.json()),
    ])
      .then(([expData, payData, catData]) => {
        setExpenses(expData.expenses || []);
        setPayments(payData.payments || []);
        const expCats = catData.expenseCategories || [];
        setCategories(expCats);
        if (expCats.length > 0) setCategoryId(expCats[0].expense_category_id);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !amount) return;

    setSavingExpense(true);
    try {
      const res = await fetch("/api/finance/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expenseCategoryId: categoryId,
          amount: Number(amount),
          vendorName,
          description,
          paymentMethod,
          referenceNo: refNo,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record expense");

      setShowExpenseModal(false);
      setAmount("");
      setDescription("");
      setVendorName("");
      setRefNo("");
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingExpense(false);
    }
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const fixedExpenses = expenses
    .filter((e) => e.is_fixed_cost)
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const variableExpenses = totalExpenses - fixedExpenses;

  const totalCollections = payments
    .filter((p) => p.direction === "IN")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const totalDisbursements = payments
    .filter((p) => p.direction === "OUT")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Finance & Cashflow Hub
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Operating expenses classified by cost structure (Fixed vs Variable) and cashflow settlements
          </p>
        </div>
        <Button
          onClick={() => setShowExpenseModal(true)}
          className="h-10 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-medium shadow-xs transition-colors"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Record Operating Expense
        </Button>
      </div>

      {/* Vantus 4-Card KPI Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Operating Overhead</span>
            <button className="text-slate-400 hover:text-slate-600">
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-rose-600 font-mono">
              {formatCurrency(totalExpenses)}
            </span>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              Fixed: {formatCurrency(fixedExpenses)}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Variable Spend (Ops)</span>
            <button className="text-slate-400 hover:text-slate-600">
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-amber-600 font-mono">
              {formatCurrency(variableExpenses)}
            </span>
            <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              Logistics/Utility
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Inflow Collections (Sales)</span>
            <button className="text-slate-400 hover:text-slate-600">
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-600 font-mono">
              {formatCurrency(totalCollections)}
            </span>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              <TrendingUp className="h-3 w-3" />
              <span>Received</span>
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Disbursements (Purchases)</span>
            <button className="text-slate-400 hover:text-slate-600">
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 font-mono">
              {formatCurrency(totalDisbursements)}
            </span>
            <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
              Paid Out
            </span>
          </div>
        </div>
      </div>

      {/* Main Tabs and Content */}
      <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <CardHeader className="p-5 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100/80 border border-slate-200/60 w-fit">
            <button
              type="button"
              onClick={() => setActiveTab("EXPENSES")}
              className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === "EXPENSES"
                  ? "bg-sky-500 text-white shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              Operating Overhead ({expenses.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("PAYMENTS")}
              className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === "PAYMENTS"
                  ? "bg-sky-500 text-white shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              Cashflow Payments Ledger ({payments.length})
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400 font-medium">
              Loading financial transactions...
            </div>
          ) : activeTab === "EXPENSES" ? (
            /* Expenses Table */
            expenses.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No operating expenses recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-slate-100 hover:bg-transparent">
                      <TableHead className="text-xs text-slate-400 font-semibold pl-5">Expense #</TableHead>
                      <TableHead className="text-xs text-slate-400 font-semibold">Date</TableHead>
                      <TableHead className="text-xs text-slate-400 font-semibold">Category</TableHead>
                      <TableHead className="text-xs text-slate-400 font-semibold">Cost Type</TableHead>
                      <TableHead className="text-xs text-slate-400 font-semibold">Vendor / Description</TableHead>
                      <TableHead className="text-xs text-slate-400 font-semibold">Method & Ref</TableHead>
                      <TableHead className="text-xs text-slate-400 font-semibold text-right pr-5">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((exp) => (
                      <TableRow key={exp.expense_id} className="hover:bg-slate-50/70 border-b border-slate-100/80">
                        <TableCell className="font-mono text-xs font-semibold text-sky-600 pl-5">
                          {exp.expense_no}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {formatDate(exp.expense_date)}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-slate-900">
                          {exp.category_name}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              exp.is_fixed_cost
                                ? "bg-slate-100 text-slate-700 border-slate-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {exp.is_fixed_cost ? "FIXED OVERHEAD" : "VARIABLE COST"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-slate-900 font-medium">{exp.vendor_name || "Internal"}</div>
                          <div className="text-[11px] text-slate-500">{exp.description || "-"}</div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 font-mono">
                          {exp.payment_method} &bull; {exp.reference_no || "-"}
                        </TableCell>
                        <TableCell className="text-xs text-right font-bold text-rose-600 font-mono pr-5">
                          {formatCurrency(exp.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          ) : (
            /* Payments Table */
            payments.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No cashflow transactions recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-slate-100 hover:bg-transparent">
                      <TableHead className="text-xs text-slate-400 font-semibold pl-5">Payment #</TableHead>
                      <TableHead className="text-xs text-slate-400 font-semibold">Date</TableHead>
                      <TableHead className="text-xs text-slate-400 font-semibold">Direction</TableHead>
                      <TableHead className="text-xs text-slate-400 font-semibold">Invoice Ref</TableHead>
                      <TableHead className="text-xs text-slate-400 font-semibold">Method</TableHead>
                      <TableHead className="text-xs text-slate-400 font-semibold">Reference ID</TableHead>
                      <TableHead className="text-xs text-slate-400 font-semibold text-right pr-5">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p) => (
                      <TableRow key={p.payment_id} className="hover:bg-slate-50/70 border-b border-slate-100/80">
                        <TableCell className="font-mono text-xs font-semibold text-sky-600 pl-5">
                          {p.payment_no}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {formatDate(p.payment_date)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              p.direction === "IN"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                            }`}
                          >
                            {p.direction === "IN" ? "INFLOW (CUSTOMER)" : "OUTFLOW (SUPPLIER)"}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-slate-600">
                          {p.sales_invoice_no || p.purchase_invoice_no || "General Settlement"}
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {p.method}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 font-mono">
                          {p.reference_no || "-"}
                        </TableCell>
                        <TableCell
                          className={`text-xs text-right font-bold font-mono pr-5 ${
                            p.direction === "IN" ? "text-emerald-600" : "text-slate-900"
                          }`}
                        >
                          {p.direction === "IN" ? "+" : "-"}
                          {formatCurrency(p.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          )}
        </CardContent>
      </Card>

      {/* Record Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <DollarSign className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Record Operating Expense</h3>
                <p className="text-[11px] text-slate-500">Direct operational spend entry</p>
              </div>
            </div>
            <form onSubmit={handleCreateExpense}>
              <div className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Expense Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(Number(e.target.value))}
                    className="w-full h-10 rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                  >
                    {categories.map((c) => (
                      <option key={c.expense_category_id} value={c.expense_category_id}>
                        {c.name} ({c.is_fixed_cost ? "Fixed" : "Variable"})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Amount (₹)</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="h-10 rounded-xl border-slate-200/80 focus-visible:ring-sky-500 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Vendor / Payee</label>
                  <Input
                    placeholder="e.g. AWS Cloud, DTDC Logistics, Office Landlord"
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    className="h-10 rounded-xl border-slate-200/80 focus-visible:ring-sky-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Description</label>
                  <Input
                    placeholder="e.g. Monthly cloud server infrastructure compute"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="h-10 rounded-xl border-slate-200/80 focus-visible:ring-sky-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600">Payment Mode</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full h-10 rounded-xl border border-slate-200/80 bg-white px-2.5 py-1 text-xs text-slate-900"
                    >
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="UPI">UPI</option>
                      <option value="CARD">Card</option>
                      <option value="CASH">Cash</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600">Reference #</label>
                    <Input
                      placeholder="Ref / UTR"
                      value={refNo}
                      onChange={(e) => setRefNo(e.target.value)}
                      className="h-10 rounded-xl border-slate-200/80 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 p-4 border-t border-slate-100 bg-slate-50/50">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowExpenseModal(false)}
                  className="rounded-xl border-slate-200 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={savingExpense}
                  className="rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-medium text-xs shadow-xs"
                >
                  {savingExpense ? "Saving..." : "Save Expense"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
