import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const redirectTo = url.searchParams.get('redirect') || '/login';

  const response = NextResponse.redirect(new URL(redirectTo, request.url));

  if (code) {
    response.cookies.set('ref_code', code, {
      httpOnly: false,
      sameSite: 'lax',
      secure: false,
      path: '/',
      maxAge: 60 * 60 * 24 * 30
    });
  }

  return response;
}