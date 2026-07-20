import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Macro Tracker",
  description: "Daily calorie and macro tracking against your nutrition plan",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-screen bg-zinc-950 font-sans text-zinc-100">
        <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
          <nav className="mx-auto flex max-w-3xl items-center gap-6 px-4 py-3">
            <span className="text-lg font-semibold tracking-tight text-emerald-400">
              Macro Tracker
            </span>
            <Link href="/" className="text-sm text-zinc-300 hover:text-white">
              Diary
            </Link>
            <Link href="/plan" className="text-sm text-zinc-300 hover:text-white">
              Plan
            </Link>
            <Link href="/timer" className="text-sm text-zinc-300 hover:text-white">
              Timer
            </Link>
          </nav>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
