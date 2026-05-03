'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';

function value(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim();
}

async function requireCustomer() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, email')
    .eq('id', user.id)
    .maybeSingle();

  const role = profile?.role || user.user_metadata?.role;

  if (role !== 'customer') {
    redirect('/dashboard');
  }

  return { user, profile };
}

export async function updateCustomerProfile(formData: FormData) {
  const { user } = await requireCustomer();

  const fullName = value(formData, 'full_name');
  const phone = value(formData, 'phone') || null;
  const whatsapp = value(formData, 'whatsapp') || null;

  if (!fullName) {
    redirect('/dashboard/customer/profile?error=missing_name');
  }

  const { error } = await adminClient
    .from('profiles')
    .update({
      full_name: fullName,
      phone,
      whatsapp,
    })
    .eq('id', user.id);

  if (error) {
    redirect(`/dashboard/customer/profile?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/dashboard/customer/profile');
  redirect('/dashboard/customer/profile?success=profile_updated');
}

export async function changeCustomerPassword(formData: FormData) {
  await requireCustomer();

  const supabase = await createClient();

  const currentPassword = value(formData, 'current_password');
  const newPassword = value(formData, 'new_password');
  const confirmPassword = value(formData, 'confirm_password');

  if (!currentPassword || !newPassword || !confirmPassword) {
    redirect('/dashboard/customer/profile?error=missing_password_fields');
  }

  if (newPassword.length < 8) {
    redirect('/dashboard/customer/profile?error=password_too_short');
  }

  if (newPassword !== confirmPassword) {
    redirect('/dashboard/customer/profile?error=password_not_match');
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect('/dashboard/customer/profile?error=user_not_found');
  }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (verifyError) {
    redirect('/dashboard/customer/profile?error=current_password_wrong');
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    redirect(`/dashboard/customer/profile?error=${encodeURIComponent(updateError.message)}`);
  }

  revalidatePath('/dashboard/customer/profile');
  redirect('/dashboard/customer/profile?success=password_changed');
}