import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

async function updateAgent(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  const fullName = String(formData.get("full_name") || "");
  const email = String(formData.get("email") || "");
  const phone = String(formData.get("phone") || "");
  const status = String(formData.get("status") || "active");

  const { error } = await adminClient
    .from("agents")
    .update({
      full_name: fullName,
      email,
      phone,
      status,
      is_active: status === "active",
    })
    .eq("id", id);

  if (error) {
    console.error(error);
  }

  revalidatePath(`/dashboard/admin/agents/${id}`);
  revalidatePath("/dashboard/admin/agents");
}

async function resetPassword(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  const password = String(formData.get("password") || "");

  const { data: agent } = await adminClient
    .from("agents")
    .select("user_id")
    .eq("id", id)
    .maybeSingle();

  if (!agent?.user_id) return;

  await adminClient.auth.admin.updateUserById(agent.user_id, {
    password,
  });

  revalidatePath(`/dashboard/admin/agents/${id}`);
}

async function deleteAgent(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");

  await adminClient.from("agents").delete().eq("id", id);

  redirect("/dashboard/admin/agents");
}

export default async function AdminAgentDetailPage({
  params,
}: PageProps) {
  const resolvedParams = await params;

  // requireAdmin() checks both profiles + users table correctly
  await requireAdmin();

  const { data: agent } = await adminClient
    .from("agents")
    .select("*")
    .eq("id", resolvedParams.id)
    .maybeSingle();

  if (!agent) {
    notFound();
  }

  const refCode =
    agent.referral_code ||
    agent.ref_code ||
    agent.agent_code ||
    agent.code ||
    "";

  const registerLink = `${
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://mvipbooking.com"
  }/api/ref?code=${refCode}&redirect=/register`;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
    registerLink,
  )}`;

  const { data: customers } = await adminClient
    .from("users")
    .select("*")
    .eq("ref_code", refCode)
    .eq("role", "customer");

  return (
    <main className="min-h-screen bg-[#fbf7ef] px-4 py-6 md:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-amber-700">
              Admin Dashboard
            </p>

            <h1 className="mt-1 text-3xl font-black text-slate-950">
              Chi tiết Agent
            </h1>
          </div>

          <Link
            href="/dashboard/admin/agents"
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-slate-900 hover:text-slate-950"
          >
            Quay lại
          </Link>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <form action={updateAgent}>
              <input type="hidden" name="id" value={agent.id} />

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="text-sm font-bold text-slate-700">
                    Họ tên
                  </label>

                  <input
                    name="full_name"
                    defaultValue={agent.full_name || ""}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-950 outline-none focus:border-slate-950"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-slate-700">
                    Referral code
                  </label>

                  <input
                    disabled
                    value={refCode}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-amber-700 outline-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-slate-700">
                    Email
                  </label>

                  <input
                    name="email"
                    defaultValue={agent.email || ""}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-950 outline-none focus:border-slate-950"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-slate-700">
                    Phone
                  </label>

                  <input
                    name="phone"
                    defaultValue={agent.phone || ""}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-950 outline-none focus:border-slate-950"
                  />
                </div>
              </div>

              <div className="mt-5 flex items-end gap-4">
                <div className="flex-1">
                  <label className="text-sm font-bold text-slate-700">
                    Trạng thái
                  </label>

                  <select
                    name="status"
                    defaultValue={agent.status || "active"}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-slate-950"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="rounded-2xl bg-[#020617] px-6 py-3 text-sm font-bold text-white transition hover:opacity-90"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <img
                src={qrCodeUrl}
                alt="QR"
                className="mx-auto h-52 w-52 rounded-2xl border border-slate-200 bg-white p-2"
              />

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-black text-slate-950">
                  Link ref
                </p>

                <p className="mt-2 break-all text-sm text-slate-600">
                  {registerLink}
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-2xl font-black text-slate-950">
                Reset password
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Đặt mật khẩu mới riêng cho agent này.
              </p>

              <form action={resetPassword}>
                <input type="hidden" name="id" value={agent.id} />

                <input
                  name="password"
                  defaultValue="Agent@123456"
                  className="mt-5 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-950 outline-none focus:border-slate-950"
                />

                <button
                  type="submit"
                  className="mt-4 rounded-2xl bg-amber-400 px-6 py-3 text-sm font-black text-black transition hover:opacity-90"
                >
                  Reset password
                </button>
              </form>
            </div>

            <form action={deleteAgent}>
              <input type="hidden" name="id" value={agent.id} />

              <button
                type="submit"
                className="rounded-2xl border border-red-200 bg-red-50 px-6 py-3 text-sm font-black text-red-600 transition hover:bg-red-100"
              >
                Xóa agent
              </button>
            </form>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-3xl font-black text-slate-950">
            Customers qua ref
          </h2>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-3 py-3 text-left font-bold text-slate-600">
                    Tên
                  </th>

                  <th className="px-3 py-3 text-left font-bold text-slate-600">
                    Email
                  </th>

                  <th className="px-3 py-3 text-left font-bold text-slate-600">
                    Phone
                  </th>

                  <th className="px-3 py-3 text-left font-bold text-slate-600">
                    Ref
                  </th>
                </tr>
              </thead>

              <tbody>
                {(customers || []).map((customer: any) => (
                  <tr
                    key={customer.id}
                    className="border-b border-slate-100"
                  >
                    <td className="px-3 py-3 font-bold text-slate-900">
                      {customer.full_name || "-"}
                    </td>

                    <td className="px-3 py-3 text-slate-700">
                      {customer.email || "-"}
                    </td>

                    <td className="px-3 py-3 text-slate-700">
                      {customer.phone || "-"}
                    </td>

                    <td className="px-3 py-3 font-semibold text-amber-700">
                      {customer.ref_code || "-"}
                    </td>
                  </tr>
                ))}

                {!customers?.length && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-8 text-center text-slate-500"
                    >
                      Chưa có customer nào qua ref này
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}