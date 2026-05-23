export const CACHE_TTL = {
  ADMIN_DASHBOARD: 30,
  SUPPLIER_DASHBOARD: 30,
  AGENT_DASHBOARD: 30,

  PUBLIC_RESTAURANTS: 300,
  PUBLIC_RESTAURANT_DETAIL: 600,
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

  publicRestaurantDetail: (slug: string) => `public:restaurant:${slug}`,
};