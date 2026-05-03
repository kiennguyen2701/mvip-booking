import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-current-user-role";

function formatMoney(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function AgentPayoutsPage() {
  const { user } = await requireRole("agent");
  const supabase = await createClient();

  const { data: agent } = await supabase
    .from("agents")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!agent) {
    return <div>Không tìm thấy agent.</div>;
  }

  const { data: payouts } = await supabase
    .from("agent_payouts")
    .select("id,amount,period_from,period_to,status,note,paid_at,created_at")
    .eq("agent_id", agent.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-500">Agent / Payouts</p>
        <h1 className="mt-1 text-3xl font-semibold text-gray-900">Lịch sử chi trả</h1>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-gray-200 text-gray-500">
            <tr>
              <th className="px-4 py-3">Kỳ</th>
              <th className="px-4 py-3">Số tiền</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Paid at</th>
              <th className="px-4 py-3">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {(payouts ?? []).map((item) => (
              <tr key={item.id} className="border-b border-gray-100">
                <td className="px-4 py-3">
                  {item.period_from || "-"} → {item.period_to || "-"}
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {formatMoney(Number(item.amount ?? 0))}
                </td>
                <td className="px-4 py-3 capitalize">{item.status}</td>
                <td className="px-4 py-3">{item.paid_at || "-"}</td>
                <td className="px-4 py-3">{item.note || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}