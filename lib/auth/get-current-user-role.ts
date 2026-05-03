import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type AppRole = 'admin' | 'supplier' | 'agent' | 'customer';

export type CurrentUserRole = {
  user: {
    id: string;
    email?: string | null;
  };
  profile: {
    id: string;
    role: AppRole;
    fullName: string;
    email: string;
    phone: string;
  };
};

export async function getCurrentUserRole(): Promise<CurrentUserRole> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect('/login');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, full_name, email, phone')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile) {
    redirect('/login');
  }

  return {
    user: {
      id: user.id,
      email: user.email,
    },
    profile: {
      id: profile.id,
      role: profile.role as AppRole,
      fullName: profile.full_name ?? '',
      email: profile.email ?? user.email ?? '',
      phone: profile.phone ?? '',
    },
  };
}

export async function requireAuth(): Promise<CurrentUserRole> {
  return getCurrentUserRole();
}

export async function requireRole(role: AppRole): Promise<CurrentUserRole> {
  const current = await getCurrentUserRole();

  if (current.profile.role !== role) {
    redirect('/dashboard');
  }

  return current;
}

export async function requireAdmin(): Promise<CurrentUserRole> {
  return requireRole('admin');
}

export async function requireSupplier(): Promise<CurrentUserRole> {
  return requireRole('supplier');
}

export async function requireAgent(): Promise<CurrentUserRole> {
  return requireRole('agent');
}

export async function requireCustomer(): Promise<CurrentUserRole> {
  return requireRole('customer');
}