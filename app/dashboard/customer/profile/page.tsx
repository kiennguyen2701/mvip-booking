// app/dashboard/customer/profile/page.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { changeCustomerPassword, updateCustomerProfile } from './actions';
import CustomerProfileClient from '@/components/customer-profile-client';

export default async function CustomerProfilePage({
  searchParams,
}: {
  searchParams?: Promise<{ success?: string; error?: string }>;
}) {
  const params = (await searchParams) || {};
  const success = params.success;
  const error = params.error;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, full_name, email, phone, whatsapp, referred_by_ref_code')
    .eq('id', user.id)
    .maybeSingle();

  const role = profile?.role || user.user_metadata?.role;
  if (role !== 'customer') redirect('/dashboard');

  return (
    <CustomerProfileClient
      profile={{
        fullName: profile?.full_name || user.user_metadata?.full_name || '',
        email: profile?.email || user.email || '',
        phone: profile?.phone || '',
        whatsapp: profile?.whatsapp || '',
      }}
      success={success}
      error={error}
      updateProfileAction={updateCustomerProfile}
      changePasswordAction={changeCustomerPassword}
    />
  );
}
