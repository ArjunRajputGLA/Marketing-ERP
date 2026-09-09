"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Lock, ArrowRight, Check, Eye, EyeOff, Sparkles, BarChart3, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("Password@123");
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="min-h-screen w-full flex items-center justify-center p-3 sm:p-6 lg:p-10 bg-gradient-to-br from-[#eceae5] via-[#f5f4ef] to-[#ebe8e1]">
      {/* Main Curved Card Frame */}
      <div className="w-full max-w-5xl rounded-[2.5rem] bg-[#fbf9f5] border border-stone-200/80 shadow-2xl shadow-stone-900/10 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
        
        {/* Left Column: Sign In & Relevant Options */}
        <div className="lg:col-span-5 p-7 sm:p-10 lg:p-12 flex flex-col justify-between bg-gradient-to-b from-[#fbf9f5] via-[#faf8f3] to-[#f6eedd]/40">
          
          {/* Top Brand Badge */}
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-stone-300/80 bg-white/80 text-xs font-semibold text-stone-800 tracking-tight shadow-xs">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Marketing ERP</span>
            </div>

            {/* Headline */}
            <div className="mt-8 sm:mt-10">
              <h1 className="text-2xl sm:text-3xl font-normal tracking-tight text-stone-900">
                Sign in to account
              </h1>
              <p className="text-xs text-stone-500 mt-1.5 font-normal leading-relaxed">
                Enter your credentials or choose a seeded research role
              </p>
            </div>
          </div>

          {/* Form Content */}
          <div className="my-6 space-y-4">
            {error && (
              <div className="p-3 text-xs rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 font-medium animate-shake">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Username field */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-stone-600 block pl-1">
                  Username
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. admin, manager, staff"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoComplete="username"
                    className="w-full h-12 rounded-full px-5 bg-white/90 border border-stone-200/90 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400/60 focus:border-amber-400 transition-all shadow-xs"
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-stone-600 block pl-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full h-12 rounded-full px-5 pr-12 bg-white/90 border border-stone-200/90 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400/60 focus:border-amber-400 transition-all shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors p-1"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Golden Pill Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 mt-1 rounded-full bg-[#fed053] hover:bg-[#fecb3e] active:scale-[0.99] text-stone-900 font-semibold text-sm shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {loading ? "Authenticating..." : "Submit"}
              </button>
            </form>

            {/* Quick Seeded Roles (Relevant Options from ERP) */}
            <div className="pt-2">
              <div className="text-[11px] font-medium text-stone-400 mb-2 pl-1">
                Quick switch seeded role:
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { user: "admin", role: "ADMIN" },
                  { user: "manager", role: "MANAGER" },
                  { user: "staff", role: "STAFF" },
                ].map((item) => (
                  <button
                    key={item.user}
                    type="button"
                    onClick={() => selectDemoAccount(item.user)}
                    className={`h-11 px-2.5 rounded-full border text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      username === item.user
                        ? "border-amber-400 bg-amber-100/60 text-stone-900 font-semibold shadow-xs ring-1 ring-amber-400/50"
                        : "border-stone-200/90 bg-white/80 hover:bg-white text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    {username === item.user && (
                      <Check className="h-3 w-3 text-amber-700 stroke-[3]" />
                    )}
                    <span className="capitalize">{item.user}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Footer Info */}
          <div className="pt-4 border-t border-stone-200/60 flex items-center justify-between text-[11px] text-stone-400">
            <span>PostgreSQL 18 &bull; RLS Security</span>
            <span>GLA University Research</span>
          </div>
        </div>

        {/* Right Column: Hero Visual Showcase with Floating Cards */}
        <div className="lg:col-span-7 p-3 sm:p-4 bg-[#fbf9f5] flex items-center">
          <div className="relative w-full h-[450px] sm:h-[520px] lg:h-full min-h-[550px] rounded-[2rem] overflow-hidden shadow-lg group">
            {/* Background Photography Asset */}
            <img
              src="/login-hero.jpg"
              alt="GLA Research Collaboration"
              className="w-full h-full object-cover object-center transform transition-transform duration-700 ease-out group-hover:scale-105"
            />

            {/* Subtle Lighting Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-stone-950/20 to-stone-950/10 pointer-events-none" />

            {/* Top Right Decorative Dismiss/Info Pill */}
            <div className="absolute top-6 right-6 z-20 h-9 w-9 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-stone-700 shadow-md">
              <X className="h-4 w-4" />
            </div>

            {/* Top Floating Amber Card (Inspiration style: Task Review card) */}
            <div className="absolute top-6 left-6 z-20 bg-[#fed053] text-stone-900 p-3.5 rounded-2xl shadow-xl max-w-[230px] border border-amber-300/60 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-stone-900">Multi-Agent AI Decision</span>
                <span className="h-2 w-2 rounded-full bg-stone-900" />
              </div>
              <div className="text-[11px] text-stone-800 font-medium mt-0.5">
                09:30 AM &bull; Optimal Routing
              </div>
            </div>

            {/* Right-Center Glassmorphic Calendar Widget (Inspiration style: Frosted weekly calendar) */}
            <div className="absolute right-6 bottom-36 sm:bottom-40 z-20 backdrop-blur-md bg-stone-900/40 border border-white/25 text-white rounded-2xl p-4 shadow-2xl max-w-[270px] w-full">
              <div className="grid grid-cols-7 text-center text-[10px] font-medium text-white/70 tracking-wider">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>
              <div className="grid grid-cols-7 text-center text-xs font-bold text-white pt-2">
                <span className="text-white/60">22</span>
                <span>23</span>
                <span>24</span>
                <span className="bg-amber-400 text-stone-950 rounded-lg py-0.5 shadow-xs font-extrabold">25</span>
                <span>26</span>
                <span>27</span>
                <span className="text-white/60">28</span>
              </div>
              {/* Subtle metric stripe container */}
              <div className="mt-3 pt-2.5 border-t border-white/15 flex items-center justify-between text-[10px] text-white/80 font-medium">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ERP Telemetry Live
                </span>
                <span className="font-mono text-[9px] text-amber-300">99.4% SLA</span>
              </div>
            </div>

            {/* Bottom Floating White Card (Inspiration style: Daily Meeting card with avatars) */}
            <div className="absolute bottom-6 left-6 z-20 bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-white/80 max-w-[260px] w-full">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900">Executive Analytics Sync</span>
                <span className="h-2 w-2 rounded-full bg-amber-400" />
              </div>
              <div className="text-[11px] text-stone-500 font-medium mt-0.5">
                12:00 PM &ndash; 01:00 PM
              </div>

              {/* Team Avatars */}
              <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-stone-100">
                <div className="flex -space-x-2">
                  <div className="h-6 w-6 rounded-full bg-stone-800 text-amber-300 font-bold text-[9px] flex items-center justify-center ring-2 ring-white">
                    AR
                  </div>
                  <div className="h-6 w-6 rounded-full bg-sky-600 text-white font-bold text-[9px] flex items-center justify-center ring-2 ring-white">
                    GL
                  </div>
                  <div className="h-6 w-6 rounded-full bg-amber-500 text-white font-bold text-[9px] flex items-center justify-center ring-2 ring-white">
                    AI
                  </div>
                </div>
                <span className="text-[10px] text-stone-400 font-medium ml-1.5">
                  Multi-Agent Active
                </span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
