"use client";

// components/customer-profile-client.tsx
import Link from 'next/link';
import { useLang } from '@/lib/hooks/use-lang';

const COPY = {
  en: {
    backToDashboard: '← Back to Customer Dashboard',
    eyebrow: 'Customer Profile',
    title: 'My Profile',
    subtitle: 'Manage your customer information and update your login password.',
    profileUpdated: 'Profile updated successfully.',
    passwordChanged: 'Password changed successfully.',
    personalInfo: 'Personal Information',
    personalInfoDesc: 'Your customer information used for bookings.',
    fullName: 'Full name',
    email: 'Email',
    phone: 'Phone',
    whatsapp: 'WhatsApp',
    phonePlaceholder: 'Phone number',
    whatsappPlaceholder: 'WhatsApp number',
    saveProfile: 'Save Profile',
    accountSummary: 'Account Summary',
    customerEmail: 'Customer Email',
    changePassword: 'Change Password',
    changePasswordDesc: 'Enter your current password before setting a new one.',
    currentPassword: 'Current password',
    newPassword: 'New password, minimum 8 characters',
    confirmPassword: 'Confirm new password',
    updatePassword: 'Update Password',
    // errors
    missing_name: 'Please enter your full name.',
    missing_password_fields: 'Please enter all password fields.',
    password_too_short: 'New password must be at least 8 characters.',
    password_not_match: 'Confirm password does not match.',
    current_password_wrong: 'Current password is incorrect.',
    user_not_found: 'User account not found.',
  },
  zh: {
    backToDashboard: '← 返回顾客中心',
    eyebrow: '顾客资料',
    title: '我的资料',
    subtitle: '管理您的顾客信息并更新登录密码。',
    profileUpdated: '资料更新成功。',
    passwordChanged: '密码修改成功。',
    personalInfo: '个人信息',
    personalInfoDesc: '预订时使用的顾客信息。',
    fullName: '姓名',
    email: '邮箱',
    phone: '电话',
    whatsapp: 'WhatsApp',
    phonePlaceholder: '电话号码',
    whatsappPlaceholder: 'WhatsApp 号码',
    saveProfile: '保存资料',
    accountSummary: '账户摘要',
    customerEmail: '顾客邮箱',
    changePassword: '修改密码',
    changePasswordDesc: '请先输入当前密码，再设置新密码。',
    currentPassword: '当前密码',
    newPassword: '新密码（至少 8 位）',
    confirmPassword: '确认新密码',
    updatePassword: '更新密码',
    // errors
    missing_name: '请输入姓名。',
    missing_password_fields: '请填写所有密码字段。',
    password_too_short: '新密码至少需要 8 位字符。',
    password_not_match: '确认密码不匹配。',
    current_password_wrong: '当前密码不正确。',
    user_not_found: '未找到用户账户。',
  },
} as const;

type Profile = {
  fullName: string;
  email: string;
  phone: string;
  whatsapp: string;
};

type Props = {
  profile: Profile;
  success?: string;
  error?: string;
  updateProfileAction: (formData: FormData) => Promise<void>;
  changePasswordAction: (formData: FormData) => Promise<void>;
};

export default function CustomerProfileClient({
  profile,
  success,
  error,
  updateProfileAction,
  changePasswordAction,
}: Props) {
  const lang = useLang();
  const t = COPY[lang];

  const errorText = error ? (t[error as keyof typeof t] || `Error: ${error}`) : null;

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
          {t.backToDashboard}
        </Link>

        <section className="mt-6 overflow-hidden rounded-[2rem] border border-white/10 bg-[#11100c]/90 p-6 shadow-2xl shadow-black/40 backdrop-blur md:p-8">
          <p className="text-xs font-black uppercase tracking-[0.45em] text-amber-300">
            {t.eyebrow}
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight text-white">
            {t.title}
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            {t.subtitle}
          </p>

          {success === 'profile_updated' && (
            <div className="mt-6 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-200">
              {t.profileUpdated}
            </div>
          )}

          {success === 'password_changed' && (
            <div className="mt-6 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-200">
              {t.passwordChanged}
            </div>
          )}

          {errorText && (
            <div className="mt-6 rounded-2xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm font-bold text-red-200">
              {errorText}
            </div>
          )}

          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_420px]">
            <form
              action={updateProfileAction}
              className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5"
            >
              <h2 className="text-xl font-black text-white">{t.personalInfo}</h2>
              <p className="mt-1 text-sm text-slate-400">{t.personalInfoDesc}</p>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-300">
                    {t.fullName}
                  </label>
                  <input
                    name="full_name"
                    defaultValue={profile.fullName}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 text-sm font-semibold text-white outline-none transition focus:border-amber-300/60 focus:ring-4 focus:ring-amber-300/10"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-300">
                    {t.email}
                  </label>
                  <input
                    value={profile.email}
                    readOnly
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-semibold text-slate-400"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-300">
                    {t.phone}
                  </label>
                  <input
                    name="phone"
                    defaultValue={profile.phone}
                    placeholder={t.phonePlaceholder}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 text-sm font-semibold text-white outline-none transition focus:border-amber-300/60 focus:ring-4 focus:ring-amber-300/10"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-300">
                    {t.whatsapp}
                  </label>
                  <input
                    name="whatsapp"
                    defaultValue={profile.whatsapp}
                    placeholder={t.whatsappPlaceholder}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 text-sm font-semibold text-white outline-none transition focus:border-amber-300/60 focus:ring-4 focus:ring-amber-300/10"
                  />
                </div>
              </div>

              <button className="mt-6 rounded-2xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-200">
                {t.saveProfile}
              </button>
            </form>

            <aside className="space-y-6">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
                <h2 className="text-xl font-black text-white">{t.accountSummary}</h2>
                <div className="mt-5 space-y-3 text-sm">
                  <div className="rounded-2xl bg-black/30 p-4">
                    <p className="font-bold text-slate-500">{t.customerEmail}</p>
                    <p className="mt-1 break-all font-black text-white">
                      {profile.email || '---'}
                    </p>
                  </div>
                </div>
              </div>

              <form
                action={changePasswordAction}
                className="rounded-[1.5rem] border border-amber-300/20 bg-amber-300/[0.06] p-5"
              >
                <h2 className="text-xl font-black text-white">{t.changePassword}</h2>
                <p className="mt-1 text-sm text-slate-400">{t.changePasswordDesc}</p>

                <div className="mt-5 space-y-4">
                  <input
                    name="current_password"
                    type="password"
                    placeholder={t.currentPassword}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-slate-500 focus:border-amber-300/60 focus:ring-4 focus:ring-amber-300/10"
                    required
                  />
                  <input
                    name="new_password"
                    type="password"
                    placeholder={t.newPassword}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-slate-500 focus:border-amber-300/60 focus:ring-4 focus:ring-amber-300/10"
                    required
                  />
                  <input
                    name="confirm_password"
                    type="password"
                    placeholder={t.confirmPassword}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-slate-500 focus:border-amber-300/60 focus:ring-4 focus:ring-amber-300/10"
                    required
                  />
                </div>

                <button className="mt-5 w-full rounded-2xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-200">
                  {t.updatePassword}
                </button>
              </form>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
