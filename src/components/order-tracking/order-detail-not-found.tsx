import Link from "next/link";
import { PackageX } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function OrderDetailNotFound() {
  return (
    <Card className="mx-auto max-w-xl p-8 text-center">
      <PackageX className="mx-auto size-12 text-primary" aria-hidden="true" />
      <h1 className="mt-5 text-2xl font-black">Sipariş bulunamadı</h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        Bu sipariş numarası ve iletişim bilgisiyle eşleşen bir kayıt bulunamadı.
        Bilgilerinizi yeniden sorgulayabilirsiniz.
      </p>
      <Link
        href="/siparis-takip"
        className={buttonVariants({ className: "mt-6" })}
      >
        Sipariş Sorgula
      </Link>
    </Card>
  );
}
