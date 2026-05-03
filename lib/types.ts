export type Role = 'admin' | 'supplier' | 'agent' | 'customer';

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  city: string | null;
  address: string | null;
  price_from: number | null;
  cover_image: string | null;
  is_active: boolean;
}