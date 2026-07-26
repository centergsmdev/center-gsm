import { createManualShipment } from "../repository/shipping-repository";
import type { CreateShipmentInput } from "../types";
export class ShippingService {
  async createManual(input: CreateShipmentInput) {
    return createManualShipment(input);
  }
}
export const shippingService = new ShippingService();
