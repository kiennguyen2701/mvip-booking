import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { adminClient } from '@/lib/supabase/admin';
import { deleteAgent, resetAgentPassword, updateAgent } from '../actions';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

function getRefLink(refCode: string) {
  return `${siteUrl}/api/ref?code=${refCode}&redirect=/login`;
}

function getQrUrl(refCode: string) {
  const refLink = getRefLink(refCode);
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(refLink)}`;
}

function getErrorText(error: string) {
  if (error === 'missing_name') return 'Thiếu họ tên agent.';
  if (error === 'missing_email') return 'Thiếu email agent.';
  if (error === 'missing_id') return 'Thiếu ID agent.';
  if (error === 'password_too_short') return 'Mật khẩu phải có ít nhất 6 ký tự.';
  if (error === 'email_already_exists_in_agents') return 'Email này đã tồn tại trong danh sách agent.';
  if (error === 'email_already_exists_in_profiles') return 'Email này đã tồn tại trong hồ sơ người dùng.';
  return `Lỗi: ${error}`;
}

export default async function AdminAgentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ success?: string; error?: string }>;
}) {
  await requireAdmin();

  const { id } = await params;
  const query = (await searchParams) || {};
  const success = query.success;
  const error = query.error;

  const { data: agent, error: agentError } = await adminClient
    .from('agents')
    .select('*')
    .eq('id', id)
    .single();

  if (agentError || !agent) {
    notFound();
  }

  const { count: totalBookings } = await adminClient
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('agent_id', agent.id);

  const { data: bookings } = await adminClient
    .from('bookings')
    .select('total_bill, agent_commission_amount, status')
    .eq('agent_id', agent.id);

  const totalRevenue = (bookings || []).reduce(
    (sum, item) => sum + Number(item.total_bill || 0),
    0,
  );

  const totalCommission = (bookings || []).reduce(
    (sum, item) => sum + Number(item.agent_commission_amount || 0),
    0,
  );

  const completedBookings = (bookings || []).filter(
    (item) => item.status === 'completed',
  ).length;

  const refLink = getRefLink(agent.ref_code || '');
  const qrUrl = getQrUrl(agent.ref_code || '');

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link
            href="/dashboard/admin/agents"
            className="text-sm font-semibold text-slate-500 transition hover:text-slate-950"
          >
            ← Quay lại danh sách agents
          </Link>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            {agent.full_name || 'Agent detail'}
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Quản lý hồ sơ, link giới thiệu, QR code, trạng thái và mật khẩu đăng nhập.
          </p>
        </div>

        <span
          className={
            agent.is_active
              ? 'w-fit rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700'
              : 'w-fit rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-500'
          }
        >
          {agent.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>

      {success === 'created' && (
        <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          Tạo agent thành công.
        </div>
      )}

      {success === 'updated' && (
        <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          Cập nhật agent thành công.
        </div>
      )}

      {success === 'password_reset' && (
        <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          Reset mật khẩu agent thành công.
        </div>
      )}

      {error && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {getErrorText(error)}
        </div>
      )}

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Tổng booking</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{totalBookings || 0}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Completed</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">{completedBookings}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total bill</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">
            {totalRevenue.toLocaleString()} đ
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Agent commission</p>
          <p className="mt-2 text-2xl font-bold text-amber-600">
            {totalCommission.toLocaleString()} đ
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">Thông tin agent</h2>

          <form action={updateAgent} className="mt-6 grid gap-5 md:grid-cols-2">
            <input type="hidden" name="id" value={agent.id} />

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Họ tên
              </label>
              <input
                name="full_name"
                defaultValue={agent.full_name || ''}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Ref code
              </label>
              <input
                value={agent.ref_code || ''}
                readOnly
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Email đăng nhập
              </label>
              <input
                name="email"
                type="email"
                defaultValue={agent.email || ''}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Số điện thoại
              </label>
              <input
                name="phone"
                defaultValue={agent.phone || ''}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Trạng thái
              </label>
              <select
                name="is_active"
                defaultValue={String(agent.is_active)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800">
                Lưu thay đổi
              </button>
            </div>
          </form>
        </section>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">Referral</h2>

            <div className="mt-5 flex justify-center rounded-3xl bg-slate-50 p-5">
              <img
                src={qrUrl}
                alt={`QR ${agent.ref_code}`}
                className="h-[220px] w-[220px] rounded-2xl bg-white object-cover p-2 shadow-sm"
              />
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 p-4">
              <p className="text-sm font-bold text-slate-950">Link ref</p>
              <p className="mt-2 break-all text-sm text-slate-500">{refLink}</p>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">Reset password</h2>
            <p className="mt-1 text-sm text-slate-500">
              Đặt mật khẩu mới riêng cho agent này.
            </p>

            <form action={resetAgentPassword} className="mt-5 space-y-4">
              <input type="hidden" name="id" value={agent.id} />

              <input
                name="password"
                type="text"
                placeholder="Mật khẩu mới, tối thiểu 6 ký tự"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                required
              />

              <button className="w-full rounded-2xl bg-amber-500 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-amber-600">
                Reset password
              </button>
            </form>
          </section>

          <section className="rounded-3xl border border-red-200 bg-red-50 p-6">
            <h2 className="text-xl font-bold text-red-700">Danger zone</h2>
            <p className="mt-1 text-sm text-red-600">
              Xóa agent sẽ xóa cả tài khoản đăng nhập và profile liên quan.
            </p>

            <form action={deleteAgent} className="mt-5">
              <input type="hidden" name="id" value={agent.id} />
              <button className="w-full rounded-2xl bg-red-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-700">
                Xóa agent
              </button>
            </form>
          </section>
        </aside>
      </div>
    </div>
  );
}