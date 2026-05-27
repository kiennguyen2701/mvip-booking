export const CACHE_TTL = {
  ADMIN_DASHBOARD: 30,
  SUPPLIER_DASHBOARD: 30,
  AGENT_DASHBOARD: 30,

  // FIX #3: Tăng từ 300s (5 phút) → 3600s (1 giờ)
  // Data nhà hàng hiếm thay đổi, cache lâu hơn giúp giảm DB query đáng kể.
  // Invalidation thủ công được gọi khi supplier update/create restaurant.
  PUBLIC_RESTAURANTS: 3600,

  // FIX #3: Tăng từ 600s (10 phút) → 7200s (2 giờ)
  // Trang detail nhà hàng rất ít thay đổi trong ngày.
  PUBLIC_RESTAURANT_DETAIL: 7200,

  CUSTOMER_RESTAURANT_FEED: 120,
} as const;

export const cacheKeys = {
  adminDashboard: () => "admin:dashboard",

  supplierDashboard: (supplierId: string) =>
    `supplier:${supplierId}:dashboard`,

  supplierBookings: (supplierId: string) =>
    `supplier:${supplierId}:bookings`,

  supplierRestaurants: (supplierId: string) =>
    `supplier:${supplierId}:restaurants`,

  agentDashboard: (agentId: string) => `agent:${agentId}:dashboard`,

  agentBookings: (agentId: string) => `agent:${agentId}:bookings`,

  agentCustomers: (refCode: string) => `agent:${refCode}:customers`,

  publicRestaurants: (suffix = "all") => `public:restaurants:${suffix}`,

  customerRestaurantFeed: (suffix = "default") =>
    `customer:restaurant-feed:${suffix}`,

  publicRestaurantDetail: (slug: string) => `public:restaurant:${slug}`,
};

export const cachePatterns = {
  admin: () => "admin:*",

  supplierDashboard: (supplierId: string) =>
    `supplier:${supplierId}:dashboard`,

  supplierBookings: (supplierId: string) =>
    `supplier:${supplierId}:bookings`,

  supplierRestaurants: (supplierId: string) =>
    `supplier:${supplierId}:restaurants`,

  agentDashboard: (agentId: string) => `agent:${agentId}:dashboard`,

  agentAll: (agentId: string) => `agent:${agentId}:*`,

  publicRestaurants: () => "public:restaurants:*",

  customerRestaurantFeed: () => "customer:restaurant-feed:*",

  publicRestaurantDetail: (slug: string) => `public:restaurant:${slug}`,
};
