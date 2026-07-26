import type { Json } from "@/types/database";
import type { ShipmentPackage } from "../types";
const object = (value: Json): Record<string, Json | undefined> =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};
export function mapShipmentPackage(value: Json): ShipmentPackage {
  const v = object(value);
  return {
    packageCount: Number(v.package_count ?? 1),
    weight: Number(v.weight ?? 0),
    desi: Number(v.desi ?? 0),
    width: Number(v.width ?? 0),
    length: Number(v.length ?? 0),
    height: Number(v.height ?? 0),
    note: typeof v.note === "string" ? v.note : undefined,
  };
}
export const packageToJson = (value: ShipmentPackage): Json => ({
  package_count: value.packageCount ?? 1,
  weight: value.weight ?? 0,
  desi: value.desi ?? 0,
  width: value.width ?? 0,
  length: value.length ?? 0,
  height: value.height ?? 0,
  note: value.note ?? "",
});
