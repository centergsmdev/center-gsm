import { AdminProductForm } from "@/components/admin/admin-product-form";

export default async function AdminEditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminProductForm productId={id} />;
}
