'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { adminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';

type SupplierStatus = 'active' | 'inactive';

function normalizeSupplierStatus(value: FormDataEntryValue | null): SupplierStatus {
  const raw = String(value || 'active').trim().toLowerCase();
  return raw === 'active' ? 'active' : 'inactive';
}

function getValue(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim();
}

function revalidateSupplierPaths(supplierId?: string) {
  revalidatePath('/');
  revalidatePath('/restaurants');
  revalidatePath('/dashboard/admin');
  revalidatePath('/dashboard/admin/suppliers');
  revalidatePath('/dashboard/admin/supplier-requests');
  revalidatePath('/dashboard/supplier');
  revalidatePath('/dashboard/supplier/restaurants');

  if (supplierId) {
    revalidatePath(`/dashboard/admin/suppliers/${supplierId}`);
  }
}

async function findAuthUserByEmail(email: string) {
  const { data, error } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data.users.find(
    (user) => user.email?.toLowerCase() === email.toLowerCase(),
  );
}

async function upsertUserProfile(params: {
  userId: string;
  email: string;
  companyName: string;
  phone: string;
}) {
  const { userId, email, companyName, phone } = params;

  const { error } = await adminClient.from('users').upsert(
    {
      id: userId,
      email,
      full_name: companyName,
      phone,
      role: 'supplier',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );

  if (error) {
    throw new Error(error.message);
  }

  await adminClient.from('profiles').upsert(
    {
      id: userId,
      email,
      full_name: companyName,
      phone,
      role: 'supplier',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );
}

async function syncRestaurantsBySupplierStatus(params: {
  supplierId: string;
  status: SupplierStatus;
}) {
  const { supplierId, status } = params;

  if (status !== 'active') {
    const { error } = await adminClient
      .from('restaurants')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('supplier_id', supplierId);

    if (error) {
      throw new Error(error.message);
    }
  }
}

export async function createSupplierAction(formData: FormData) {
  await requireAdmin();

  const companyName = getValue(formData, 'company_name');
  const email = getValue(formData, 'email').toLowerCase();
  const password = getValue(formData, 'password');
  const phone = getValue(formData, 'phone');
  const address = getValue(formData, 'address');

  if (!companyName || !email || !password) {
    throw new Error('Missing required supplier information');
  }

  let userId: string;

  const existingAuthUser = await findAuthUserByEmail(email);

  if (existingAuthUser) {
    userId = existingAuthUser.id;

    const { error: updateAuthError } =
      await adminClient.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
        user_metadata: {
          role: 'supplier',
          company_name: companyName,
        },
        app_metadata: {
          role: 'supplier',
        },
      });

    if (updateAuthError) {
      throw new Error(updateAuthError.message);
    }
  } else {
    const { data: authUser, error: authError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          role: 'supplier',
          company_name: companyName,
        },
        app_metadata: {
          role: 'supplier',
        },
      });

    if (authError) {
      throw new Error(authError.message);
    }

    userId = authUser.user.id;
  }

  await upsertUserProfile({
    userId,
    email,
    companyName,
    phone,
  });

  const { data: existingSupplier } = await adminClient
    .from('suppliers')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existingSupplier?.id) {
    const { error } = await adminClient
      .from('suppliers')
      .update({
        user_id: userId,
        company_name: companyName,
        name: companyName,
        contact_name: companyName,
        email,
        login_email: email,
        phone,
        address,
        status: 'active',
        deleted_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingSupplier.id);

    if (error) {
      throw new Error(error.message);
    }
  } else {
    const { error } = await adminClient.from('suppliers').insert({
      user_id: userId,
      company_name: companyName,
      name: companyName,
      contact_name: companyName,
      email,
      login_email: email,
      phone,
      address,
      status: 'active',
      deleted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  revalidateSupplierPaths();
  redirect('/dashboard/admin/suppliers');
}

export async function updateSupplierAction(formData: FormData) {
  await requireAdmin();

  const id = getValue(formData, 'id') || getValue(formData, 'supplier_id');
  const companyName = getValue(formData, 'company_name') || getValue(formData, 'name');
  const email = getValue(formData, 'email').toLowerCase();
  const phone = getValue(formData, 'phone');
  const address = getValue(formData, 'address');
  const status = normalizeSupplierStatus(formData.get('status'));

  if (!id || !companyName || !email) {
    throw new Error('Missing required supplier information');
  }

  const { data: supplier, error: supplierError } = await adminClient
    .from('suppliers')
    .select('id, user_id')
    .eq('id', id)
    .single();

  if (supplierError) {
    throw new Error(supplierError.message);
  }

  if (supplier?.user_id) {
    await upsertUserProfile({
      userId: supplier.user_id,
      email,
      companyName,
      phone,
    });

    const { error: authError } = await adminClient.auth.admin.updateUserById(
      supplier.user_id,
      {
        email,
        email_confirm: true,
        user_metadata: {
          role: 'supplier',
          company_name: companyName,
        },
        app_metadata: {
          role: 'supplier',
        },
      },
    );

    if (authError) {
      throw new Error(authError.message);
    }
  }

  const { error } = await adminClient
    .from('suppliers')
    .update({
      company_name: companyName,
      name: companyName,
      contact_name: companyName,
      email,
      login_email: email,
      phone,
      address,
      status,
      deleted_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  await syncRestaurantsBySupplierStatus({
    supplierId: id,
    status,
  });

  revalidateSupplierPaths(id);
  redirect(`/dashboard/admin/suppliers/${id}`);
}

export async function activateSupplierAction(formData: FormData) {
  await requireAdmin();

  const id = getValue(formData, 'id');

  if (!id) {
    throw new Error('Missing supplier id');
  }

  const { error } = await adminClient
    .from('suppliers')
    .update({
      status: 'active',
      deleted_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  revalidateSupplierPaths(id);
  redirect('/dashboard/admin/suppliers');
}

export async function deactivateSupplierAction(formData: FormData) {
  await requireAdmin();

  const id = getValue(formData, 'id');

  if (!id) {
    throw new Error('Missing supplier id');
  }

  const { error } = await adminClient
    .from('suppliers')
    .update({
      status: 'inactive',
      deleted_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  await syncRestaurantsBySupplierStatus({
    supplierId: id,
    status: 'inactive',
  });

  revalidateSupplierPaths(id);
  redirect('/dashboard/admin/suppliers');
}