'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';

type DashboardRole = 'admin' | 'supplier' | 'agent' | 'customer';

function getDashboardPath(role?: string | null) {
  if (role === 'admin') return '/dashboard/admin';
  if (role === 'supplier') return '/dashboard/supplier';
  if (role === 'agent') return '/dashboard/agent';

  return '/dashboard/customer';
}

async function resolveUserRole(userId: string, fallbackRole?: string | null) {
  if (fallbackRole) return fallbackRole as DashboardRole;

  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.role) return profile.role as DashboardRole;

  const { data: userRow } = await adminClient
    .from('users')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (userRow?.role) return userRow.role as DashboardRole;

  const { data: supplier } = await adminClient
    .from('suppliers')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (supplier) return 'supplier';

  const { data: agent } = await adminClient
    .from('agents')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (agent) return 'agent';

  return 'customer';
}

export async function signInWithEmail(formData: FormData) {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  const role = data.user
    ? await resolveUserRole(data.user.id, data.user.user_metadata?.role)
    : 'customer';

  redirect(getDashboardPath(role));
}

export async function signUpWithEmail(formData: FormData) {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  const fullName = String(formData.get('full_name') || '').trim();
  const phone = String(formData.get('phone') || '').trim();
  const whatsapp = String(formData.get('whatsapp') || '').trim();

  const supabase = await createClient();
  const cookieStore = await cookies();
  const refCode = cookieStore.get('ref_code')?.value || null;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: 'customer',
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    let referredByAgentId: string | null = null;

    if (refCode) {
      const { data: agent } = await adminClient
        .from('agents')
        .select('id')
        .eq('ref_code', refCode)
        .maybeSingle();

      referredByAgentId = agent?.id ?? null;
    }

    await adminClient.from('profiles').upsert({
      id: data.user.id,
      email,
      full_name: fullName,
      phone: phone || null,
      whatsapp: whatsapp || null,
      role: 'customer',
      referred_by_ref_code: refCode,
      referred_by_agent_id: referredByAgentId,
    });
  }

  redirect('/dashboard/customer');
}

export async function signOut() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  redirect('/login');
}