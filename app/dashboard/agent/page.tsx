import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AgentRow = {
  id: string;
  user_id?: string | null;
  name?: string | null;
  full_name?: string | null;
  email?: string | null;
  status?: string | null;
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
  return Number(value || 0).toLocaleString("vi-VN");
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
      <p className="mt-3 text-sm text-slate-400">{desc}</p>
    </div>
  );
}

export default async function AgentDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

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
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const registerLink = `${baseUrl}/login?ref=${encodeURIComponent(refCode)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
    registerLink
  )}`;

  const { data: customers } = await adminClient
    .from("users")
    .select("id, full_name, email, ref_code")
    .eq("role", "customer")
    .eq("ref_code", refCode);

  const { data: bookingsData } = await adminClient
    .from("bookings")
    .select("*")
    .eq("agent_id", agent.id)
    .order("created_at", { ascending: false });

  const bookings = (bookingsData || []) as BookingRow[];

  const totalBookings = bookings.length;
  const pendingBookings = bookings.filter(
    (booking) =>
      booking.status === "pending" || booking.status === "confirmed"
  ).length;

  const completedBookings = bookings.filter(
    (booking) => booking.status === "completed"
  );

  const totalCommission = completedBookings.reduce(
    (sum, booking) => sum + Number(booking.agent_commission_amount || 0),
    0
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fbf7ef] px-4 py-6 md:px-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-0 h-80 w-80 rounded-full bg-amber-200/25 blur-3xl" />
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-orange-100/60 blur-3xl" />
        <div className="absolute left-0 top-0 h-full w-full bg-[radial-gradient(circle_at_1px_1px,rgba(214,155,56,0.11)_1px,transparent_0)] [background-size:28px_28px]" />
      </div>

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
            Status: {agent.status || "active"}
          </span>
        </div>

        <section className="grid gap-4 md:grid-cols-5">
          <Card title="Referral Code" value={refCode} desc="Mã giới thiệu cá nhân" />
          <Card
            title="Customer"
            value={customers?.length || 0}
            desc="Khách đăng ký qua mã ref"
          />
          <Card title="Booking" value={totalBookings} desc="Booking phát sinh" />
          <Card title="Pending" value={pendingBookings} desc="Booking đang xử lý" />
          <Card
            title="Commission"
            value={`${money(totalCommission)}đ`}
            desc="Hoa hồng completed"
          />
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_300px]">
          <div className="rounded-3xl border border-white/80 bg-white/95 p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">
              Link giới thiệu Customer
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Gửi link này cho khách. Khi khách đăng ký, hệ thống tự gắn ref.
            </p>

            <div className="mt-5">
              <p className="mb-2 text-xs font-black uppercase text-slate-400">
                Mã ref
              </p>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 font-black text-amber-700">
                {refCode}
              </div>
            </div>

            <div className="mt-5">
              <p className="mb-2 text-xs font-black uppercase text-slate-400">
                Link đăng ký
              </p>
              <div className="break-all rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                {registerLink}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/80 bg-white/95 p-6 shadow-sm">
            <h3 className="text-center text-2xl font-black">QR Code</h3>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrCodeUrl}
              alt="Agent QR"
              className="mx-auto mt-5 h-52 w-52 rounded-2xl border bg-white p-2"
            />
          </div>
        </section>

        <section className="rounded-3xl border border-white/80 bg-white/95 p-6 shadow-sm">
          <h3 className="text-2xl font-black text-slate-950">
            Booking gần đây
          </h3>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b bg-slate-50">
                <tr className="text-left text-slate-500">
                  <th className="px-3 py-3">Mã</th>
                  <th className="px-3 py-3">Khách</th>
                  <th className="px-3 py-3">Phone</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Bill</th>
                  <th className="px-3 py-3">Hoa hồng</th>
                </tr>
              </thead>

              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking.id} className="border-b">
                    <td className="px-3 py-3 font-bold">
                      {booking.booking_code || booking.id.slice(0, 8)}
                    </td>
                    <td className="px-3 py-3">
                      {booking.customer_name || "-"}
                    </td>
                    <td className="px-3 py-3">{booking.phone || "-"}</td>
                    <td className="px-3 py-3">{booking.status || "pending"}</td>
                    <td className="px-3 py-3">{money(booking.total_bill)}đ</td>
                    <td className="px-3 py-3 font-bold text-emerald-700">
                      {money(booking.agent_commission_amount)}đ
                    </td>
                  </tr>
                ))}

                {!bookings.length && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-8 text-center text-slate-400"
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