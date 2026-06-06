import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { getCache, setCache } from "@/lib/cache/cache";
import { CACHE_TTL, cacheKeys } from "@/lib/cache/keys";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AgentRow = {
  id: string;
  user_id?: string | null;
  name?: string | null;
  full_name?: string | null;
  email?: string | null;
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

type AgentDashboardCache = {
  customersCount: number;
  totalBookings: number;
  pendingBookings: number;
  totalCommission: number;
  recentBookings: BookingRow[];
};

function money(value?: number | null) {
  return Number(value || 0).toLocaleString("vi-VN");
}

function getBaseUrl() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000";

  return raw.replace(/\/$/, "");
}

function getRefCode(agent: AgentRow) {
  return (
    agent.referral_code ||
    agent.ref_code ||
    agent.agent_code ||
    agent.code ||
    ""
  );
}

function getRefLink(refCode: string) {
  return `${getBaseUrl()}/api/ref?code=${encodeURIComponent(
    refCode,
  )}&redirect=/register`;
}

async function getAgentDashboardData(agentId: string, refCode: string) {
  const cacheKey = cacheKeys.agentDashboard(agentId);
  const cached = await getCache<AgentDashboardCache>(cacheKey);

  if (cached) return cached;

  const [
    customersResult,
    totalBookingsResult,
    pendingBookingsResult,
    completedBookingsResult,
    recentBookingsResult,
  ] = await Promise.all([
    adminClient
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("role", "customer")
      .eq("ref_code", refCode),

    adminClient
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("agent_id", agentId),

    adminClient
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("agent_id", agentId)
      .in("status", ["pending", "confirmed"]),

    adminClient
      .from("bookings")
      .select("agent_commission_amount")
      .eq("agent_id", agentId)
      .eq("status", "completed"),

    adminClient
      .from("bookings")
      .select(
        "id, booking_code, customer_name, phone, status, total_bill, agent_commission_amount, created_at",
      )
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const completedBookings =
    (completedBookingsResult.data || []) as Pick<
      BookingRow,
      "agent_commission_amount"
    >[];

  const totalCommission = completedBookings.reduce(
    (sum, booking) => sum + Number(booking.agent_commission_amount || 0),
    0,
  );

  const data: AgentDashboardCache = {
    customersCount: customersResult.count || 0,
    totalBookings: totalBookingsResult.count || 0,
    pendingBookings: pendingBookingsResult.count || 0,
    totalCommission,
    recentBookings: (recentBookingsResult.data || []) as BookingRow[],
  };

  await setCache(cacheKey, data, CACHE_TTL.AGENT_DASHBOARD);

  return data;
}

function Card({
  title,
  value,
  desc,
}: {
  title: string;
  value: string | number;
  desc: string;
}) {
  return (
    <div className="rounded-3xl border border-white/80 bg-white/95 p-6 shadow-sm">
      <p className="text-sm font-bold text-slate-500">{title}</p>

      <p className="mt-3 break-words text-3xl font-black text-slate-950">
        {value}
      </p>

      <p className="mt-3 text-sm text-slate-500">{desc}</p>
    </div>
  );
}

export default async function AgentDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?_loop_guard=1");

  const { data: profile } = await adminClient
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role || user.user_metadata?.role;

  if (role !== "agent") redirect("/dashboard");

  const { data: agentByUserId } = await adminClient
    .from("agents")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  let agent = agentByUserId as AgentRow | null;

  if (!agent && user.email) {
    const { data: agentByEmail } = await adminClient
      .from("agents")
      .select("*")
      .eq("email", user.email.toLowerCase())
      .maybeSingle();

    agent = agentByEmail as AgentRow | null;
  }

  if (!agent) {
    return (
      <main className="min-h-screen bg-[#fbf7ef] px-4 py-6 md:px-6">
        <div className="mx-auto max-w-7xl rounded-3xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-black text-slate-950">
            Chưa tìm thấy hồ sơ Agent
          </h1>
        </div>
      </main>
    );
  }

  const refCode = getRefCode(agent);
  const registerLink = getRefLink(refCode);

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
    registerLink,
  )}`;

  const dashboardData = await getAgentDashboardData(agent.id, refCode);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fbf7ef] px-4 py-6 md:px-6">
      <div className="relative mx-auto max-w-7xl space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-amber-700">
              Agent Dashboard
            </p>

            <h1 className="mt-1 text-3xl font-black text-slate-950">
              {agent.full_name || agent.name || profile?.full_name || "Agent"}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Theo dõi khách giới thiệu, booking và hoa hồng realtime.
            </p>
          </div>

          <span className="rounded-full border border-amber-300 bg-amber-50 px-5 py-2 text-sm font-bold text-amber-700">
            Status:{" "}
            {agent.is_active === false ? "inactive" : agent.status || "active"}
          </span>
        </div>

        <section className="grid gap-4 md:grid-cols-5">
          <Card
            title="Referral Code"
            value={refCode}
            desc="Mã giới thiệu cá nhân"
          />

          <Card
            title="Customer"
            value={dashboardData.customersCount}
            desc="Khách đăng ký qua mã ref"
          />

          <Card
            title="Booking"
            value={dashboardData.totalBookings}
            desc="Booking phát sinh"
          />

          <Card
            title="Pending"
            value={dashboardData.pendingBookings}
            desc="Booking đang xử lý"
          />

          <Card
            title="Commission"
            value={`${money(dashboardData.totalCommission)}đ`}
            desc="Hoa hồng completed"
          />
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_300px]">
          <div className="rounded-3xl border border-white/80 bg-white/95 p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">
              Link giới thiệu Customer
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Link này trỏ thẳng đến trang đăng ký. Hệ thống tự lưu ref và gắn
              customer vào Agent.
            </p>

            <div className="mt-5">
              <p className="mb-2 text-xs font-black uppercase text-slate-500">
                Mã ref
              </p>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 font-black text-amber-700">
                {refCode}
              </div>
            </div>

            <div className="mt-5">
              <p className="mb-2 text-xs font-black uppercase text-slate-500">
                Link đăng ký
              </p>

              <div className="break-all rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                {registerLink}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/80 bg-white/95 p-6 shadow-sm">
            <h3 className="text-center text-2xl font-black text-slate-950">
              QR Code
            </h3>

            <img
              src={qrCodeUrl}
              alt="Agent QR"
              className="mx-auto mt-5 h-52 w-52 rounded-2xl border border-slate-200 bg-white p-2"
            />
          </div>
        </section>

        <section className="rounded-3xl border border-white/80 bg-white/95 p-6 shadow-sm">
          <h3 className="text-2xl font-black text-slate-950">
            Booking gần đây
          </h3>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-3 py-3 text-left font-bold text-slate-600">
                    Mã
                  </th>

                  <th className="px-3 py-3 text-left font-bold text-slate-600">
                    Khách
                  </th>

                  <th className="px-3 py-3 text-left font-bold text-slate-600">
                    Phone
                  </th>

                  <th className="px-3 py-3 text-left font-bold text-slate-600">
                    Status
                  </th>

                  <th className="px-3 py-3 text-left font-bold text-slate-600">
                    Bill
                  </th>

                  <th className="px-3 py-3 text-left font-bold text-slate-600">
                    Hoa hồng
                  </th>
                </tr>
              </thead>

              <tbody>
                {dashboardData.recentBookings.map((booking) => (
                  <tr key={booking.id} className="border-b border-slate-100">
                    <td className="px-3 py-3 font-bold text-slate-900">
                      {booking.booking_code || booking.id.slice(0, 8)}
                    </td>

                    <td className="px-3 py-3 font-medium text-slate-700">
                      {booking.customer_name || "-"}
                    </td>

                    <td className="px-3 py-3 font-medium text-slate-700">
                      {booking.phone || "-"}
                    </td>

                    <td className="px-3 py-3">
                      <span
                        className={
                          booking.status === "completed"
                            ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700"
                            : booking.status === "confirmed"
                              ? "rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700"
                              : booking.status === "cancelled"
                                ? "rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700"
                                : "rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700"
                        }
                      >
                        {booking.status || "pending"}
                      </span>
                    </td>

                    <td className="px-3 py-3 font-semibold text-slate-800">
                      {money(booking.total_bill)}đ
                    </td>

                    <td className="px-3 py-3 font-black text-emerald-700">
                      {money(booking.agent_commission_amount)}đ
                    </td>
                  </tr>
                ))}

                {!dashboardData.recentBookings.length && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-8 text-center text-slate-500"
                    >
                      Chưa có booking nào
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