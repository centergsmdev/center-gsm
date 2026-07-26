"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminAuth } from "@/providers/admin-auth-provider";

export function AdminLoginForm() {
  const router = useRouter();
  const { login } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(""); setLoading(true);
    const result = await login(email, password, remember);
    if (result.success) router.replace("/admin");
    else { setError(result.error ?? "Giriş yapılamadı."); setLoading(false); }
  };
  return <form onSubmit={submit} className="space-y-5" noValidate><div><label htmlFor="admin-email" className="mb-2 block text-sm font-semibold text-zinc-800">E-posta</label><div className="relative"><Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400" /><input id="admin-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12 w-full rounded-xl border border-zinc-200 pl-10 pr-4 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10" /></div></div><div><label htmlFor="admin-password" className="mb-2 block text-sm font-semibold text-zinc-800">Şifre</label><div className="relative"><LockKeyhole className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400" /><input id="admin-password" type={visible ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-12 w-full rounded-xl border border-zinc-200 pl-10 pr-12 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10" /><button type="button" onClick={() => setVisible((v) => !v)} className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-100" aria-label={visible ? "Şifreyi gizle" : "Şifreyi göster"}>{visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></div><label className="flex cursor-pointer items-center gap-3 text-sm text-zinc-600"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="size-4 rounded border-zinc-300 accent-red-600" />Beni hatırla</label>{error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">{error}</p> : null}<Button type="submit" className="h-12 w-full rounded-xl" disabled={loading}>{loading ? "Giriş yapılıyor…" : "Giriş yap"}<ArrowRight className="size-4" /></Button><p className="text-center text-xs leading-5 text-zinc-500">Supabase Auth · Yalnızca admin rolüne sahip hesaplar erişebilir.</p></form>;
}
