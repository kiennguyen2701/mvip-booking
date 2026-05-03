import Link from "next/link";
import { changeSupplierPassword } from "../actions";
import { getCurrentSupplier } from "@/lib/suppliers/get-current-supplier";

function getErrorText(error: string) {
  if (error === "missing_fields") return "Vui lòng nhập đầy đủ thông tin.";
  if (error === "password_too_short")
    return "Mật khẩu mới phải có ít nhất 8 ký tự.";
  if (error === "password_not_match")
    return "Mật khẩu xác nhận không khớp.";
  if (error === "user_not_found") return "Không tìm thấy tài khoản đăng nhập.";
  if (error === "current_password_wrong")
    return "Mật khẩu hiện tại không đúng.";

  return `Lỗi: ${error}`;
}

export default async function SupplierChangePasswordPage({
  searchParams,
}: {
  searchParams?: Promise<{
    success?: string;
    error?: string;
  }>;
}) {
  await getCurrentSupplier();

  const params = (await searchParams) || {};
  const success = params.success;
  const error = params.error;

  return (
    <main className="min-h-screen bg-[#fbf7ef] px-4 py-10 md:px-6">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/dashboard/supplier"
          className="text-sm font-bold text-slate-500 transition hover:text-slate-950"
        >
          ← Quay lại Supplier Dashboard
        </Link>

        <section className="mt-5 rounded-3xl border border-white/80 bg-white p-6 shadow-sm md:p-8">
          <div className="mb-6">
            <p className="text-xs font-black uppercase tracking-wide text-amber-700">
              Supplier Account
            </p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">
              Đổi mật khẩu
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Nhập mật khẩu hiện tại và mật khẩu mới để cập nhật tài khoản đăng
              nhập Supplier.
            </p>
          </div>

          {success === "changed" && (
            <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
              Đổi mật khẩu thành công.
            </div>
          )}

          {error && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {getErrorText(error)}
            </div>
          )}

          <form action={changeSupplierPassword} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-700">
                Mật khẩu hiện tại
              </label>
              <input
                name="currentPassword"
                type="password"
                placeholder="Nhập mật khẩu hiện tại"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-700">
                Mật khẩu mới
              </label>
              <input
                name="newPassword"
                type="password"
                placeholder="Tối thiểu 8 ký tự"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-700">
                Xác nhận mật khẩu mới
              </label>
              <input
                name="confirmPassword"
                type="password"
                placeholder="Nhập lại mật khẩu mới"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                required
              />
            </div>

            <button className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-slate-800">
              Cập nhật mật khẩu
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}