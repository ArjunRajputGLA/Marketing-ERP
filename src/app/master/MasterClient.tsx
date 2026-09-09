"use client";

import React, { useEffect, useState } from "react";
import {
  Database,
  Plus,
  Search,
  Package,
  Users,
  Truck,
  FolderTree,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { Loader } from "@/components/ui/loader";

export function MasterClient() {
  const [tab, setTab] = useState<"PRODUCTS" | "CUSTOMERS" | "SUPPLIERS" | "CATEGORIES">("PRODUCTS");
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modals state
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);

  // New product form state
  const [prodForm, setProdForm] = useState({
    sku: "",
    name: "",
    categoryId: 1,
    unit: "PCS",
    costPrice: "",
    sellingPrice: "",
    reorderLevel: "10",
  });

  // New customer form state
  const [custForm, setCustForm] = useState({
    code: "",
    name: "",
    email: "",
    phone: "",
    customerType: "RETAIL",
    creditLimit: "50000",
  });

  // New supplier form state
  const [suppForm, setSuppForm] = useState({
    code: "",
    name: "",
    contactPerson: "",
    email: "",
    phone: "",
    leadTimeDays: "7",
  });

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/master/products").then((r) => r.json()),
      fetch("/api/master/customers").then((r) => r.json()),
      fetch("/api/master/suppliers").then((r) => r.json()),
      fetch("/api/master/categories").then((r) => r.json()),
    ])
      .then(([pData, cData, sData, catData]) => {
        setProducts(pData.products || []);
        setCustomers(cData.customers || []);
        setSuppliers(sData.suppliers || []);
        setCategories(catData.categories || []);
        setExpenseCategories(catData.expenseCategories || []);
        if (catData.categories?.length > 0) {
          setProdForm((prev) => ({ ...prev, categoryId: catData.categories[0].category_id }));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/master/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...prodForm,
          costPrice: Number(prodForm.costPrice),
          sellingPrice: Number(prodForm.sellingPrice),
          reorderLevel: Number(prodForm.reorderLevel),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create product");

      setShowProductModal(false);
      setProdForm({
        sku: "",
        name: "",
        categoryId: categories[0]?.category_id || 1,
        unit: "PCS",
        costPrice: "",
        sellingPrice: "",
        reorderLevel: "10",
      });
      loadAll();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/master/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...custForm,
          creditLimit: Number(custForm.creditLimit),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create customer");

      setShowCustomerModal(false);
      setCustForm({
        code: "",
        name: "",
        email: "",
        phone: "",
        customerType: "RETAIL",
        creditLimit: "50000",
      });
      loadAll();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/master/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...suppForm,
          leadTimeDays: Number(suppForm.leadTimeDays),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create supplier");

      setShowSupplierModal(false);
      setSuppForm({
        code: "",
        name: "",
        contactPerson: "",
        email: "",
        phone: "",
        leadTimeDays: "7",
      });
      loadAll();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase())
  );

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Master Data Registry</h1>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative enterprise entities, catalogs, customer accounts, and vendor profiles
          </p>
        </div>
        <div className="flex items-center gap-2">
          {tab === "PRODUCTS" && (
            <Button
              size="sm"
              onClick={() => setShowProductModal(true)}
              className="h-10 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-medium shadow-xs"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Add Product
            </Button>
          )}
          {tab === "CUSTOMERS" && (
            <Button
              size="sm"
              onClick={() => setShowCustomerModal(true)}
              className="h-10 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-medium shadow-xs"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Add Customer
            </Button>
          )}
          {tab === "SUPPLIERS" && (
            <Button
              size="sm"
              onClick={() => setShowSupplierModal(true)}
              className="h-10 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-medium shadow-xs"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Add Supplier
            </Button>
          )}
        </div>
      </div>

      <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <CardHeader className="p-5 border-b border-slate-100 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Vantus Tab Pill Switcher */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100/80 border border-slate-200/60 w-fit">
              <button
                type="button"
                onClick={() => setTab("PRODUCTS")}
                className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition-all ${
                  tab === "PRODUCTS"
                    ? "bg-sky-500 text-white shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
              >
                Products ({products.length})
              </button>
              <button
                type="button"
                onClick={() => setTab("CUSTOMERS")}
                className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition-all ${
                  tab === "CUSTOMERS"
                    ? "bg-sky-500 text-white shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
              >
                Customers ({customers.length})
              </button>
              <button
                type="button"
                onClick={() => setTab("SUPPLIERS")}
                className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition-all ${
                  tab === "SUPPLIERS"
                    ? "bg-sky-500 text-white shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
              >
                Suppliers ({suppliers.length})
              </button>
              <button
                type="button"
                onClick={() => setTab("CATEGORIES")}
                className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition-all ${
                  tab === "CATEGORIES"
                    ? "bg-sky-500 text-white shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
              >
                Categories
              </button>
            </div>

            {/* Search */}
            {tab !== "CATEGORIES" && (
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder={`Search ${tab.toLowerCase()}...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 text-xs h-9 rounded-xl border-slate-200/80 bg-slate-50/50 focus-visible:bg-white focus-visible:ring-sky-500"
                />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 flex justify-center">
              <Loader size="sm" text="Loading master entities..." />
            </div>
          ) : tab === "PRODUCTS" ? (
            /* Products Table */
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-100 hover:bg-transparent">
                    <TableHead className="text-xs text-slate-400 font-semibold pl-5">SKU</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold">Product Name</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold">Category</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold text-right">Cost Price</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold text-right">Selling Price</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold text-right">Stock On Hand</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold text-right pr-5">Reorder Level</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((p) => (
                    <TableRow key={p.product_id} className="hover:bg-slate-50/70 border-b border-slate-100/80">
                      <TableCell className="font-mono text-xs font-semibold text-sky-600 pl-5">
                        {p.sku}
                      </TableCell>
                      <TableCell className="font-medium text-xs text-slate-900">
                        {p.name}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {p.category_name}
                      </TableCell>
                      <TableCell className="text-xs text-right text-slate-600 font-mono">
                        {formatCurrency(p.cost_price)}
                      </TableCell>
                      <TableCell className="text-xs text-right font-semibold text-slate-900 font-mono">
                        {formatCurrency(p.selling_price)}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono">
                        <span
                          className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                            Number(p.stock_on_hand) <= Number(p.reorder_level)
                              ? "bg-rose-50 text-rose-600 border border-rose-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {p.stock_on_hand} {p.unit}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-right text-slate-400 font-mono pr-5">
                        {p.reorder_level}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : tab === "CUSTOMERS" ? (
            /* Customers Table */
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-100 hover:bg-transparent">
                    <TableHead className="text-xs text-slate-400 font-semibold pl-5">Code</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold">Customer Name</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold">Type</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold">Email & Contact</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold text-right pr-5">Credit Limit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((c) => (
                    <TableRow key={c.customer_id} className="hover:bg-slate-50/70 border-b border-slate-100/80">
                      <TableCell className="font-mono text-xs font-semibold text-sky-600 pl-5">
                        {c.code}
                      </TableCell>
                      <TableCell className="font-medium text-xs text-slate-900">
                        {c.name}
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                          {c.customer_type}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {c.email || c.phone || "-"}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono text-slate-700 pr-5">
                        {formatCurrency(c.credit_limit)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : tab === "SUPPLIERS" ? (
            /* Suppliers Table */
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-100 hover:bg-transparent">
                    <TableHead className="text-xs text-slate-400 font-semibold pl-5">Code</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold">Supplier Name</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold">Contact Person</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold">Email & Phone</TableHead>
                    <TableHead className="text-xs text-slate-400 font-semibold text-right pr-5">Lead Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map((s) => (
                    <TableRow key={s.supplier_id} className="hover:bg-slate-50/70 border-b border-slate-100/80">
                      <TableCell className="font-mono text-xs font-semibold text-sky-600 pl-5">
                        {s.code}
                      </TableCell>
                      <TableCell className="font-medium text-xs text-slate-900">
                        {s.name}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {s.contact_person || "-"}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {s.email || s.phone || "-"}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono text-slate-700 pr-5">
                        {s.lead_time_days} days
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            /* Categories Dual-Column */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Product Categories ({categories.length})
                </h3>
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                  {categories.map((cat) => (
                    <div key={cat.category_id} className="p-3 bg-white flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-slate-900">{cat.name}</div>
                        <div className="text-[11px] text-slate-400">{cat.description || "General category"}</div>
                      </div>
                      <span className="font-mono text-[10px] text-sky-600 bg-sky-50 px-2 py-0.5 rounded">
                        CAT-{cat.category_id}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Operating Cost Classifications ({expenseCategories.length})
                </h3>
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                  {expenseCategories.map((ec) => (
                    <div key={ec.expense_category_id} className="p-3 bg-white flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-slate-900">{ec.name}</div>
                        <div className="text-[11px] text-slate-400">{ec.description || "-"}</div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          ec.is_fixed_cost
                            ? "bg-slate-100 text-slate-700 border-slate-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {ec.is_fixed_cost ? "FIXED OVERHEAD" : "VARIABLE COST"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>

    {/* Add Product Modal */}
    {showProductModal && (
      <div className="fixed inset-0 z-50 !m-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <Package className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Add New Product</h3>
            </div>
            <form onSubmit={handleCreateProduct}>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600">SKU Code</label>
                    <Input
                      placeholder="e.g. SK-1001"
                      value={prodForm.sku}
                      onChange={(e) => setProdForm({ ...prodForm, sku: e.target.value })}
                      required
                      className="h-10 rounded-xl border-slate-200/80 font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600">Unit of Measure</label>
                    <select
                      value={prodForm.unit}
                      onChange={(e) => setProdForm({ ...prodForm, unit: e.target.value })}
                      className="w-full h-10 rounded-xl border border-slate-200/80 bg-white px-3 py-1 text-xs text-slate-900"
                    >
                      <option value="PCS">PCS</option>
                      <option value="BOX">BOX</option>
                      <option value="KG">KG</option>
                      <option value="L">L</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Product Name</label>
                  <Input
                    placeholder="e.g. Enterprise Wireless Access Point"
                    value={prodForm.name}
                    onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
                    required
                    className="h-10 rounded-xl border-slate-200/80 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Category</label>
                  <select
                    value={prodForm.categoryId}
                    onChange={(e) => setProdForm({ ...prodForm, categoryId: Number(e.target.value) })}
                    className="w-full h-10 rounded-xl border border-slate-200/80 bg-white px-3 py-1 text-xs text-slate-900"
                  >
                    {categories.map((c) => (
                      <option key={c.category_id} value={c.category_id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600">Cost Price (₹)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={prodForm.costPrice}
                      onChange={(e) => setProdForm({ ...prodForm, costPrice: e.target.value })}
                      required
                      className="h-10 rounded-xl border-slate-200/80 font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600">Selling Price (₹)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={prodForm.sellingPrice}
                      onChange={(e) => setProdForm({ ...prodForm, sellingPrice: e.target.value })}
                      required
                      className="h-10 rounded-xl border-slate-200/80 font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600">Reorder Level</label>
                    <Input
                      type="number"
                      value={prodForm.reorderLevel}
                      onChange={(e) => setProdForm({ ...prodForm, reorderLevel: e.target.value })}
                      required
                      className="h-10 rounded-xl border-slate-200/80 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2.5 p-4 border-t border-slate-100 bg-slate-50/50">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowProductModal(false)}
                  className="rounded-xl border-slate-200 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-medium text-xs shadow-xs"
                >
                  Save Product
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 !m-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Add Customer Account</h3>
            </div>
            <form onSubmit={handleCreateCustomer}>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600">Customer Code</label>
                    <Input
                      placeholder="e.g. CUST-901"
                      value={custForm.code}
                      onChange={(e) => setCustForm({ ...custForm, code: e.target.value })}
                      required
                      className="h-10 rounded-xl border-slate-200/80 font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600">Account Type</label>
                    <select
                      value={custForm.customerType}
                      onChange={(e) => setCustForm({ ...custForm, customerType: e.target.value })}
                      className="w-full h-10 rounded-xl border border-slate-200/80 bg-white px-3 py-1 text-xs text-slate-900"
                    >
                      <option value="RETAIL">Retail</option>
                      <option value="WHOLESALE">Wholesale</option>
                      <option value="DISTRIBUTOR">Distributor</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Customer Name</label>
                  <Input
                    placeholder="Company or Individual Name"
                    value={custForm.name}
                    onChange={(e) => setCustForm({ ...custForm, name: e.target.value })}
                    required
                    className="h-10 rounded-xl border-slate-200/80 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600">Email</label>
                    <Input
                      type="email"
                      placeholder="account@domain.com"
                      value={custForm.email}
                      onChange={(e) => setCustForm({ ...custForm, email: e.target.value })}
                      className="h-10 rounded-xl border-slate-200/80 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600">Credit Limit (₹)</label>
                    <Input
                      type="number"
                      value={custForm.creditLimit}
                      onChange={(e) => setCustForm({ ...custForm, creditLimit: e.target.value })}
                      className="h-10 rounded-xl border-slate-200/80 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2.5 p-4 border-t border-slate-100 bg-slate-50/50">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCustomerModal(false)}
                  className="rounded-xl border-slate-200 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-medium text-xs shadow-xs"
                >
                  Save Customer
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 !m-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <Truck className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Add Supplier Account</h3>
            </div>
            <form onSubmit={handleCreateSupplier}>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600">Supplier Code</label>
                    <Input
                      placeholder="e.g. SUP-401"
                      value={suppForm.code}
                      onChange={(e) => setSuppForm({ ...suppForm, code: e.target.value })}
                      required
                      className="h-10 rounded-xl border-slate-200/80 font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600">Lead Time (Days)</label>
                    <Input
                      type="number"
                      value={suppForm.leadTimeDays}
                      onChange={(e) => setSuppForm({ ...suppForm, leadTimeDays: e.target.value })}
                      required
                      className="h-10 rounded-xl border-slate-200/80 font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Supplier Name</label>
                  <Input
                    placeholder="Vendor Name"
                    value={suppForm.name}
                    onChange={(e) => setSuppForm({ ...suppForm, name: e.target.value })}
                    required
                    className="h-10 rounded-xl border-slate-200/80 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Contact Person</label>
                  <Input
                    placeholder="Key Account Representative"
                    value={suppForm.contactPerson}
                    onChange={(e) => setSuppForm({ ...suppForm, contactPerson: e.target.value })}
                    className="h-10 rounded-xl border-slate-200/80 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Email Address</label>
                  <Input
                    type="email"
                    placeholder="orders@supplier.com"
                    value={suppForm.email}
                    onChange={(e) => setSuppForm({ ...suppForm, email: e.target.value })}
                    className="h-10 rounded-xl border-slate-200/80 text-xs"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2.5 p-4 border-t border-slate-100 bg-slate-50/50">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSupplierModal(false)}
                  className="rounded-xl border-slate-200 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-medium text-xs shadow-xs"
                >
                  Save Supplier
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
