'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';

export async function signInWithEmail(formData: FormData) {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect('/dashboard');
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