import { Suspense } from "react";
import { AccountPageHeader } from "@/components/account/account-page-header";
import { ReturnRequestForm } from "@/components/returns/return-request-form";
import { Skeleton } from "@/components/ui/skeleton";
export default function Page() {
  return (
    <>
      <AccountPageHeader
        eyebrow="RMA"
        title="İade / Değişim Talebi"
        description="Sipariş ürünlerini seçip talebinizi güvenli şekilde iletin."
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <ReturnRequestForm />
      </Suspense>
    </>
  );
}
