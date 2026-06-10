/**
 * Re-exports the Prisma-backed repositories from @ecom/database, plus the
 * Money-aware formatters from @ecom/shared. Storefront code imports from
 * here rather than the workspace packages directly so the surface is small
 * and easy to mock.
 */
export {
  prisma,
  productRepo,
  cartRepo,
  orderRepo,
  reviewRepo,
  wishlistRepo,
  type ProductCardView,
  type ProductDetailView,
  type ProductFilters,
  type FacetView,
  type FindProductsResult,
  type CartView,
  type OrderListItem,
  type OrderDetail,
  type AddressSnapshot,
  type ReviewView,
  type WishlistItemView,
} from "@ecom/database";

export { formatINR, type Money } from "@ecom/shared/money";
