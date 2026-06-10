
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 6.5.0
 * Query Engine version: 173f8d54f8d52e692c7e27e72a88314ec7aeff60
 */
Prisma.prismaVersion = {
  client: "6.5.0",
  engine: "173f8d54f8d52e692c7e27e72a88314ec7aeff60"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.CartScalarFieldEnum = {
  id: 'id',
  customerId: 'customerId',
  anonymousToken: 'anonymousToken',
  currency: 'currency',
  subtotalMinor: 'subtotalMinor',
  discountMinor: 'discountMinor',
  shippingMinor: 'shippingMinor',
  totalMinor: 'totalMinor',
  couponCode: 'couponCode',
  version: 'version',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CartItemScalarFieldEnum = {
  id: 'id',
  cartId: 'cartId',
  variantId: 'variantId',
  quantity: 'quantity',
  unitPriceMinor: 'unitPriceMinor',
  currency: 'currency',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CategoryScalarFieldEnum = {
  id: 'id',
  vendorId: 'vendorId',
  parentId: 'parentId',
  slug: 'slug',
  name: 'name',
  description: 'description',
  position: 'position',
  imageUrl: 'imageUrl',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.BrandScalarFieldEnum = {
  id: 'id',
  vendorId: 'vendorId',
  slug: 'slug',
  name: 'name',
  description: 'description',
  logoUrl: 'logoUrl',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.ProductScalarFieldEnum = {
  id: 'id',
  vendorId: 'vendorId',
  kind: 'kind',
  status: 'status',
  brandId: 'brandId',
  slug: 'slug',
  name: 'name',
  shortDescription: 'shortDescription',
  description: 'description',
  hasVariants: 'hasVariants',
  useVariantImages: 'useVariantImages',
  imageAttributeId: 'imageAttributeId',
  isFeatured: 'isFeatured',
  defaultVariantId: 'defaultVariantId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.ProductCategoryScalarFieldEnum = {
  productId: 'productId',
  categoryId: 'categoryId',
  position: 'position'
};

exports.Prisma.ProductMediaScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  variantId: 'variantId',
  attributeValueId: 'attributeValueId',
  url: 'url',
  altText: 'altText',
  position: 'position',
  isPrimary: 'isPrimary',
  cloudinaryId: 'cloudinaryId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.VariantScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  sku: 'sku',
  barcode: 'barcode',
  name: 'name',
  weightGrams: 'weightGrams',
  isDefault: 'isDefault',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.AttributeScalarFieldEnum = {
  id: 'id',
  vendorId: 'vendorId',
  code: 'code',
  label: 'label',
  kind: 'kind',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AttributeValueScalarFieldEnum = {
  id: 'id',
  attributeId: 'attributeId',
  value: 'value',
  label: 'label',
  swatchHex: 'swatchHex',
  position: 'position',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.VariantAttributeValueScalarFieldEnum = {
  variantId: 'variantId',
  attributeValueId: 'attributeValueId'
};

exports.Prisma.SpecificationScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  key: 'key',
  value: 'value',
  position: 'position',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ReviewScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  customerId: 'customerId',
  orderItemId: 'orderItemId',
  rating: 'rating',
  title: 'title',
  body: 'body',
  status: 'status',
  helpfulCount: 'helpfulCount',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.AdminScalarFieldEnum = {
  id: 'id',
  clerkUserId: 'clerkUserId',
  email: 'email',
  firstName: 'firstName',
  lastName: 'lastName',
  status: 'status',
  lastLoginAt: 'lastLoginAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.RoleScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  isSystem: 'isSystem',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PermissionScalarFieldEnum = {
  id: 'id',
  key: 'key',
  resource: 'resource',
  action: 'action',
  description: 'description',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RolePermissionScalarFieldEnum = {
  roleId: 'roleId',
  permissionId: 'permissionId'
};

exports.Prisma.RoleAssignmentScalarFieldEnum = {
  id: 'id',
  adminId: 'adminId',
  roleId: 'roleId',
  vendorId: 'vendorId',
  createdAt: 'createdAt'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  actorKind: 'actorKind',
  actorId: 'actorId',
  entityType: 'entityType',
  entityId: 'entityId',
  action: 'action',
  before: 'before',
  after: 'after',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  createdAt: 'createdAt'
};

exports.Prisma.CustomerScalarFieldEnum = {
  id: 'id',
  email: 'email',
  emailVerified: 'emailVerified',
  phone: 'phone',
  passwordHash: 'passwordHash',
  firstName: 'firstName',
  lastName: 'lastName',
  status: 'status',
  locale: 'locale',
  currency: 'currency',
  marketingOptIn: 'marketingOptIn',
  lastLoginAt: 'lastLoginAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.WishlistItemScalarFieldEnum = {
  id: 'id',
  customerId: 'customerId',
  productId: 'productId',
  createdAt: 'createdAt'
};

exports.Prisma.OAuthAccountScalarFieldEnum = {
  id: 'id',
  customerId: 'customerId',
  provider: 'provider',
  providerAccountId: 'providerAccountId',
  accessToken: 'accessToken',
  refreshToken: 'refreshToken',
  expiresAt: 'expiresAt',
  scope: 'scope',
  tokenType: 'tokenType',
  idToken: 'idToken',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CustomerSessionScalarFieldEnum = {
  id: 'id',
  customerId: 'customerId',
  token: 'token',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  deviceId: 'deviceId',
  expiresAt: 'expiresAt',
  revokedAt: 'revokedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DeviceScalarFieldEnum = {
  id: 'id',
  customerId: 'customerId',
  fingerprint: 'fingerprint',
  name: 'name',
  lastSeenAt: 'lastSeenAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AddressScalarFieldEnum = {
  id: 'id',
  customerId: 'customerId',
  type: 'type',
  fullName: 'fullName',
  phone: 'phone',
  line1: 'line1',
  line2: 'line2',
  city: 'city',
  state: 'state',
  postalCode: 'postalCode',
  country: 'country',
  isDefault: 'isDefault',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.WarehouseScalarFieldEnum = {
  id: 'id',
  vendorId: 'vendorId',
  code: 'code',
  name: 'name',
  city: 'city',
  state: 'state',
  country: 'country',
  isDefault: 'isDefault',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.InventoryLevelScalarFieldEnum = {
  id: 'id',
  warehouseId: 'warehouseId',
  variantId: 'variantId',
  onHand: 'onHand',
  reserved: 'reserved',
  incoming: 'incoming',
  version: 'version',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InventoryReservationScalarFieldEnum = {
  id: 'id',
  variantId: 'variantId',
  warehouseId: 'warehouseId',
  quantity: 'quantity',
  orderId: 'orderId',
  cartId: 'cartId',
  expiresAt: 'expiresAt',
  releasedAt: 'releasedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InventoryMovementScalarFieldEnum = {
  id: 'id',
  variantId: 'variantId',
  warehouseId: 'warehouseId',
  quantity: 'quantity',
  reason: 'reason',
  referenceType: 'referenceType',
  referenceId: 'referenceId',
  costMinor: 'costMinor',
  currency: 'currency',
  createdAt: 'createdAt'
};

exports.Prisma.CouponScalarFieldEnum = {
  id: 'id',
  vendorId: 'vendorId',
  code: 'code',
  type: 'type',
  value: 'value',
  currency: 'currency',
  scope: 'scope',
  targetIds: 'targetIds',
  minSubtotalMinor: 'minSubtotalMinor',
  maxRedemptions: 'maxRedemptions',
  perCustomerLimit: 'perCustomerLimit',
  validFrom: 'validFrom',
  validTo: 'validTo',
  active: 'active',
  redemptionsCount: 'redemptionsCount',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.CouponRedemptionScalarFieldEnum = {
  id: 'id',
  couponId: 'couponId',
  customerId: 'customerId',
  orderId: 'orderId',
  createdAt: 'createdAt'
};

exports.Prisma.OrderScalarFieldEnum = {
  id: 'id',
  orderNumber: 'orderNumber',
  vendorId: 'vendorId',
  customerId: 'customerId',
  currency: 'currency',
  subtotalMinor: 'subtotalMinor',
  discountMinor: 'discountMinor',
  shippingMinor: 'shippingMinor',
  taxMinor: 'taxMinor',
  totalMinor: 'totalMinor',
  status: 'status',
  fulfillmentStatus: 'fulfillmentStatus',
  placedAt: 'placedAt',
  cancelledAt: 'cancelledAt',
  shippingAddress: 'shippingAddress',
  billingAddress: 'billingAddress',
  couponCode: 'couponCode',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.OrderItemScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  variantId: 'variantId',
  productSnapshot: 'productSnapshot',
  quantity: 'quantity',
  unitPriceMinor: 'unitPriceMinor',
  discountMinor: 'discountMinor',
  taxMinor: 'taxMinor',
  totalMinor: 'totalMinor',
  fulfillmentStatus: 'fulfillmentStatus',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OrderTimelineEventScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  type: 'type',
  message: 'message',
  payload: 'payload',
  actorKind: 'actorKind',
  actorId: 'actorId',
  createdAt: 'createdAt'
};

exports.Prisma.FulfillmentScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  warehouseId: 'warehouseId',
  status: 'status',
  shippedAt: 'shippedAt',
  deliveredAt: 'deliveredAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ShipmentScalarFieldEnum = {
  id: 'id',
  fulfillmentId: 'fulfillmentId',
  carrier: 'carrier',
  service: 'service',
  trackingNumber: 'trackingNumber',
  trackingUrl: 'trackingUrl',
  labelUrl: 'labelUrl',
  status: 'status',
  shippedAt: 'shippedAt',
  deliveredAt: 'deliveredAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ShipmentItemScalarFieldEnum = {
  id: 'id',
  shipmentId: 'shipmentId',
  orderItemId: 'orderItemId',
  quantity: 'quantity'
};

exports.Prisma.PaymentIntentScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  provider: 'provider',
  providerIntentId: 'providerIntentId',
  amountMinor: 'amountMinor',
  currency: 'currency',
  status: 'status',
  idempotencyKey: 'idempotencyKey',
  clientPayload: 'clientPayload',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PaymentAttemptScalarFieldEnum = {
  id: 'id',
  paymentIntentId: 'paymentIntentId',
  attemptNumber: 'attemptNumber',
  status: 'status',
  errorCode: 'errorCode',
  errorMessage: 'errorMessage',
  providerPayload: 'providerPayload',
  createdAt: 'createdAt'
};

exports.Prisma.PaymentTransactionScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  provider: 'provider',
  providerTxnId: 'providerTxnId',
  kind: 'kind',
  amountMinor: 'amountMinor',
  currency: 'currency',
  status: 'status',
  capturedAt: 'capturedAt',
  raw: 'raw',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RefundScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  paymentTransactionId: 'paymentTransactionId',
  amountMinor: 'amountMinor',
  currency: 'currency',
  reason: 'reason',
  status: 'status',
  providerRefundId: 'providerRefundId',
  processedAt: 'processedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.WebhookEventScalarFieldEnum = {
  id: 'id',
  provider: 'provider',
  providerEventId: 'providerEventId',
  type: 'type',
  payload: 'payload',
  signatureValid: 'signatureValid',
  status: 'status',
  attempts: 'attempts',
  receivedAt: 'receivedAt',
  processedAt: 'processedAt',
  error: 'error',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PriceListScalarFieldEnum = {
  id: 'id',
  vendorId: 'vendorId',
  code: 'code',
  name: 'name',
  currency: 'currency',
  isDefault: 'isDefault',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.PriceScalarFieldEnum = {
  id: 'id',
  priceListId: 'priceListId',
  variantId: 'variantId',
  amountMinor: 'amountMinor',
  compareAtAmountMinor: 'compareAtAmountMinor',
  currency: 'currency',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OutboxEventScalarFieldEnum = {
  id: 'id',
  aggregateType: 'aggregateType',
  aggregateId: 'aggregateId',
  type: 'type',
  payload: 'payload',
  status: 'status',
  attempts: 'attempts',
  processedAt: 'processedAt',
  error: 'error',
  createdAt: 'createdAt'
};

exports.Prisma.IdempotencyKeyScalarFieldEnum = {
  key: 'key',
  scope: 'scope',
  requestHash: 'requestHash',
  response: 'response',
  createdAt: 'createdAt',
  expiresAt: 'expiresAt'
};

exports.Prisma.SettingScalarFieldEnum = {
  id: 'id',
  vendorId: 'vendorId',
  scope: 'scope',
  key: 'key',
  value: 'value',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.VendorScalarFieldEnum = {
  id: 'id',
  slug: 'slug',
  name: 'name',
  isPlatform: 'isPlatform',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.ProductKind = exports.$Enums.ProductKind = {
  PHYSICAL: 'PHYSICAL',
  DIGITAL: 'DIGITAL',
  SERVICE: 'SERVICE',
  SUBSCRIPTION: 'SUBSCRIPTION',
  BUNDLE: 'BUNDLE',
  KIT: 'KIT',
  COURSE: 'COURSE'
};

exports.ProductStatus = exports.$Enums.ProductStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED'
};

exports.AttributeKind = exports.$Enums.AttributeKind = {
  LIST: 'LIST',
  TEXT: 'TEXT',
  NUMBER: 'NUMBER',
  SWATCH: 'SWATCH'
};

exports.AdminStatus = exports.$Enums.AdminStatus = {
  ACTIVE: 'ACTIVE',
  INVITED: 'INVITED',
  SUSPENDED: 'SUSPENDED'
};

exports.ActorKind = exports.$Enums.ActorKind = {
  CUSTOMER: 'CUSTOMER',
  ADMIN: 'ADMIN',
  SYSTEM: 'SYSTEM'
};

exports.CustomerStatus = exports.$Enums.CustomerStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  DELETED: 'DELETED'
};

exports.AddressType = exports.$Enums.AddressType = {
  BILLING: 'BILLING',
  SHIPPING: 'SHIPPING',
  BOTH: 'BOTH'
};

exports.StockReason = exports.$Enums.StockReason = {
  PURCHASE: 'PURCHASE',
  SALE: 'SALE',
  RETURN: 'RETURN',
  ADJUSTMENT: 'ADJUSTMENT',
  RESERVATION: 'RESERVATION',
  RELEASE: 'RELEASE',
  DAMAGE: 'DAMAGE'
};

exports.CouponType = exports.$Enums.CouponType = {
  PERCENT: 'PERCENT',
  FIXED: 'FIXED',
  FREE_SHIPPING: 'FREE_SHIPPING'
};

exports.PromotionScope = exports.$Enums.PromotionScope = {
  CART: 'CART',
  PRODUCT: 'PRODUCT',
  CATEGORY: 'CATEGORY',
  BRAND: 'BRAND',
  COLLECTION: 'COLLECTION'
};

exports.OrderStatus = exports.$Enums.OrderStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PROCESSING: 'PROCESSING',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  RETURNED: 'RETURNED',
  REFUNDED: 'REFUNDED',
  FAILED: 'FAILED'
};

exports.FulfillmentStatus = exports.$Enums.FulfillmentStatus = {
  UNFULFILLED: 'UNFULFILLED',
  PARTIAL: 'PARTIAL',
  FULFILLED: 'FULFILLED'
};

exports.ShipmentStatus = exports.$Enums.ShipmentStatus = {
  PENDING: 'PENDING',
  LABELED: 'LABELED',
  IN_TRANSIT: 'IN_TRANSIT',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
  RETURNED: 'RETURNED'
};

exports.PaymentProvider = exports.$Enums.PaymentProvider = {
  RAZORPAY: 'RAZORPAY',
  STRIPE: 'STRIPE',
  PAYPAL: 'PAYPAL',
  CASHFREE: 'CASHFREE',
  WALLET: 'WALLET',
  COD: 'COD',
  GIFT_CARD: 'GIFT_CARD',
  STORE_CREDIT: 'STORE_CREDIT'
};

exports.PaymentIntentStatus = exports.$Enums.PaymentIntentStatus = {
  REQUIRES_ACTION: 'REQUIRES_ACTION',
  PROCESSING: 'PROCESSING',
  AUTHORIZED: 'AUTHORIZED',
  CAPTURED: 'CAPTURED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
  PARTIAL_REFUND: 'PARTIAL_REFUND'
};

exports.PaymentTxnKind = exports.$Enums.PaymentTxnKind = {
  AUTH: 'AUTH',
  CAPTURE: 'CAPTURE',
  REFUND: 'REFUND',
  VOID: 'VOID'
};

exports.RefundStatus = exports.$Enums.RefundStatus = {
  PROCESSING: 'PROCESSING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED'
};

exports.WebhookStatus = exports.$Enums.WebhookStatus = {
  PENDING: 'PENDING',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
  DEAD_LETTER: 'DEAD_LETTER'
};

exports.OutboxStatus = exports.$Enums.OutboxStatus = {
  PENDING: 'PENDING',
  PROCESSED: 'PROCESSED',
  FAILED: 'FAILED'
};

exports.Prisma.ModelName = {
  Cart: 'Cart',
  CartItem: 'CartItem',
  Category: 'Category',
  Brand: 'Brand',
  Product: 'Product',
  ProductCategory: 'ProductCategory',
  ProductMedia: 'ProductMedia',
  Variant: 'Variant',
  Attribute: 'Attribute',
  AttributeValue: 'AttributeValue',
  VariantAttributeValue: 'VariantAttributeValue',
  Specification: 'Specification',
  Review: 'Review',
  Admin: 'Admin',
  Role: 'Role',
  Permission: 'Permission',
  RolePermission: 'RolePermission',
  RoleAssignment: 'RoleAssignment',
  AuditLog: 'AuditLog',
  Customer: 'Customer',
  WishlistItem: 'WishlistItem',
  OAuthAccount: 'OAuthAccount',
  CustomerSession: 'CustomerSession',
  Device: 'Device',
  Address: 'Address',
  Warehouse: 'Warehouse',
  InventoryLevel: 'InventoryLevel',
  InventoryReservation: 'InventoryReservation',
  InventoryMovement: 'InventoryMovement',
  Coupon: 'Coupon',
  CouponRedemption: 'CouponRedemption',
  Order: 'Order',
  OrderItem: 'OrderItem',
  OrderTimelineEvent: 'OrderTimelineEvent',
  Fulfillment: 'Fulfillment',
  Shipment: 'Shipment',
  ShipmentItem: 'ShipmentItem',
  PaymentIntent: 'PaymentIntent',
  PaymentAttempt: 'PaymentAttempt',
  PaymentTransaction: 'PaymentTransaction',
  Refund: 'Refund',
  WebhookEvent: 'WebhookEvent',
  PriceList: 'PriceList',
  Price: 'Price',
  OutboxEvent: 'OutboxEvent',
  IdempotencyKey: 'IdempotencyKey',
  Setting: 'Setting',
  Vendor: 'Vendor'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
