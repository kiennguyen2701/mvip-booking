'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

export default function CustomerRegisterForm({
  initialRefCode,
}: {
  initialRefCode?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    whatsapp: '',
    refCode: initialRefCode || '',
  });

  function updateField(name: keyof typeof form, value: string) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');

    startTransition(async () => {
      const response = await fetch('/api/customer-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Registration failed.');
        return;
      }

      setSuccess('Account created successfully. Please login.');
      router.replace(`/login?registered=1&email=${encodeURIComponent(form.email)}`);
      router.refresh();
    });
  }

  return (
    <section className="w-full overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.07] p-5 shadow-2xl shadow-black/40 backdrop-blur-xl md:p-7">
      <div className="mb-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-yellow-600 text-xl text-slate-950">
          ♛
        </div>

        <h1 className="mt-4 text-3xl font-black text-white">
          Create Customer Account
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          Register to book premium restaurants with Mvip benefits.
        </p>
      </div>

      {form.refCode && (
        <div className="mb-5 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">
            Referral Applied
          </p>
          <p className="mt-1 text-sm font-black text-white">{form.refCode}</p>
        </div>
      )}

      {error && (
        <div className="mb-5 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-200">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          value={form.fullName}
          onChange={(event) => updateField('fullName', event.target.value)}
          placeholder="Full name"
          className="w-full rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-amber-300/60 focus:ring-4 focus:ring-amber-300/10"
          required
        />

        <input
          value={form.email}
          onChange={(event) => updateField('email', event.target.value)}
          type="email"
          placeholder="Email"
          className="w-full rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-amber-300/60 focus:ring-4 focus:ring-amber-300/10"
          required
        />

        <input
          value={form.password}
          onChange={(event) => updateField('password', event.target.value)}
          type="password"
          placeholder="Password"
          className="w-full rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-amber-300/60 focus:ring-4 focus:ring-amber-300/10"
          required
          minLength={6}
        />

        <input
          value={form.phone}
          onChange={(event) => updateField('phone', event.target.value)}
          placeholder="Phone"
          className="w-full rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-amber-300/60 focus:ring-4 focus:ring-amber-300/10"
        />

        <input
          value={form.whatsapp}
          onChange={(event) => updateField('whatsapp', event.target.value)}
          placeholder="WhatsApp"
          className="w-full rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:border-amber-300/60 focus:ring-4 focus:ring-amber-300/10"
        />

        <input type="hidden" name="refCode" value={form.refCode} />

        <button
          disabled={pending}
          className="w-full rounded-2xl bg-amber-300 px-5 py-4 text-sm font-black text-slate-950 shadow-xl shadow-amber-900/20 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Creating account...' : 'Create Account'}
        </button>
      </form>
    </section>
  );
}