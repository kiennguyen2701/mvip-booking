import { createClient } from "@/lib/supabase/server";
import { getCurrentSupplier } from "@/lib/suppliers/get-current-supplier";

function formatMoney(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

type SettlementRow = {
  id: string;
  amount: number | null;
  period_from: string | null;
  period_to: string | null;
  status: string;
  note: string | null;
  paid_at: string | null;
  created_at: string;
};

export default async function SupplierSettlementsPage() {
  const { supplier } = await getCurrentSupplier();
  const supabase = await createClient();

  const { data: completedBookings } = await supabase
    .from("bookings")
    .select("platform_commission_amount")
    .eq("supplier_id", supplier.id)
    .eq("status", "completed");

  const totalPlatformReceivable = (completedBookings ?? []).reduce(
    (sum: number, row: { platform_commission_amount: number | null }) =>
      sum + Number(row.platform_commission_amount ?? 0),
    0,
  );

  const { data: settlements } = await supabase
    .from("supplier_settlements")
    .select("id,amount,period_from,period_to,status,note,paid_at,created_at")
    .eq("supplier_id", supplier.id)
    .order("created_at", { ascending: false });

  const typedSettlements = (settlements ?? []) as SettlementRow[];

  const paidAmount = typedSettlements
    .filter((item) => item.status === "paid")
    .reduce((sum, item) => sum + Number(item.amount ?? 0), 0);

  const pendingAmount = Math.max(totalPlatformReceivable - paidAmount, 0);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-500">Supplier / Settlements</p>
        <h1 className="mt-1 text-3xl font-semibold text-gray-900">
          Đối soát commission
        </h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Phải trả nền tảng</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {formatMoney(totalPlatformReceivable)}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Đã thanh toán</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {formatMoney(paidAmount)}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Còn chờ thanh toán</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {formatMoney(pendingAmount)}
          </p>
        </div>
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
            {typedSettlements.map((item) => (
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