import { notFound } from "next/navigation";

import { InstallmentApplicationForm } from "@/components/installment/installment-application-form";
import { Container } from "@/components/ui/container";
import { resolveInstallmentProduct } from "@/lib/installment/server";
import { isUuid } from "@/lib/installment/validation";
import { createClient } from "@/lib/supabase/server";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ productId?: string; variantId?: string }>;
}) {
  const params = await searchParams;
  const productId = params.productId ?? "";
  const variantId = params.variantId?.trim() || null;
  if (!isUuid(productId) || (variantId !== null && !isUuid(variantId)))
    notFound();
  const service = await createClient();
  if (!service) notFound();
  const product = await resolveInstallmentProduct(
    service,
    productId,
    variantId,
  );
  if (!product.data) notFound();
  return (
    <main className="min-h-screen bg-zinc-50 py-6 sm:py-10">
      <Container>
        <InstallmentApplicationForm product={product.data} />
      </Container>
    </main>
  );
}
