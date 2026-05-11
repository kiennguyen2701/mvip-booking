"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  updateSupplierProfile,
  type SupplierProfileFormState,
} from "./actions";

type SupplierProfileFormProps = {
  initialData: {
    company_name: string;
    contact_name: string;
    phone: string;
    email: string;
  };
};

const initialState: SupplierProfileFormState = {
  success: false,
  message: "",
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-12 items-center justify-center rounded-2xl bg-amber-300 px-6 text-sm font-black text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Đang lưu..." : "Lưu thay đổi"}
    </button>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  error,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  error?: string;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={name} className="block text-sm font-bold text-white">
        {label}
      </label>

      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="h-14 w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-amber-300"
      />

      {error ? <p className="text-xs font-semibold text-red-300">{error}</p> : null}
    </div>
  );
}

export default function SupplierProfileForm({
  initialData,
}: SupplierProfileFormProps) {
  const [state, formAction] = useActionState(
    updateSupplierProfile,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="overflow-hidden rounded-[32px] border border-white/10 bg-[#11100c]/95 shadow-2xl shadow-black/40 backdrop-blur"
    >
      <div className="border-b border-white/10 px-5 py-5 md:px-6">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">
          Basic Information
        </p>

        <h2 className="mt-2 text-2xl font-black text-white">
          Thông tin cơ bản
        </h2>
      </div>

      <div className="space-y-6 p-5 md:p-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field
            label="Tên nhà hàng / công ty"
            name="company_name"
            defaultValue={initialData.company_name}
            placeholder="Tên nhà hàng"
            error={state.errors?.company_name}
          />

          <Field
            label="Người liên hệ"
            name="contact_name"
            defaultValue={initialData.contact_name}
            placeholder="Người liên hệ"
            error={state.errors?.contact_name}
          />

          <Field
            label="Số điện thoại"
            name="phone"
            defaultValue={initialData.phone}
            placeholder="Số điện thoại"
            error={state.errors?.phone}
          />

          <div className="space-y-2">
            <label className="block text-sm font-bold text-white">Email</label>

            <input
              type="email"
              value={initialData.email}
              disabled
              className="h-14 w-full cursor-not-allowed rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm text-slate-400 outline-none"
            />

            <p className="text-xs font-semibold text-slate-500">
              Email đang khóa và không thể chỉnh sửa.
            </p>
          </div>
        </div>

        {state.message ? (
          <div
            className={
              state.success
                ? "rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-200"
                : "rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-bold text-red-200"
            }
          >
            {state.message}
          </div>
        ) : null}

        <div className="flex justify-end">
          <SubmitButton />
        </div>
      </div>
    </form>
  );
}