import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-current-user-role";
import { SupplierStatCard } from "@/components/dashboard/supplier-stat-card";

function formatMoney(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function AgentCommissionsPage() {
  const { user } = await requireRole("agent");
  const supabase = await createClient();

  const { data: agent } = await supabase
    .from("agents")
    .select("id,full_name,ref_code")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!agent) {
    return <div>Không tìm thấy agent.</div>;
  }

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id,status,total_bill,agent_commission_amount")
    .eq("agent_id", agent.id);

  const rows = bookings ?? [];
  const completed = rows.filter((row) => row.status === "completed");
  const totalBookings = rows.length;
  const completedCount = completed.length;
  const totalBill = completed.reduce(
    (sum, row) => sum + Number(row.total_bill ?? 0),
    0,
  );
  const totalCommission = completed.reduce(
    (sum, row) => sum + Number(row.agent_commission_amount ?? 0),
    0,
  );

  const { data: payouts } = await supabase
    .from("agent_payouts")
    .select("amount,status")
    .eq("agent_id", agent.id);

  const paidAmount = (payouts ?? [])
    .filter((item) => item.status === "paid")
    .reduce((sum, item) => sum + Number(item.amount ?? 0), 0);

  const pendingPayout = Math.max(totalCommission - paidAmount, 0);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-500">Agent / Commissions</p>
        <h1 className="mt-1 text-3xl font-semibold text-gray-900">
          Hoa hồng của tôi
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {agent.full_name} · Ref code: {agent.ref_code}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SupplierStatCard label="Tổng booking" value={totalBookings} />
        <SupplierStatCard label="Completed bookings" value={completedCount} />
        <SupplierStatCard label="Completed bill" value={formatMoney(totalBill)} />
        <SupplierStatCard label="Tổng commission 5%" value={formatMoney(totalCommission)} />
        <SupplierStatCard label="Chưa thanh toán" value={formatMoney(pendingPayout)} />
      </div>
    </div>
  );
}