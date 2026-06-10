import type { Money } from "@ecom/shared/money";

export type ShipmentStatus =
  | "pending"
  | "labeled"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "failed"
  | "returned";

export interface ShipmentAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: "IN";
  phone?: string;
}

export interface CreateShipmentInput {
  orderId: string;
  fulfillmentId: string;
  to: ShipmentAddress;
  weightGrams: number;
  declaredValue: Money;
  serviceCode?: string;
}

export interface ShipmentResult {
  trackingNumber: string;
  trackingUrl?: string;
  labelUrl?: string;
  carrier: string;
  service: string;
  status: ShipmentStatus;
}

export interface IShippingProvider {
  readonly code: string;
  createShipment(input: CreateShipmentInput): Promise<ShipmentResult>;
  getStatus(trackingNumber: string): Promise<ShipmentStatus>;
  cancel(trackingNumber: string): Promise<void>;
}

/**
 * MVP mock provider. Generates `MOCK-{id}` tracking numbers and lets a cron
 * progress shipments through statuses on a configurable timeline.
 * Real Shiprocket / Delhivery providers replace this later.
 */
export class MockShippingProvider implements IShippingProvider {
  readonly code = "mock";
  async createShipment(input: CreateShipmentInput): Promise<ShipmentResult> {
    const tracking = `MOCK-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    return {
      trackingNumber: tracking,
      trackingUrl: `https://example.com/track/${tracking}`,
      carrier: "MockCarrier",
      service: input.serviceCode ?? "standard",
      status: "labeled",
    };
  }
  async getStatus(_trackingNumber: string): Promise<ShipmentStatus> {
    return "in_transit";
  }
  async cancel(_trackingNumber: string): Promise<void> {
    return;
  }
}
