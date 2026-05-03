import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { adminClient } from '@/lib/supabase/admin';
import { createAgent } from './actions';

function getErrorText(error: string) {
  if (error === 'missing_name') return 'Thiếu họ tên agent.';
  if (error === 'missing_email') return 'Thiếu email agent.';
  if (error === 'missing_id') return 'Thiếu ID agent.';
  if (error === 'password_too_short') return 'Mật khẩu phải có ít nhất 6 ký tự.';
  if (error === 'email_already_exists_in_agents') return 'Email này đã tồn tại trong danh sách agent.';
  if (error === 'email_already_exists_in_profiles') return 'Email này đã tồn tại trong hồ sơ người dùng.';
  if (error === 'create_user_failed') return 'Không thể tạo tài khoản đăng nhập cho agent.';
  return `Lỗi: ${error}`;
}

export default async function AdminAgentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ success?: string; error?: string }>;
}) {
  await requireAdmin();

  const params = (await searchParams) || {};
  const success = params.success;
  const error = params.error;

  const { data: agents, error: agentsError } = await adminClient
    .from('agents')
    .select('id, full_name, email, phone, ref_code, is_active, created_at')
    .order('created_at', { ascending: false });

  if (agentsError) {
    throw new Error(agentsError.message);
  }

  const totalAgents = agents?.length || 0;
  const activeAgents = agents?.filter((agent) => agent.is_active).length || 0;
  const inactiveAgents = totalAgents - activeAgents;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-600">
            Platform Admin
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Quản lý Agents
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Quản lý cộng tác viên, mã giới thiệu, trạng thái hoạt động và tài khoản đăng nhập.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/admin/agents/stats"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Thống kê customer
          </Link>
          <Link
            href="/dashboard/admin"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Tổng quan
          </Link>
        </div>
      </div>

      {success === 'deleted' && (
        <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          Đã xóa agent thành công.
        </div>
      )}

      {error && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {getErrorText(error)}
        </div>
      )}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Tổng agents</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{totalAgents}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Đang active</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">{activeAgents}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Inactive</p>
          <p className="mt-2 text-3xl font-bold text-slate-500">{inactiveAgents}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Thêm agent mới</h2>
          <p className="mt-1 text-sm text-slate-500">
            Có thể đặt mật khẩu riêng ngay khi tạo tài khoản.
          </p>

          <form action={createAgent} className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Họ tên
              </label>
              <input
                name="full_name"
                placeholder="Ví dụ: Nguyễn Văn A"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Email đăng nhập
              </label>
              <input
                name="email"
                type="email"
                placeholder="agent@email.com"
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
                placeholder="098..."
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Mật khẩu
              </label>
              <input
                name="password"
                type="text"
                placeholder="Để trống sẽ dùng Agent@123456"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Trạng thái
              </label>
              <select
                name="is_active"
                defaultValue="true"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>

            <button className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800">
              Tạo agent
            </button>
          </form>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-lg font-bold text-slate-950">Danh sách agents</h2>
            <p className="mt-1 text-sm text-slate-500">
              Chỉ hiển thị thông tin cơ bản. Bấm chi tiết để chỉnh sửa, reset password hoặc xóa.
            </p>
          </div>

          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-bold">Agent</th>
                  <th className="px-5 py-3 font-bold">Ref code</th>
                  <th className="px-5 py-3 font-bold">Phone</th>
                  <th className="px-5 py-3 font-bold">Status</th>
                  <th className="px-5 py-3 text-right font-bold">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {(agents || []).map((agent) => (
                  <tr key={agent.id} className="transition hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-950">{agent.full_name || 'No name'}</p>
                      <p className="mt-1 text-sm text-slate-500">{agent.email || 'No email'}</p>
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-bold text-amber-700">
                        {agent.ref_code || '---'}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {agent.phone || '---'}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={
                          agent.is_active
                            ? 'rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700'
                            : 'rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500'
                        }
                      >
                        {agent.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/dashboard/admin/agents/${agent.id}`}
                        className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
                      >
                        Chi tiết
                      </Link>
                    </td>
                  </tr>
                ))}

                {(!agents || agents.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-500">
                      Chưa có agent nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-slate-100 lg:hidden">
            {(agents || []).map((agent) => (
              <div key={agent.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold text-slate-950">{agent.full_name || 'No name'}</p>
                    <p className="mt-1 text-sm text-slate-500">{agent.email || 'No email'}</p>
                  </div>

                  <span
                    className={
                      agent.is_active
                        ? 'rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700'
                        : 'rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500'
                    }
                  >
                    {agent.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-slate-500">Ref code</p>
                    <p className="mt-1 font-bold text-slate-950">{agent.ref_code || '---'}</p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-slate-500">Phone</p>
                    <p className="mt-1 font-bold text-slate-950">{agent.phone || '---'}</p>
                  </div>
                </div>

                <Link
                  href={`/dashboard/admin/agents/${agent.id}`}
                  className="mt-4 block rounded-2xl bg-slate-950 px-4 py-3 text-center text-sm font-bold text-white"
                >
                  Xem chi tiết
                </Link>
              </div>
            ))}

            {(!agents || agents.length === 0) && (
              <div className="p-8 text-center text-sm text-slate-500">Chưa có agent nào.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}