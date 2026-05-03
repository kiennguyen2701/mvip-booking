import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { adminClient } from '@/lib/supabase/admin';
import { deleteAgent, resetAgentPassword, updateAgent } from '../actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  params: Promise<{ id: string }>;
};

type AgentRow = {
  id: string;
  user_id?: string | null;
  name?: string | null;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  is_active?: boolean | null;
  referral_code?: string | null;
  ref_code?: string | null;
  agent_code?: string | null;
  code?: string | null;
};

type BookingRow = {
  id: string;
  booking_code?: string | null;
  customer_name?: string | null;
  phone?: string | null;
  status?: string | null;
  total_bill?: number | null;
  agent_commission_amount?: number | null;
  created_at?: string | null;
};

function money(value?: number | null) {
  return Number(value || 0).toLocaleString('vi-VN');
}

function getBaseUrl() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    'http://localhost:3000';

  return raw.replace(/\/$/, '');
}

function getRefCode(agent: AgentRow) {
  return (
    agent.referral_code ||
    agent.ref_code ||
    agent.agent_code ||
    agent.code ||
    ''
  );
}

function getRefLink(refCode: string) {
  return `${getBaseUrl()}/api/ref?code=${encodeURIComponent(
    refCode,
  )}&redirect=/register`;
}

function getQrUrl(refCode: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
    getRefLink(refCode),
  )}`;
}

function StatCard({
  title,
  value,
  tone = 'slate',
}: {
  title: string;
  value: string | number;
  tone?: 'slate' | 'green' | 'amber';
}) {
  const color =
    tone === 'green'
      ? 'text-emerald-700'
      : tone === 'amber'
        ? 'text-amber-700'
        : 'text-slate-950';

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-bold text-slate-500">{title}</p>
      <p className={`mt-3 break-words text-3xl font-black ${color}`}>
        {value}
      </p>
    </div>
  );
}

export default async function AdminAgentDetailPage({ params }: PageProps) {
  await requireAdmin();

  const { id } = await params;

  const { data: agentData } = await adminClient
    .from('agents')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!agentData) notFound();

  const agent = agentData as AgentRow;
  const refCode = getRefCode(agent);
  const refLink = getRefLink(refCode);
  const qrUrl = getQrUrl(refCode);

  const { data: customers } = await adminClient
    .from('users')
    .select('id, full_name, email, phone, ref_code, created_at')
    .eq('role', 'customer')
    .eq('ref_code', refCode)
    .order('created_at', { ascending: false });

  const { data: bookingsData } = await adminClient
    .from('bookings')
    .select('*')
    .eq('agent_id', agent.id)
    .order('created_at', { ascending: false });

  const bookings = (bookingsData || []) as BookingRow[];

  const completedBookings = bookings.filter(
    (booking) => booking.status === 'completed',
  );

  const totalCommission = completedBookings.reduce(
    (sum, booking) => sum + Number(booking.agent_commission_amount || 0),
    0,
  );

  const pendingCommission = bookings
    .filter((booking) => booking.status !== 'completed')
    .reduce(
      (sum, booking) => sum + Number(booking.agent_commission_amount || 0),
      0,
    );

  return (
    <main className="min-h-screen bg-[#f8fafc] px-4 py-8 md:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <Link
              href="/dashboard/admin/agents"
              className="text-sm font-bold text-slate-500 transition hover:text-slate-950"
            >
              ← Back to Agent Management
            </Link>

            <p className="mt-6 text-xs font-black uppercase tracking-[0.25em] text-amber-700">
              Admin / Agent Detail
            </p>

            <h1 className="mt-2 text-3xl font-black text-slate-950 md:text-4xl">
              {agent.full_name || agent.name || 'Agent'}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Quản lý thông tin, link referral, QR, reset password và thống kê
              booking của Agent.
            </p>
          </div>

          <span
            className={`w-fit rounded-full px-5 py-2 text-sm font-black ${
              agent.is_active === false || agent.status === 'inactive'
                ? 'bg-red-50 text-red-700 ring-1 ring-red-200'
                : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
            }`}
          >
            {agent.is_active === false || agent.status === 'inactive'
              ? 'inactive'
              : 'active'}
          </span>
        </div>

        <section className="grid gap-4 md:grid-cols-4">
          <StatCard title="Customers" value={customers?.length || 0} />
          <StatCard title="Bookings" value={bookings.length} />
          <StatCard title="Completed Commission" value={`${money(totalCommission)} đ`} tone="green" />
          <StatCard title="Pending Commission" value={`${money(pendingCommission)} đ`} tone="amber" />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">
              Thông tin agent
            </h2>

            <form action={updateAgent} className="mt-6 grid gap-5 md:grid-cols-2">
              <input type="hidden" name="id" value={agent.id} />

              <div>
                <label className="text-sm font-bold text-slate-700">Họ tên</label>
                <input
                  name="name"
                  defaultValue={agent.full_name || agent.name || ''}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-950"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">Ref code</label>
                <input
                  name="ref_code"
                  defaultValue={refCode}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
                  readOnly
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">
                  Email đăng nhập
                </label>
                <input
                  name="email"
                  defaultValue={agent.email || ''}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-950"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">
                  Số điện thoại
                </label>
                <input
                  name="phone"
                  defaultValue={agent.phone || ''}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-950"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">
                  Trạng thái
                </label>
                <select
                  name="status"
                  defaultValue={
                    agent.is_active === false || agent.status === 'inactive'
                      ? 'inactive'
                      : 'active'
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-950"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex items-end">
                <button className="rounded-2xl bg-slate-950 px-6 py-3 text-sm font-black text-white transition hover:bg-slate-800">
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-black text-slate-950">Referral</h2>

              <div className="mt-5 rounded-3xl bg-slate-50 p-6">
                <img
                  src={qrUrl}
                  alt="Agent QR"
                  className="mx-auto h-56 w-56 rounded-2xl border bg-white p-2"
                />
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-black text-slate-950">Link ref</p>
                <p className="mt-2 break-all text-sm text-slate-500">{refLink}</p>
              </div>
            </div>

            <form
              action={resetAgentPassword}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <input type="hidden" name="id" value={agent.id} />
              <input type="hidden" name="email" value={agent.email || ''} />

              <h2 className="text-2xl font-black text-slate-950">
                Reset password
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Đặt mật khẩu mới riêng cho agent này.
              </p>

              <input
                name="password"
                type="text"
                defaultValue="Agent@123456"
                className="mt-5 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-950"
                required
                minLength={8}
              />

              <button className="mt-4 rounded-2xl bg-amber-300 px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-200">
                Reset password
              </button>
            </form>

            <form action={deleteAgent}>
              <input type="hidden" name="id" value={agent.id} />
              <button className="rounded-2xl border border-red-200 bg-red-50 px-6 py-3 text-sm font-black text-red-700 transition hover:bg-red-100">
                Xóa agent
              </button>
            </form>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">
            Customers qua ref
          </h2>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-3 py-3">Tên</th>
                  <th className="px-3 py-3">Email</th>
                  <th className="px-3 py-3">Phone</th>
                  <th className="px-3 py-3">Ref</th>
                </tr>
              </thead>
              <tbody>
                {(customers || []).map((customer: any) => (
                  <tr key={customer.id} className="border-b">
                    <td className="px-3 py-3 font-bold">
                      {customer.full_name || '-'}
                    </td>
                    <td className="px-3 py-3">{customer.email || '-'}</td>
                    <td className="px-3 py-3">{customer.phone || '-'}</td>
                    <td className="px-3 py-3">{customer.ref_code || '-'}</td>
                  </tr>
                ))}

                {!customers?.length && (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-slate-400">
                      Chưa có customer nào đăng ký qua ref này
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}