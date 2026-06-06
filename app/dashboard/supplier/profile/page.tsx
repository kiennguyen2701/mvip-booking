import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SupplierProfileForm from "./supplier-profile-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SupplierRow = {
  id: string;
  user_id: string;
  company_name: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  updated_at: string | null;
};

export default async function SupplierProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?_loop_guard=1");
  }

  const { data: supplier, error } = await supabase
    .from("suppliers")
    .select(
      `
        id,
        user_id,
        company_name,
        contact_name,
        phone,
        email,
        updated_at
      `,
    )
    .eq("user_id", user.id)
    .single<SupplierRow>();

  if (error || !supplier) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#050403] px-4 py-5 text-white md:px-6">
        <div className="mx-auto max-w-4xl rounded-[28px] border border-red-400/20 bg-red-500/10 p-5 text-sm font-semibold text-red-200">
          Không tìm thấy hồ sơ supplier của tài khoản này.
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050403] px-4 py-5 text-white md:px-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-0 h-[420px] w-[420px] rounded-full bg-amber-400/20 blur-3xl" />
        <div className="absolute right-0 top-16 h-[520px] w-[520px] rounded-full bg-orange-700/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-[360px] w-[360px] rounded-full bg-yellow-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(251,191,36,0.12)_1px,transparent_0)] [background-size:30px_30px]" />
      </div>

      <div className="relative mx-auto max-w-5xl space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[#11100c]/95 p-5 shadow-2xl shadow-black/40 backdrop-blur md:p-7">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-300">
                Supplier Profile
              </p>

              <h1 className="mt-3 text-3xl font-black tracking-tight text-white md:text-5xl">
                My Profile
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                Cập nhật thông tin cơ bản của nhà hàng. Email đang khóa và chỉ
                dùng để hiển thị.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm">
              <div className="font-black text-white">Cập nhật gần nhất</div>
              <div className="mt-1 text-slate-400">
                {supplier.updated_at
                  ? new Date(supplier.updated_at).toLocaleString("vi-VN")
                  : "Chưa có dữ liệu"}
              </div>
            </div>
          </div>
        </section>

        <SupplierProfileForm
          initialData={{
            company_name: supplier.company_name ?? "",
            contact_name: supplier.contact_name ?? "",
            phone: supplier.phone ?? "",
            email: supplier.email ?? "",
          }}
        />
      </div>
    </main>
  );
}