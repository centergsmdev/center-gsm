import { AlertTriangle, Inbox, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminEmptyState({ title = "Henüz kayıt yok", description = "Yeni bir kayıt eklediğinizde burada görüntülenecek.", action }: { title?: string; description?: string; action?: () => void }) {
  return <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center"><span className="mb-4 grid size-12 place-items-center rounded-xl bg-zinc-100"><Inbox className="size-5" /></span><h3 className="font-bold text-zinc-950">{title}</h3><p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">{description}</p>{action ? <Button className="mt-5" onClick={action}>Yeni kayıt</Button> : null}</div>;
}

export function AdminLoadingState() {
  return <div className="flex min-h-64 items-center justify-center gap-3 text-sm font-semibold text-zinc-600" role="status"><LoaderCircle className="size-5 animate-spin text-red-600" /><span>Yönetim verileri hazırlanıyor…</span></div>;
}

export function AdminErrorState({ retry }: { retry?: () => void }) {
  return <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center" role="alert"><AlertTriangle className="mb-3 size-6 text-red-600" /><h3 className="font-bold text-zinc-950">Bir şeyler ters gitti</h3><p className="mt-2 text-sm text-zinc-500">Bilgiler yüklenemedi. Lütfen tekrar deneyin.</p>{retry ? <Button variant="outline" className="mt-5" onClick={retry}>Tekrar dene</Button> : null}</div>;
}
