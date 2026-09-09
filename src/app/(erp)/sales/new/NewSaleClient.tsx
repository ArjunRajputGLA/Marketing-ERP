"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Boxes,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Loader } from "@/components/ui/loader";

interface LineItemInput {
  productId: number;
  productName: string;
  sku: string;
  stockOnHand: number;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxPercent: number;
}

export function NewSaleClient() {
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  const [customerId, setCustomerId] = useState<number | "">("");
  const [invoiceDate, setInvoiceDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItemInput[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/master/customers").then((r) => r.json()),
      fetch("/api/master/products").then((r) => r.json()),
    ])
      .then(([custData, prodData]) => {
        setCustomers(custData.customers || []);
        setProducts(prodData.products || []);
        if (custData.customers?.length > 0) {
          setCustomerId(custData.customers[0].customer_id);
        }
        setLoadingInitial(false);
      })
      .catch(() => setLoadingInitial(false));
  }, []);

  const handleAddItem = () => {
    if (products.length === 0) return;
    const defaultProd = products[0];
    setItems((prev) => [
      ...prev,
      {
        productId: defaultProd.product_id,
        productName: defaultProd.name,
        sku: defaultProd.sku,
        stockOnHand: Number(defaultProd.stock_on_hand || 0),
        quantity: 1,
        unitPrice: Number(defaultProd.selling_price || 0),
        discountPercent: 0,
        taxPercent: 5,
      },
    ]);
  };

  const handleProductChange = (index: number, newProductId: number) => {
    const prod = products.find((p) => p.product_id === newProductId);
    if (!prod) return;

    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        productId: prod.product_id,
        productName: prod.name,
        sku: prod.sku,
        stockOnHand: Number(prod.stock_on_hand || 0),
        unitPrice: Number(prod.selling_price || 0),
      };
      return copy;
    });
  };

  const handleItemChange = (
    index: number,
    field: keyof LineItemInput,
    value: any
  ) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [field]: Number(value),
      };
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Live computed arithmetic (preview matching PostgreSQL generated columns)
  const computedTotals = items.reduce(
    (acc, it) => {
      const lineSubtotal = it.quantity * it.unitPrice;
      const lineDiscount = (lineSubtotal * it.discountPercent) / 100.0;
      const taxable = lineSubtotal - lineDiscount;
      const lineTax = (taxable * it.taxPercent) / 100.0;
      const lineTotal = taxable + lineTax;

      return {
        subtotal: acc.subtotal + lineSubtotal,
        discount: acc.discount + lineDiscount,
        tax: acc.tax + lineTax,
        total: acc.total + lineTotal,
      };
    },
    { subtotal: 0, discount: 0, tax: 0, total: 0 }
  );

  const handleSubmit = async (autoConfirm: boolean) => {
    setError(null);
    if (!customerId) {
      setError("Please select a customer.");
      return;
    }
    if (items.length === 0) {
      setError("Please add at least one line item.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          invoiceDate,
          notes,
          items,
          autoConfirm,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create invoice.");
      }

      router.push(`/sales/${data.invoice.sales_invoice_id}`);
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="py-20 flex justify-center">
        <Loader text="Loading master data..." />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Create New Sales Invoice
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Posts stock movement and snapshots moving-average cost upon confirmation
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs flex items-center gap-2 font-medium">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Customer and Invoice Details */}
      <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 bg-white">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-900">
            <FileText className="h-4 w-4 text-sky-500" />
            Invoice Header Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5 pb-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Customer Account</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(Number(e.target.value))}
              className="flex h-10 w-full rounded-xl border border-slate-200/80 bg-white px-3 py-1 text-xs shadow-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              {customers.map((c) => (
                <option key={c.customer_id} value={c.customer_id}>
                  {c.name} ({c.code}) &bull; {c.customer_type}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Invoice Date</label>
            <Input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="text-xs h-10 rounded-xl border-slate-200/80 focus-visible:ring-sky-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Notes / Reference</label>
            <Input
              placeholder="e.g. Purchase order PO-7721"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs h-10 rounded-xl border-slate-200/80 focus-visible:ring-sky-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Line Items Table */}
      <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 bg-white">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-900">
              <Boxes className="h-4 w-4 text-sky-500" />
              Invoice Line Items
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Line totals, discounts, and taxes are verified via database generated stored expressions
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleAddItem}
            className="text-xs rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-medium shadow-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Line Item
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="py-12 m-5 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              No items added yet. Click <strong className="text-sky-600">Add Line Item</strong> to select products from the catalog.
            </div>
          ) : (
            <div className="overflow-x-auto p-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                    <th className="text-left pb-3 pl-2 w-56">Product</th>
                    <th className="text-right pb-3 w-20">Stock</th>
                    <th className="text-right pb-3 w-24">Qty</th>
                    <th className="text-right pb-3 w-28">Price (₹)</th>
                    <th className="text-right pb-3 w-20">Disc %</th>
                    <th className="text-right pb-3 w-20">Tax %</th>
                    <th className="text-right pb-3 pr-2 w-28">Line Total</th>
                    <th className="text-center pb-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => {
                    const lineSubtotal = item.quantity * item.unitPrice;
                    const lineDiscount = (lineSubtotal * item.discountPercent) / 100.0;
                    const taxable = lineSubtotal - lineDiscount;
                    const lineTotal = taxable * (1 + item.taxPercent / 100.0);

                    return (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 pl-2 pr-2">
                          <select
                            value={item.productId}
                            onChange={(e) =>
                              handleProductChange(idx, Number(e.target.value))
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                          >
                            {products.map((p) => (
                              <option key={p.product_id} value={p.product_id}>
                                {p.name} ({p.sku})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <span
                            className={`font-mono font-semibold px-2 py-0.5 rounded-md text-[11px] ${
                              item.stockOnHand < item.quantity
                                ? "bg-rose-50 text-rose-600 border border-rose-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {item.stockOnHand}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(idx, "quantity", e.target.value)
                            }
                            className="h-8 text-right text-xs rounded-lg border-slate-200 focus-visible:ring-sky-500"
                          />
                        </td>
                        <td className="py-3 px-2 text-right">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) =>
                              handleItemChange(idx, "unitPrice", e.target.value)
                            }
                            className="h-8 text-right text-xs rounded-lg border-slate-200 focus-visible:ring-sky-500 font-mono"
                          />
                        </td>
                        <td className="py-3 px-2 text-right">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discountPercent}
                            onChange={(e) =>
                              handleItemChange(idx, "discountPercent", e.target.value)
                            }
                            className="h-8 text-right text-xs rounded-lg border-slate-200 focus-visible:ring-sky-500"
                          />
                        </td>
                        <td className="py-3 px-2 text-right">
                          <select
                            value={item.taxPercent}
                            onChange={(e) =>
                              handleItemChange(idx, "taxPercent", e.target.value)
                            }
                            className="h-8 rounded-lg border border-slate-200 bg-white px-2 py-0 text-xs text-slate-900 text-right"
                          >
                            <option value="0">0%</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                          </select>
                        </td>
                        <td className="py-3 px-2 text-right font-semibold text-slate-900 font-mono">
                          {formatCurrency(lineTotal)}
                        </td>
                        <td className="py-3 pl-2 pr-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>

        {/* Live Calculation Summary */}
        {items.length > 0 && (
          <CardFooter className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-slate-100 bg-slate-50/50 p-5 gap-4">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-sky-500 shrink-0" />
              <span>
                Unit cost is snapshotted upon confirmation. Net revenue excludes tax.
              </span>
            </div>
            <div className="space-y-1.5 text-right text-xs min-w-[240px]">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span className="font-mono">{formatCurrency(computedTotals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Discount:</span>
                <span className="font-mono text-amber-600">-{formatCurrency(computedTotals.discount)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Tax:</span>
                <span className="font-mono text-slate-600">+{formatCurrency(computedTotals.tax)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span>Grand Total:</span>
                <span className="text-sky-600 font-mono text-base">{formatCurrency(computedTotals.total)}</span>
              </div>
            </div>
          </CardFooter>
        )}
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          disabled={submitting}
          onClick={() => handleSubmit(false)}
          className="text-xs h-10 px-5 rounded-xl border-slate-200/80 bg-white text-slate-700 hover:bg-slate-50 shadow-xs font-medium"
        >
          Save as Draft
        </Button>
        <Button
          type="button"
          disabled={submitting}
          onClick={() => handleSubmit(true)}
          className="text-xs h-10 px-5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-medium shadow-xs"
        >
          <CheckCircle2 className="h-4 w-4 mr-1.5" />
          {submitting ? "Processing..." : "Confirm & Post to Stock"}
        </Button>
      </div>
    </div>
  );
}
