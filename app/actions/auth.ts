'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';

type DashboardRole = 'admin' | 'supplier' | 'agent' | 'customer';

const LANG_COOKIE_OPTS = {
  httpOnly: false,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 24 * 30,
};

function getDashboardPath(role?: string | null) {
  if (role === 'admin') return '/dashboard/admin';
  if (role === 'supplier') return '/dashboard/supplier';
  if (role === 'agent') return '/dashboard/agent';
  return '/dashboard/customer';
}

function isDashboardRole(value?: string | null): value is DashboardRole {
  return (
    value === 'admin' ||
    value === 'supplier' ||
    value === 'agent' ||
    value === 'customer'
  );
}

async function resolveUserRole(userId: string, fallbackRole?: string | null) {
  if (
    fallbackRole === 'admin' ||
    fallbackRole === 'supplier' ||
    fallbackRole === 'agent'
  ) {
    return fallbackRole;
  }

  const [profileResult, userResult] = await Promise.all([
    adminClient.from('profiles').select('role').eq('id', userId).maybeSingle(),
    adminClient.from('users').select('role').eq('id', userId).maybeSingle(),
  ]);

  if (isDashboardRole(profileResult.data?.role)) return profileResult.data.role;
  if (isDashboardRole(userResult.data?.role)) return userResult.data.role;

  if (fallbackRole === 'customer') return 'customer';

  const [supplierResult, agentResult] = await Promise.all([
    adminClient.from('suppliers').select('id').eq('user_id', userId).maybeSingle(),
    adminClient.from('agents').select('id').eq('user_id', userId).maybeSingle(),
  ]);

  if (supplierResult.data) return 'supplier';
  if (agentResult.data) return 'agent';

  return 'customer';
}

async function setLangCookie(preferredLanguage?: string | null) {
  if (preferredLanguage !== 'zh' && preferredLanguage !== 'en') return;
  const cookieStore = await cookies();
  cookieStore.set('mvip_lang', preferredLanguage, LANG_COOKIE_OPTS);
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
    return { error: error.message, redirectTo: null };
  }

  const role = data.user
    ? await resolveUserRole(data.user.id, data.user.user_metadata?.role)
    : 'customer';

  // Fallback 'en' nếu preferred_language chưa set — tránh cookie cũ từ session trước
  await setLangCookie(data.user?.user_metadata?.preferred_language ?? 'en');

  return {
    error: null,
    redirectTo: getDashboardPath(role),
  };
}

export async function signUpWithEmail(formData: FormData) {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  const fullName = String(formData.get('full_name') || '').trim();
  const phone = String(formData.get('phone') || '').trim();
  const whatsapp = String(formData.get('whatsapp') || '').trim();
  const preferredLanguage =
    String(formData.get('preferred_language') || 'en') === 'zh' ? 'zh' : 'en';

  const supabase = await createClient();
  const cookieStore = await cookies();

  // FIX: Đọc ref_code từ cả formData (hidden input trong form đăng ký)
  // lẫn cookie — ưu tiên formData vì chắc chắn hơn cookie
  const refCodeFromForm = String(formData.get('ref_code') || '').trim().toUpperCase() || null;
  const refCodeFromCookie =
    cookieStore.get('mvip_ref_code')?.value ||
    cookieStore.get('ref_code')?.value ||
    null;
  const refCode = refCodeFromForm || refCodeFromCookie || null;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: 'customer',
        preferred_language: preferredLanguage,
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
      preferred_language: preferredLanguage,
      referred_by_ref_code: refCode,
      referred_by_agent_id: referredByAgentId,
    });

    await setLangCookie(preferredLanguage);
  }

  redirect('/dashboard/customer');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const cookieStore = await cookies();
  cookieStore.delete('mvip_lang');

  redirect('/login');
}