"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "シミュレーター" },
  { href: "/map", label: "競合マップ" },
  { href: "/facts", label: "ファクト" },
];

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center justify-between gap-6 px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground">
            <span className="text-[11px] font-bold tracking-tighter">EV</span>
          </span>
          <span className="text-sm font-semibold tracking-tight">
            EV-Insight
          </span>
          <span className="hidden text-[11px] uppercase tracking-[0.18em] text-muted-foreground sm:inline">
            Sales Closing Suite
          </span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm transition-colors duration-200",
                  active
                    ? "bg-foreground/5 text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground md:inline">
            v2.0
          </span>
        </div>
      </div>
    </header>
  );
}
