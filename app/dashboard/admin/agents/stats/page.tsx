import Link from 'next/link';
import { getCurrentUserRole } from '@/lib/auth/get-current-user-role';
import { adminClient } from '@/lib/supabase/admin';

export default async function AdminAgentStatsPage() {
  const current = await getCurrentUserRole();

  if (current.profile.role !== 'admin') {
    return <div className="p-6">No access</div>;
  }

  // Tổng số agent
  const { count: totalAgents } = await adminClient
    .from('agents')
    .select('*', { count: 'exact', head: true });

  // Tổng booking theo agent
  const { data: bookingData } = await adminClient
    .from('bookings')
    .select('agent_id, total_bill, agent_commission_amount');

  // Gom stats
  const statsMap: Record<
    string,
    {
      totalBookings: number;
      totalRevenue: number;
      totalCommission: number;
    }
  > = {};

  for (const b of bookingData || []) {
    if (!b.agent_id) continue;

    if (!statsMap[b.agent_id]) {
      statsMap[b.agent_id] = {
        totalBookings: 0,
        totalRevenue: 0,
        totalCommission: 0,
      };
    }

    statsMap[b.agent_id].totalBookings += 1;
    statsMap[b.agent_id].totalRevenue += Number(b.total_bill || 0);
    statsMap[b.agent_id].totalCommission += Number(b.agent_commission_amount || 0);
  }

  // Lấy danh sách agent
  const { data: agents } = await adminClient
    .from('agents')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Agent Statistics</h1>

        <Link href="/dashboard/admin/agents" className="rounded-xl border px-4 py-2">
          ← Quay lại Agents
        </Link>
      </div>

      <div className="mb-6 rounded-xl bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-500">Tổng số agent</p>
        <p className="text-2xl font-semibold">{totalAgents || 0}</p>
      </div>

      <div className="space-y-4">
        {(agents || []).map((agent) => {
          const stat = statsMap[agent.id] || {
            totalBookings: 0,
            totalRevenue: 0,
            totalCommission: 0,
          };

          return (
            <div key={agent.id} className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <p className="text-sm text-slate-500">Tên</p>
                  <p className="font-semibold">{agent.full_name}</p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Ref Code</p>
                  <p className="font-semibold">{agent.ref_code}</p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Booking</p>
                  <p className="font-semibold">{stat.totalBookings}</p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Revenue</p>
                  <p className="font-semibold">
                    {stat.totalRevenue.toLocaleString()} đ
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Commission</p>
                  <p className="font-semibold text-green-600">
                    {stat.totalCommission.toLocaleString()} đ
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}