import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Marketing ERP Decision Support | GLA University",
  description:
    "Authoritative Business ERP with Evidence-Grounded Multi-Agent AI & Research Benchmark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="bg-slate-50 text-slate-900 min-h-screen antialiased"
      >
        {children}
      </body>
    </html>
  );
}
