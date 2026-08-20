import { notFound } from "next/navigation";

import { InstallmentApplicationForm } from "@/components/installment/installment-application-form";
import { Container } from "@/components/ui/container";
import { getActiveInstallmentContractOffer } from "@/lib/installment/contract-server";
import {
  getInstallmentHashSecret,
  getInstallmentServiceClient,
  resolveInstallmentProduct,
} from "@/lib/installment/server";
import { isUuid } from "@/lib/installment/validation";

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
  const service = getInstallmentServiceClient();
  if (!service) notFound();
  const product = await resolveInstallmentProduct(
    service,
    productId,
    variantId,
  );
  if (!product.data) notFound();
  const contract = await getActiveInstallmentContractOffer(
    service,
    product.data,
    getInstallmentHashSecret(),
  );
  return (
    <main className="min-h-screen bg-zinc-50 py-6 sm:py-10">
      <Container>
        <InstallmentApplicationForm
          product={product.data}
          contract={contract}
        />
      </Container>
    </main>
  );
}
