"use client";

import { useState, type ReactNode } from "react";
import { AdminHeader } from "./admin-header";
import { AdminSidebar } from "./admin-sidebar";

export function AdminShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="min-h-screen bg-[#f6f6f7] text-zinc-950">
      <div className="fixed inset-y-0 left-0 hidden md:block">
        <AdminSidebar />
      </div>
      <AdminSidebar mobile open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="min-w-0 md:pl-[76px] lg:pl-[260px]">
        <AdminHeader onMenu={() => setMenuOpen(true)} />
        <main className="mx-auto w-full min-w-0 max-w-[1600px] p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
