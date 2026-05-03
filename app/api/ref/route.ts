import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function normalizeRefCode(value: string | null) {
  return String(value || '').trim().toUpperCase();
}

function isSafeRedirect(value: string | null) {
  return !!value && value.startsWith('/') && !value.startsWith('//');
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);

  const refCode = normalizeRefCode(
    url.searchParams.get('code') || url.searchParams.get('ref'),
  );

  const redirectParam = url.searchParams.get('redirect');
  const redirectPath = isSafeRedirect(redirectParam)
    ? redirectParam!
    : '/register';

  const targetUrl = new URL(redirectPath, url.origin);

  if (refCode) {
    targetUrl.searchParams.set('ref', refCode);
  }

  const response = NextResponse.redirect(targetUrl);

  if (!refCode) return response;

  const { data: agent } = await adminClient
    .from('agents')
    .select('id, ref_code, is_active')
    .eq('ref_code', refCode)
    .maybeSingle();

  if (!agent || agent.is_active === false) return response;

  const cookieOptions = {
    httpOnly: false,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  };

  response.cookies.set('mvip_ref_code', refCode, cookieOptions);
  response.cookies.set('ref_code', refCode, cookieOptions);
  response.cookies.set('mvip_agent_id', agent.id, cookieOptions);

  return response;
}