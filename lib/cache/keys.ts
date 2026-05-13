export const CACHE_TTL = {
  SUPPLIER_DASHBOARD: 30,
  PUBLIC_RESTAURANTS: 300,
  PUBLIC_RESTAURANT_DETAIL: 600,
} as const;

export const cacheKeys = {
  adminDashboard: "admin:dashboard",

  adminBookings: "admin:bookings",
  adminRestaurants: "admin:restaurants",
  adminSuppliers: "admin:suppliers",
  adminAgents: "admin:agents",

  supplierDashboard: (supplierId: string) =>
    `supplier:${supplierId}:dashboard`,

  supplierBookings: (supplierId: string) =>
    `supplier:${supplierId}:bookings`,

  supplierRestaurants: (supplierId: string) =>
    `supplier:${supplierId}:restaurants`,

  publicRestaurants: "public:restaurants",

  publicRestaurantDetail: (slug: string) =>
    `public:restaurant:${slug}`,
};

export const cachePatterns = {
  admin: "admin:*",

  supplierDashboard: (supplierId: string) =>
    `supplier:${supplierId}:dashboard`,

  supplierBookings: (supplierId: string) =>
    `supplier:${supplierId}:bookings`,

  supplierRestaurants: (supplierId: string) =>
    `supplier:${supplierId}:restaurants`,

  publicRestaurants: "public:restaurants*",

  publicRestaurantDetail: (slug: string) =>
    `public:restaurant:${slug}`,
};