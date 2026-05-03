import { createClient } from "@/lib/supabase/server";
import { getCurrentSupplier } from "@/lib/suppliers/get-current-supplier";
import { SupplierStatCard } from "@/components/dashboard/supplier-stat-card";

function formatMoney(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function SupplierReportsPage() {
  const { supplier } = await getCurrentSupplier();
  const supabase = await createClient();

  const { data: bookings } = await supabase
    .from("bookings")
    .select(
      "id,status,total_bill,customer_discount_amount,platform_commission_amount,agent_commission_amount,platform_net_amount",
    )
    .eq("supplier_id", supplier.id);

  const rows = bookings ?? [];

  const totalBookings = rows.length;
  const completed = rows.filter((row) => row.status === "completed");
  const cancelled = rows.filter((row) => row.status === "cancelled");
  const pending = rows.filter((row) => row.status === "pending");
  const confirmed = rows.filter((row) => row.status === "confirmed");

  const totalBill = completed.reduce(
    (sum, row) => sum + Number(row.total_bill ?? 0),
    0,
  );
  const totalCustomerOff = completed.reduce(
    (sum, row) => sum + Number(row.customer_discount_amount ?? 0),
    0,
  );
  const totalPlatformReceivable = completed.reduce(
    (sum, row) => sum + Number(row.platform_commission_amount ?? 0),
    0,
  );
  const totalAgentPayout = completed.reduce(
    (sum, row) => sum + Number(row.agent_commission_amount ?? 0),
    0,
  );
  const totalPlatformNet = completed.reduce(
    (sum, row) => sum + Number(row.platform_net_amount ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-500">Supplier / Reports</p>
        <h1 className="mt-1 text-3xl font-semibold text-gray-900">
          Báo cáo supplier
        </h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SupplierStatCard label="Tổng booking" value={totalBookings} />
        <SupplierStatCard label="Pending" value={pending.length} />
        <SupplierStatCard label="Confirmed" value={confirmed.length} />
        <SupplierStatCard label="Cancelled" value={cancelled.length} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SupplierStatCard label="Completed bill" value={formatMoney(totalBill)} />
        <SupplierStatCard label="Customer off 5%" value={formatMoney(totalCustomerOff)} />
        <SupplierStatCard label="Platform nhận 10%" value={formatMoney(totalPlatformReceivable)} />
        <SupplierStatCard label="Agent payout 5%" value={formatMoney(totalAgentPayout)} />
        <SupplierStatCard label="Platform net 5%" value={formatMoney(totalPlatformNet)} />
      </div>
    </div>
  );
}