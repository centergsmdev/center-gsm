import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function AccessRestrictedPage() {
  return (
    <main className="grid min-h-[70dvh] place-items-center bg-zinc-50 px-4 py-16">
      <div className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-zinc-100">
          <ShieldAlert className="size-7 text-zinc-700" />
        </span>
        <h1 className="mt-5 text-2xl font-black">
          Erişim şu anda kullanılamıyor
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          Bu hizmete erişim şu anda kullanılamıyor. Bir hata olduğunu
          düşünüyorsanız CENTER GSM ile farklı bir iletişim kanalından
          görüşebilirsiniz.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-xl bg-zinc-950 px-5 py-3 text-sm font-black text-white"
        >
          Ana Sayfaya Dön
        </Link>
      </div>
    </main>
  );
}
