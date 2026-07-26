"use client";
import { AdminCard } from "@/components/admin/admin-card";
import { AdminErrorState } from "@/components/admin/admin-states";
export default function AdminError({ reset }: { reset: () => void }) { return <AdminCard><AdminErrorState retry={reset} /></AdminCard>; }
