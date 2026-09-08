"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, User, Lock, ArrowRight, CheckCircle2, BarChart2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("Password@123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectDemoAccount = (u: string) => {
    setUsername(u);
    setPassword("Password@123");
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-slate-50">
      {/* Subtle clean background decorative grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative w-full max-w-md space-y-6 z-10">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 shadow-md shadow-blue-500/20 mb-1">
            <BarChart2 className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Marketing ERP Decision Support
          </h1>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            GLA University Final-Year Research &bull; Evidence-Grounded Multi-Agent AI
          </p>
        </div>

        {/* Login Card */}
        <Card className="border border-slate-200 bg-white shadow-xl">
          <CardHeader className="space-y-1 pb-4 border-b border-slate-100">
            <CardTitle className="text-lg font-semibold text-slate-900">Enterprise Sign In</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Sign in with your credentials or choose a pre-seeded research role
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            {error && (
              <div className="p-3 text-xs rounded-md bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-slate-500" /> Username
                </label>
                <Input
                  type="text"
                  placeholder="admin / manager / staff"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-slate-500" /> Password
                </label>
                <Input
                  type="password"
                  placeholder="Password@123"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-all"
              >
                {loading ? "Authenticating..." : "Sign In to ERP"}
                {!loading && <ArrowRight className="h-4 w-4 ml-2" />}
              </Button>
            </form>

            {/* Quick Demo Access Buttons */}
            <div className="pt-4 border-t border-slate-200">
              <div className="text-[11px] font-semibold text-slate-600 mb-2.5 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                Select Seeded Research Role:
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { user: "admin", role: "ADMIN", desc: "Full Access" },
                  { user: "manager", role: "MANAGER", desc: "Operations" },
                  { user: "staff", role: "USER", desc: "Sales/Stock" },
                ].map((item) => (
                  <button
                    key={item.user}
                    type="button"
                    onClick={() => selectDemoAccount(item.user)}
                    className={`p-2.5 rounded-lg text-left border transition-all ${
                      username === item.user
                        ? "border-blue-600 bg-blue-50/80 ring-1 ring-blue-600"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold capitalize text-slate-900">
                        {item.user}
                      </span>
                      {username === item.user && (
                        <Check className="h-3.5 w-3.5 text-blue-600 stroke-[3]" />
                      )}
                    </div>
                    <div className="text-[10px] font-medium text-slate-500 mt-0.5">
                      {item.role}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Architecture footnote */}
        <div className="text-center text-[11px] text-slate-500 space-y-1">
          <div>PostgreSQL 18 &bull; RLS Security &bull; Deterministic Analytics Views</div>
          <div>All queries run under transaction-isolated session context</div>
        </div>
      </div>
    </div>
  );
}
