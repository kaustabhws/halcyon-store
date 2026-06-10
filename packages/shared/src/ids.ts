declare const brand: unique symbol;
type Brand<T, B> = T & { readonly [brand]: B };

export type CustomerId = Brand<string, "CustomerId">;
export type AdminId = Brand<string, "AdminId">;
export type VendorId = Brand<string, "VendorId">;
export type ProductId = Brand<string, "ProductId">;
export type VariantId = Brand<string, "VariantId">;
export type CategoryId = Brand<string, "CategoryId">;
export type BrandId = Brand<string, "BrandId">;
export type CartId = Brand<string, "CartId">;
export type OrderId = Brand<string, "OrderId">;
export type OrderItemId = Brand<string, "OrderItemId">;
export type WarehouseId = Brand<string, "WarehouseId">;
export type PaymentIntentId = Brand<string, "PaymentIntentId">;
export type PaymentTxnId = Brand<string, "PaymentTxnId">;
export type CouponId = Brand<string, "CouponId">;
export type ReviewId = Brand<string, "ReviewId">;

export const PLATFORM_VENDOR_ID = "vnd_platform" as VendorId;
