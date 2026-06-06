import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

type Role = 'admin' | 'supplier' | 'agent' | 'customer';

function isRole(value: unknown): value is Role {
  return (
    value === 'admin' ||
    value === 'supplier' ||
    value === 'agent' ||
    value === 'customer'
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login?_loop_guard=1');
  }

  let role: string | null = null;

  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role) {
    role = profile.role;
  }

  if (!role) {
    const { data: userRow } = await adminClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (userRow?.role) {
      role = userRow.role;
    }
  }

  if (!role && typeof user.user_metadata?.role === 'string') {
    role = user.user_metadata.role;
  }

  if (!role) {
    const { data: supplier } = await adminClient
      .from('suppliers')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (supplier) {
      role = 'supplier';
    }
  }

  if (!role) {
    const { data: agent } = await adminClient
      .from('agents')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (agent) {
      role = 'agent';
    }
  }

  // If role still unknown after all lookups → treat as customer (safe default)
  // Do NOT redirect to /login — that creates a loop when the proxy
  // sees a valid session and immediately bounces back to /dashboard/customer
  if (role === 'admin') redirect('/dashboard/admin');
  if (role === 'supplier') redirect('/dashboard/supplier');
  if (role === 'agent') redirect('/dashboard/agent');

  redirect('/dashboard/customer');
}