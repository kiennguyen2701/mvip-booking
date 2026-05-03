import { redirect } from 'next/navigation';
import CustomerDashboardClient from '@/components/customer-dashboard-client';
import { createClient } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
export default async function CustomerPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect('/login');
  }
  const { data: profileRow } = await supabase
    .from('profiles')
    .select('full_name, email, role, referred_by_ref_code')
    .eq('id', user.id)
    .maybeSingle();
  const role = profileRow?.role || user.user_metadata?.role;
  if (role && role !== 'customer') {
    redirect('/dashboard');
  }
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select(
      `
      id,
      name,
      slug,
      address,
      city,
      cuisine_type,
      category,
      description,
      short_description,
      cover_image,
      image_url,
      latitude,
      longitude,
      price_range,
      discount_percent,
      is_active
    `,
    )
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  return (
    <CustomerDashboardClient
      profile={{
        fullName:
          profileRow?.full_name ||
          user.user_metadata?.full_name ||
          user.email ||
          'Customer',
        email: profileRow?.email || user.email || '',
        refCode: profileRow?.referred_by_ref_code || '',
      }}
      restaurants={restaurants || []}
    />
  );
}