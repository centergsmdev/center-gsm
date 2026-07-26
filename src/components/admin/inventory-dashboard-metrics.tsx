"use client";
import { useEffect, useState } from "react";
import { AdminCard } from "./admin-card";
import { Skeleton } from "@/components/ui/skeleton";
import { getInventoryDashboardMetrics } from "@/lib/admin/inventory";
type Metrics={total:number;reserved:number;outOfStock:number;critical:number};
export function InventoryDashboardMetrics(){const[data,setData]=useState<Metrics|null>(null),[error,setError]=useState(false);useEffect(()=>{void getInventoryDashboardMetrics().then(r=>{setData(r.data);setError(!r.data)})},[]);const items=[{label:"Toplam stok adedi",value:data?.total,tone:"bg-zinc-950"},{label:"Rezerve stok",value:data?.reserved,tone:"bg-blue-500"},{label:"Tükenen ürün",value:data?.outOfStock,tone:"bg-red-600"},{label:"Kritik stok",value:data?.critical,tone:"bg-amber-500"}];return <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Gerçek stok metrikleri">{items.map(x=><AdminCard key={x.label} className="relative overflow-hidden p-5"><span className={`absolute left-0 top-5 h-8 w-1 rounded-r-full ${x.tone}`}/><p className="text-xs font-semibold text-zinc-500">{x.label}</p>{data?<p className="mt-3 text-2xl font-black">{x.value}</p>:error?<p className="mt-3 text-sm font-bold text-red-600">Yüklenemedi</p>:<Skeleton className="mt-3 h-8 w-20"/>}<p className="mt-2 text-xs text-zinc-500">Supabase envanteri</p></AdminCard>)}</section>}
