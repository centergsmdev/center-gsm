import type { Tables } from "@/types/database";
export type InventoryStatus = "in-stock" | "critical" | "out-of-stock";
export type AdminInventoryRow = Tables<"inventory"> & { product: Tables<"products">; warehouse: Tables<"warehouses">; image_url: string | null; available_stock: number; status: InventoryStatus };
export type AdminInventoryMovement = Tables<"inventory_movements"> & { product_name: string; sku: string; warehouse_name: string; order_number: string | null; admin_name: string | null };
export type InventoryFilters = { query?: string; warehouseId?: string; stock?: "all" | "in-stock" | "out-of-stock" | "critical"; productActive?: "all" | "active" | "inactive"; sort?: "name" | "stock-asc" | "stock-desc" | "critical" };
export type MovementFilters = { warehouseId?: string; productId?: string; movementType?: Tables<"inventory_movements">["movement_type"]; orderNumber?: string; dateFrom?: string; dateTo?: string };
export type WarehouseValues = Pick<Tables<"warehouses">,"name"|"code"|"description"|"address"|"is_active"|"is_default">;
