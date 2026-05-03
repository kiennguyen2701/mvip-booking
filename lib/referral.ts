import { cookies } from 'next/headers';

export async function getReferralCodeFromCookie() {
  const cookieStore = await cookies();
  return cookieStore.get('ref_code')?.value || null;
}