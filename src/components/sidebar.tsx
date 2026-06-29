"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpen, Settings, Compass, KeyRound, Bell, GanttChartSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Knowledge Base", href: "/knowledge-base", icon: BookOpen },
    { name: "Credentials Vault", href: "/credentials", icon: KeyRound },
    { name: "Project Management", href: "/projects", icon: GanttChartSquare },
    { name: "Task Reminders", href: "/reminders", icon: Bell },
    { name: "Portfolio", href: "/portfolio", icon: Compass },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-[#1E2D47] bg-[#07090F] text-white transition-all duration-300",
        className
      )}
    >
      {/* Header Logo */}
      <div className="flex h-16 items-center border-b border-[#1E2D47] px-6">
        <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <Image
            src="/logo.png"
            alt="Revti Digital Logo"
            width={120}
            height={36}
            className="h-8 w-auto object-contain brightness-100"
            priority
          />
          <span className="sr-only">Revti Workspace</span>
        </Link>
      </div>

      {/* Main Navigation Links */}
      <nav className="flex-1 space-y-1 px-4 py-6">
        <div className="px-2 mb-2 text-xs font-semibold tracking-wider text-[#94A3B8] uppercase">
          WORKSPACE
        </div>
        {navigation.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-[#0F1629] text-[#0EA5E9] border-l-2 border-[#0EA5E9] pl-2.5 shadow-sm"
                  : "text-[#94A3B8] hover:bg-[#0F1629]/50 hover:text-white"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-105",
                  isActive ? "text-[#0EA5E9]" : "text-[#94A3B8] group-hover:text-white"
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="border-t border-[#1E2D47] p-4 bg-[#0F1629]/20">
        <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
          <Compass className="h-4 w-4 text-[#38BDF8]" />
          <div>
            <p className="font-semibold text-slate-300">Revti Workspace</p>
            <p className="text-[10px] text-slate-500">v1.0.0 • Production Ready</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
