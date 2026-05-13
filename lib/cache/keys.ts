export const CACHE_TTL = {
  restaurants: 60 * 5,
  restaurantDetail: 60 * 5,

  dashboard: 60,
  booking: 60,

  supplierDashboard: 60,
  supplierBookings: 60,

  customerDashboard: 60,
};

export const cacheKeys = {
  publicRestaurants: "public:restaurants",
};

export const cachePatterns = {
  admin: "admin:*",

  supplierDashboard: (supplierId: string) =>
    `supplier:${supplierId}:dashboard`,

  supplierBookings: (supplierId: string) =>
    `supplier:${supplierId}:bookings`,

  supplierRestaurants: (supplierId: string) =>
    `supplier:${supplierId}:restaurants`,

  publicRestaurants: () => "public:restaurants*",

  publicRestaurantDetail: (slug: string) =>
    `public:restaurant:${slug}`,
};