import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AdminSettlementsPage() {
  await requireAdmin();

  return (
    <main className="min-h-screen bg-[#fbf7ef] px-4 py-8 md:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <Link
            href="/dashboard/admin"
            className="text-sm font-bold text-slate-500 transition hover:text-slate-950"
          >
            ← Back to Admin Dashboard
          </Link>

          <p className="mt-6 text-xs font-black uppercase tracking-[0.25em] text-amber-700">
            Platform Admin
          </p>

          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Supplier Settlements
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Trang theo dõi settlement giữa Platform và Supplier.
          </p>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-3xl">
              🧾
            </div>

            <h2 className="mt-5 text-2xl font-black text-slate-950">
              Settlement tracking coming soon
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Sau khi bản Vercel chạy ổn, mình sẽ hoàn thiện module settlement
              gồm Supplier, completed bookings, total bill, platform commission,
              payable amount và lịch sử đối soát.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}