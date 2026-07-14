"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserProvider, useUser } from "@/lib/context/user-context";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <LayoutShellInner>{children}</LayoutShellInner>
    </UserProvider>
  );
}

function LayoutShellInner({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07090F] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <span className="text-xs text-[#94A3B8] tracking-widest uppercase">Initializing Revti Workspace...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="dashboard-page-shell min-h-screen bg-[#07090F] text-white">
      {/* Fixed left sidebar for large viewports */}
      <Sidebar className="hidden lg:flex" />

      {/* Layout content shift */}
      <div className="dashboard-main lg:pl-64 flex flex-col min-h-screen">
        <Topbar />
        <main className="dashboard-content flex-1 w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
