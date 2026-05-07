import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { changeCustomerPassword, updateCustomerProfile } from './actions';

function getErrorText(error: string) {
  if (error === 'missing_name') return 'Please enter your full name.';
  if (error === 'missing_password_fields') return 'Please enter all password fields.';
  if (error === 'password_too_short') return 'New password must be at least 8 characters.';
  if (error === 'password_not_match') return 'Confirm password does not match.';
  if (error === 'current_password_wrong') return 'Current password is incorrect.';
  if (error === 'user_not_found') return 'User account not found.';
  return `Error: ${error}`;
}

export default async function CustomerProfilePage({
  searchParams,
}: {
  searchParams?: Promise<{ success?: string; error?: string }>;
}) {
  const params = (await searchParams) || {};
  const success = params.success;
  const error = params.error;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, full_name, email, phone, whatsapp, referred_by_ref_code')
    .eq('id', user.id)
    .maybeSingle();

  const role = profile?.role || user.user_metadata?.role;

  if (role !== 'customer') {
    redirect('/dashboard');
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050403] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-amber-500/15 blur-3xl" />
        <div className="absolute right-0 top-40 h-[420px] w-[420px] rounded-full bg-orange-900/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(251,191,36,0.12)_1px,transparent_0)] [background-size:28px_28px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-10 md:px-6">
        <Link
          href="/dashboard/customer"
          className="text-sm font-black text-slate-400 transition hover:text-amber-300"
        >
          ← Back to Customer Dashboard
        </Link>

        <section className="mt-6 overflow-hidden rounded-[2rem] border border-white/10 bg-[#11100c]/90 p-6 shadow-2xl shadow-black/40 backdrop-blur md:p-8">
          <p className="text-xs font-black uppercase tracking-[0.45em] text-amber-300">
            Customer Profile
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight text-white">
            My Profile
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Manage your customer information and update your login password.
          </p>

          {success === 'profile_updated' && (
            <div className="mt-6 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-200">
              Profile updated successfully.
            </div>
          )}

          {success === 'password_changed' && (
            <div className="mt-6 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-200">
              Password changed successfully.
            </div>
          )}

          {error && (
            <div className="mt-6 rounded-2xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm font-bold text-red-200">
              {getErrorText(error)}
            </div>
          )}

          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_420px]">
            <form
              action={updateCustomerProfile}
              className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5"
            >
              <h2 className="text-xl font-black text-white">Personal Information</h2>
              <p className="mt-1 text-sm text-slate-400">
                Your customer information used for bookings.
              </p>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-300">
                    Full name
                  </label>
                  <input
                    name="full_name"
                    defaultValue={profile?.full_name || user.user_metadata?.full_name || ''}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 text-sm font-semibold text-white outline-none transition focus:border-amber-300/60 focus:ring-4 focus:ring-amber-300/10"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-300">
                    Email
                  </label>
                  <input
                    value={profile?.email || user.email || ''}
                    readOnly
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-semibold text-slate-400"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-300">
                    Phone
                  </label>
                  <input
                    name="phone"
                    defaultValue={profile?.phone || ''}
                    placeholder="Phone number"
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 text-sm font-semibold text-white outline-none transition focus:border-amber-300/60 focus:ring-4 focus:ring-amber-300/10"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-300">
                    WhatsApp
                  </label>
                  <input
                    name="whatsapp"
                    defaultValue={profile?.whatsapp || ''}
                    placeholder="WhatsApp number"
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 text-sm font-semibold text-white outline-none transition focus:border-amber-300/60 focus:ring-4 focus:ring-amber-300/10"
                  />
                </div>
              </div>

              <button className="mt-6 rounded-2xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-200">
                Save Profile
              </button>
            </form>

            <aside className="space-y-6">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
                <h2 className="text-xl font-black text-white">Account Summary</h2>

                <div className="mt-5 space-y-3 text-sm">
                  <div className="rounded-2xl bg-black/30 p-4">
                    <p className="font-bold text-slate-500">Customer Email</p>
                    <p className="mt-1 break-all font-black text-white">
                      {profile?.email || user.email || '---'}
                    </p>
                  </div>

                 
                </div>
              </div>

              <form
                action={changeCustomerPassword}
                className="rounded-[1.5rem] border border-amber-300/20 bg-amber-300/[0.06] p-5"
              >
                <h2 className="text-xl font-black text-white">Change Password</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Enter your current password before setting a new one.
                </p>

                <div className="mt-5 space-y-4">
                  <input
                    name="current_password"
                    type="password"
                    placeholder="Current password"
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-slate-500 focus:border-amber-300/60 focus:ring-4 focus:ring-amber-300/10"
                    required
                  />

                  <input
                    name="new_password"
                    type="password"
                    placeholder="New password, minimum 8 characters"
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-slate-500 focus:border-amber-300/60 focus:ring-4 focus:ring-amber-300/10"
                    required
                  />

                  <input
                    name="confirm_password"
                    type="password"
                    placeholder="Confirm new password"
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-slate-500 focus:border-amber-300/60 focus:ring-4 focus:ring-amber-300/10"
                    required
                  />
                </div>

                <button className="mt-5 w-full rounded-2xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-200">
                  Update Password
                </button>
              </form>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}