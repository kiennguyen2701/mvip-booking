export const CACHE_TTL = {
  SUPPLIER_DASHBOARD: 30,
  PUBLIC_RESTAURANTS: 300,
  PUBLIC_RESTAURANT_DETAIL: 600,
} as const;

export const cacheKeys = {
  supplierDashboard: (supplierId: string) =>
    `supplier-dashboard:${supplierId}`,

  publicRestaurants: (params: {
    query?: string;
    city?: string;
    tag?: string;
    priceRange?: string;
    limit?: number;
  }) =>
    `public-restaurants:${JSON.stringify({
      q: params.query || "",
      c: params.city || "",
      t: params.tag || "",
      p: params.priceRange || "",
      l: params.limit || 60,
    })}`,

  publicRestaurantDetail: (slug: string) => `public-restaurant-detail:${slug}`,
};