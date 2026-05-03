'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { adminClient } from '@/lib/supabase/admin';

function getStringValue(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim();
}

async function generateNextAgentRefCode(): Promise<string> {
  const { data, error } = await adminClient
    .from('agents')
    .select('ref_code')
    .like('ref_code', 'MVIP%')
    .order('ref_code', { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  const lastCode = data?.[0]?.ref_code || 'MVIP0000';
  const lastNumber = Number(lastCode.replace('MVIP', '')) || 0;
  const nextNumber = lastNumber + 1;

  return `MVIP${String(nextNumber).padStart(4, '0')}`;
}

export async function createAgent(formData: FormData): Promise<void> {
  await requireAdmin();

  const fullName = getStringValue(formData, 'full_name');
  const email = getStringValue(formData, 'email').toLowerCase();
  const phone = getStringValue(formData, 'phone') || null;
  const password = getStringValue(formData, 'password') || 'Agent@123456';
  const isActive = getStringValue(formData, 'is_active') !== 'false';

  if (!fullName) redirect('/dashboard/admin/agents?error=missing_name');
  if (!email) redirect('/dashboard/admin/agents?error=missing_email');
  if (password.length < 6) redirect('/dashboard/admin/agents?error=password_too_short');

  const existingAgent = await adminClient
    .from('agents')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existingAgent.error) {
    redirect(`/dashboard/admin/agents?error=${encodeURIComponent(existingAgent.error.message)}`);
  }

  if (existingAgent.data) {
    redirect('/dashboard/admin/agents?error=email_already_exists_in_agents');
  }

  const existingProfile = await adminClient
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existingProfile.error) {
    redirect(`/dashboard/admin/agents?error=${encodeURIComponent(existingProfile.error.message)}`);
  }

  if (existingProfile.data) {
    redirect('/dashboard/admin/agents?error=email_already_exists_in_profiles');
  }

  const refCode = await generateNextAgentRefCode();

  const { data: createdUser, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role: 'agent',
    },
  });

  if (authError) {
    redirect(`/dashboard/admin/agents?error=${encodeURIComponent(authError.message)}`);
  }

  const userId = createdUser.user?.id;

  if (!userId) {
    redirect('/dashboard/admin/agents?error=create_user_failed');
  }

  const { error: profileError } = await adminClient.from('profiles').upsert({
    id: userId,
    email,
    full_name: fullName,
    phone,
    role: 'agent',
  });

  if (profileError) {
    await adminClient.auth.admin.deleteUser(userId);
    redirect(`/dashboard/admin/agents?error=${encodeURIComponent(profileError.message)}`);
  }

  const { data: insertedAgent, error: agentError } = await adminClient
    .from('agents')
    .insert({
      user_id: userId,
      full_name: fullName,
      email,
      phone,
      ref_code: refCode,
      is_active: isActive,
    })
    .select('id')
    .single();

  if (agentError) {
    await adminClient.from('profiles').delete().eq('id', userId);
    await adminClient.auth.admin.deleteUser(userId);
    redirect(`/dashboard/admin/agents?error=${encodeURIComponent(agentError.message)}`);
  }

  revalidatePath('/dashboard/admin/agents');
  redirect(`/dashboard/admin/agents/${insertedAgent.id}?success=created`);
}

export async function updateAgent(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = getStringValue(formData, 'id');
  const fullName = getStringValue(formData, 'full_name');
  const email = getStringValue(formData, 'email').toLowerCase();
  const phone = getStringValue(formData, 'phone') || null;
  const isActive = getStringValue(formData, 'is_active') !== 'false';

  if (!id) redirect('/dashboard/admin/agents?error=missing_id');
  if (!fullName) redirect(`/dashboard/admin/agents/${id}?error=missing_name`);
  if (!email) redirect(`/dashboard/admin/agents/${id}?error=missing_email`);

  const { data: currentAgent, error: currentAgentError } = await adminClient
    .from('agents')
    .select('id, user_id, email')
    .eq('id', id)
    .single();

  if (currentAgentError || !currentAgent) {
    redirect(`/dashboard/admin/agents?error=${encodeURIComponent(currentAgentError?.message || 'Agent not found')}`);
  }

  if (email !== currentAgent.email) {
    const duplicateAgent = await adminClient
      .from('agents')
      .select('id')
      .eq('email', email)
      .neq('id', id)
      .maybeSingle();

    if (duplicateAgent.error) {
      redirect(`/dashboard/admin/agents/${id}?error=${encodeURIComponent(duplicateAgent.error.message)}`);
    }

    if (duplicateAgent.data) {
      redirect(`/dashboard/admin/agents/${id}?error=email_already_exists_in_agents`);
    }

    const duplicateProfile = await adminClient
      .from('profiles')
      .select('id')
      .eq('email', email)
      .neq('id', currentAgent.user_id || '')
      .maybeSingle();

    if (duplicateProfile.error) {
      redirect(`/dashboard/admin/agents/${id}?error=${encodeURIComponent(duplicateProfile.error.message)}`);
    }

    if (duplicateProfile.data) {
      redirect(`/dashboard/admin/agents/${id}?error=email_already_exists_in_profiles`);
    }

    if (currentAgent.user_id) {
      const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(currentAgent.user_id, {
        email,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          role: 'agent',
        },
      });

      if (authUpdateError) {
        redirect(`/dashboard/admin/agents/${id}?error=${encodeURIComponent(authUpdateError.message)}`);
      }
    }
  }

  const { error: agentError } = await adminClient
    .from('agents')
    .update({
      full_name: fullName,
      email,
      phone,
      is_active: isActive,
    })
    .eq('id', id);

  if (agentError) {
    redirect(`/dashboard/admin/agents/${id}?error=${encodeURIComponent(agentError.message)}`);
  }

  if (currentAgent.user_id) {
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({
        full_name: fullName,
        email,
        phone,
      })
      .eq('id', currentAgent.user_id);

    if (profileError) {
      redirect(`/dashboard/admin/agents/${id}?error=${encodeURIComponent(profileError.message)}`);
    }
  }

  revalidatePath('/dashboard/admin/agents');
  revalidatePath(`/dashboard/admin/agents/${id}`);
  redirect(`/dashboard/admin/agents/${id}?success=updated`);
}

export async function resetAgentPassword(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = getStringValue(formData, 'id');
  const password = getStringValue(formData, 'password');

  if (!id) redirect('/dashboard/admin/agents?error=missing_id');
  if (!password || password.length < 6) {
    redirect(`/dashboard/admin/agents/${id}?error=password_too_short`);
  }

  const { data: agent, error: agentError } = await adminClient
    .from('agents')
    .select('id, user_id')
    .eq('id', id)
    .single();

  if (agentError || !agent?.user_id) {
    redirect(`/dashboard/admin/agents/${id}?error=${encodeURIComponent(agentError?.message || 'Agent auth user not found')}`);
  }

  const { error: resetError } = await adminClient.auth.admin.updateUserById(agent.user_id, {
    password,
  });

  if (resetError) {
    redirect(`/dashboard/admin/agents/${id}?error=${encodeURIComponent(resetError.message)}`);
  }

  revalidatePath(`/dashboard/admin/agents/${id}`);
  redirect(`/dashboard/admin/agents/${id}?success=password_reset`);
}

export async function deleteAgent(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = getStringValue(formData, 'id');

  if (!id) redirect('/dashboard/admin/agents?error=missing_id');

  const { data: agent, error: agentError } = await adminClient
    .from('agents')
    .select('id, user_id')
    .eq('id', id)
    .single();

  if (agentError || !agent) {
    redirect(`/dashboard/admin/agents?error=${encodeURIComponent(agentError?.message || 'Agent not found')}`);
  }

  const { error: deleteAgentError } = await adminClient.from('agents').delete().eq('id', id);

  if (deleteAgentError) {
    redirect(`/dashboard/admin/agents/${id}?error=${encodeURIComponent(deleteAgentError.message)}`);
  }

  if (agent.user_id) {
    await adminClient.from('profiles').delete().eq('id', agent.user_id);
    await adminClient.auth.admin.deleteUser(agent.user_id);
  }

  revalidatePath('/dashboard/admin/agents');
  redirect('/dashboard/admin/agents?success=deleted');
}