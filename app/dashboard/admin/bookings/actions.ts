'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { adminClient } from '@/lib/supabase/admin';

async function ensureAdmin() {
  const current = await requireAuth();

  if (current.profile?.role !== 'admin') {
    throw new Error('Unauthorized');
  }

  return current;
}

export async function updateBookingStatus(formData: FormData): Promise<void> {
  await ensureAdmin();

  const id = String(formData.get('id') || '').trim();
  const status = String(formData.get('status') || '').trim();

  if (!id) {
    redirect('/dashboard/admin/bookings?error=missing_id');
  }

  if (!['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
    redirect('/dashboard/admin/bookings?error=invalid_status');
  }

  const { error } = await adminClient
    .from('bookings')
    .update({ status })
    .eq('id', id);

  if (error) {
    redirect(`/dashboard/admin/bookings?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/dashboard/admin/bookings');
  revalidatePath('/dashboard/admin');
  revalidatePath('/dashboard/customer');
  revalidatePath('/dashboard/supplier');
  revalidatePath('/dashboard/agent');

  redirect('/dashboard/admin/bookings?success=updated');
}

export async function deleteBooking(formData: FormData): Promise<void> {
  await ensureAdmin();

  const id = String(formData.get('id') || '').trim();

  if (!id) {
    redirect('/dashboard/admin/bookings?error=missing_id');
  }

  const { error } = await adminClient
    .from('bookings')
    .delete()
    .eq('id', id);

  if (error) {
    redirect(`/dashboard/admin/bookings?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/dashboard/admin/bookings');
  revalidatePath('/dashboard/admin');
  revalidatePath('/dashboard/customer');
  revalidatePath('/dashboard/supplier');
  revalidatePath('/dashboard/agent');

  redirect('/dashboard/admin/bookings?success=deleted');
}