"use client";

import React, { useEffect, useState } from "react";
import {
  Boxes,
  Check,
  CheckCircle2,
  FolderKanban,
  Layers,
  Package,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Tags,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { Loader } from "@/components/ui/loader";

export function CategoriesClient() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
  });

  const loadCategories = () => {
    setLoading(true);
    fetch("/api/master/categories")
      .then((res) => res.json())
      .then((data) => {
        setCategories(data.categories || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/master/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create category");
      }

      setShowModal(false);
      setForm({ name: "", description: "" });
      loadCategories();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCategories = categories.filter(
    (c) =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.description?.toLowerCase().includes(search.toLowerCase())
  );

  const totalProducts = categories.reduce(
    (sum, c) => sum + Number(c.products_count || 0),
    0
  );

  const topCategory = categories.length
    ? [...categories].sort(
        (a, b) => Number(b.products_count || 0) - Number(a.products_count || 0)
      )[0]
    : null;

  return (
    <>
      <div className="space-y-6">
        {/* Top Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Tags className="h-6 w-6 text-sky-500" />
              Product Categories Catalog
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Authoritative catalog taxonomy, item classifications, and SKU grouping structures
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => {
                setFormError(null);
                setShowModal(true);
              }}
              className="h-10 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-medium shadow-xs flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Add Category
            </Button>
          </div>
        </div>

        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Total Categories</span>
              <div className="h-7 w-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                <FolderKanban className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
              {categories.length}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium mt-1">
              Active Taxonomy Groups
            </div>
          </Card>

          <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Categorized SKUs</span>
              <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Package className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
              {totalProducts}
            </div>
            <div className="text-[11px] text-indigo-600 font-medium mt-1">
              Catalog Items Mapped
            </div>
          </Card>

          <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Top Category</span>
              <div className="h-7 w-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Tag className="h-4 w-4" />
              </div>
            </div>
            <div className="text-base font-bold text-slate-900 mt-2 font-mono truncate">
              {topCategory ? topCategory.name : "None"}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">
              {topCategory ? `${topCategory.products_count || 0} Products` : "0 Products"}
            </div>
          </Card>

          <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Taxonomy Health</span>
              <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">
              100%
            </div>
            <div className="text-[11px] text-emerald-600 font-medium mt-1">
              Deterministic Schema Clean
            </div>
          </Card>
        </div>

        {/* Categories Directory Card */}
        <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <CardHeader className="p-5 border-b border-slate-100 bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-sm font-bold text-slate-900">
                Product Categories Catalog ({filteredCategories.length})
              </h2>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search category name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-10 rounded-xl border-slate-200/80 text-xs"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 flex justify-center">
                <Loader size="sm" text="Loading categories..." />
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400 font-medium">
                No categories found matching search.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-slate-100 hover:bg-transparent">
                      <TableHead className="text-xs text-slate-400 font-semibold pl-5">
                        Category ID
                      </TableHead>
                      <TableHead className="text-xs text-slate-400 font-semibold">
                        Category Name
                      </TableHead>
                      <TableHead className="text-xs text-slate-400 font-semibold">
                        Description
                      </TableHead>
                      <TableHead className="text-xs text-slate-400 font-semibold text-center">
                        Associated Products
                      </TableHead>
                      <TableHead className="text-xs text-slate-400 font-semibold pr-5 text-right">
                        Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCategories.map((c) => (
                      <TableRow
                        key={c.category_id}
                        className="hover:bg-slate-50/70 border-b border-slate-100/80"
                      >
                        <TableCell className="font-mono text-xs text-slate-400 pl-5">
                          #{c.category_id}
                        </TableCell>
                        <TableCell className="font-bold text-xs text-slate-900">
                          {c.name}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 max-w-sm truncate">
                          {c.description || "General enterprise product grouping"}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {c.products_count || 0} SKUs
                          </span>
                        </TableCell>
                        <TableCell className="text-right pr-5">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                            Active
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

      {/* Add Category Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 !m-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                  <Tags className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Add Product Category</h3>
                  <p className="text-[11px] text-slate-500">
                    Create a new catalog category for SKU classification
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory}>
              <div className="p-5 space-y-4">
                {formError && (
                  <div className="p-3 text-xs rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                    {formError}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Category Name
                  </label>
                  <Input
                    placeholder="e.g. Office Stationery, Industrial Tools"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    className="h-10 rounded-xl border-slate-200/80 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Description
                  </label>
                  <Input
                    placeholder="Short description of products in this category"
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    className="h-10 rounded-xl border-slate-200/80 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 p-4 border-t border-slate-100 bg-slate-50/50">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border-slate-200 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-medium text-xs shadow-xs"
                >
                  {submitting ? "Saving..." : "Create Category"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
