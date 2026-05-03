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
    address: string;
    city: string;
    slug: string;
    short_description: string;
    full_description: string;
    cover_image: string;
    gallery_images: string[];
    whatsapp: string;
    opening_hours: Record<string, string>;
    price_range: string;
    amenities: string[];
    tags: string[];
    latitude: number | null;
    longitude: number | null;
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
      className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Đang lưu..." : "Lưu hồ sơ nhà hàng"}
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
  defaultValue?: string | number;
  placeholder?: string;
  error?: string;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={name} className="block text-sm font-medium text-slate-800">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
      />
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function TextArea({
  label,
  name,
  defaultValue,
  placeholder,
  rows = 4,
  error,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  rows?: number;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={name} className="block text-sm font-medium text-slate-800">
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
      />
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

export default function SupplierProfileForm({
  initialData,
}: SupplierProfileFormProps) {
  const [state, formAction] = useActionState(
    updateSupplierProfile,
    initialState
  );

  return (
    <form action={formAction} className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Thông tin cơ bản
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            label="Tên nhà hàng / công ty"
            name="company_name"
            defaultValue={initialData.company_name}
            placeholder="Ví dụ: Mvip Seafood Restaurant"
            error={state.errors?.company_name}
          />

          <Field
            label="Người liên hệ"
            name="contact_name"
            defaultValue={initialData.contact_name}
            placeholder="Ví dụ: Mr Test"
            error={state.errors?.contact_name}
          />

          <Field
            label="Số điện thoại"
            name="phone"
            defaultValue={initialData.phone}
            placeholder="0900000000"
            error={state.errors?.phone}
          />

          <Field
            label="Email"
            name="email"
            defaultValue={initialData.email}
            placeholder="supplier@test.com"
            error={state.errors?.email}
            type="email"
          />

          <Field
            label="Slug"
            name="slug"
            defaultValue={initialData.slug}
            placeholder="mvip-seafood-restaurant"
            error={state.errors?.slug}
          />

          <Field
            label="WhatsApp"
            name="whatsapp"
            defaultValue={initialData.whatsapp}
            placeholder="+84..."
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Giới thiệu nhà hàng
        </h2>

        <div className="space-y-4">
          <TextArea
            label="Mô tả ngắn"
            name="short_description"
            defaultValue={initialData.short_description}
            rows={3}
            placeholder="Mô tả ngắn gọn để hiển thị ở listing, recommend, search result..."
          />

          <TextArea
            label="Bài giới thiệu dài"
            name="full_description"
            defaultValue={initialData.full_description}
            rows={8}
            placeholder="Giới thiệu concept, không gian, món nổi bật, trải nghiệm, đối tượng khách phù hợp..."
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Hình ảnh</h2>

        <div className="space-y-4">
          <Field
            label="Ảnh cover (URL)"
            name="cover_image"
            defaultValue={initialData.cover_image}
            placeholder="https://..."
          />

          <TextArea
            label="Gallery ảnh (mỗi dòng 1 link)"
            name="gallery_images"
            defaultValue={initialData.gallery_images.join("\n")}
            rows={6}
            placeholder={`https://image-1.jpg\nhttps://image-2.jpg\nhttps://image-3.jpg`}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Địa chỉ & bản đồ
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            label="Địa chỉ"
            name="address"
            defaultValue={initialData.address}
            placeholder="Số nhà, tên đường..."
          />

          <Field
            label="Thành phố"
            name="city"
            defaultValue={initialData.city}
            placeholder="Hà Nội"
          />

          <Field
            label="Latitude"
            name="latitude"
            defaultValue={initialData.latitude ?? ""}
            placeholder="21.028511"
            type="number"
          />

          <Field
            label="Longitude"
            name="longitude"
            defaultValue={initialData.longitude ?? ""}
            placeholder="105.804817"
            type="number"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Giờ mở cửa
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            label="Monday"
            name="opening_hours_monday"
            defaultValue={initialData.opening_hours.monday}
            placeholder="09:00 - 22:00"
          />
          <Field
            label="Tuesday"
            name="opening_hours_tuesday"
            defaultValue={initialData.opening_hours.tuesday}
            placeholder="09:00 - 22:00"
          />
          <Field
            label="Wednesday"
            name="opening_hours_wednesday"
            defaultValue={initialData.opening_hours.wednesday}
            placeholder="09:00 - 22:00"
          />
          <Field
            label="Thursday"
            name="opening_hours_thursday"
            defaultValue={initialData.opening_hours.thursday}
            placeholder="09:00 - 22:00"
          />
          <Field
            label="Friday"
            name="opening_hours_friday"
            defaultValue={initialData.opening_hours.friday}
            placeholder="09:00 - 22:00"
          />
          <Field
            label="Saturday"
            name="opening_hours_saturday"
            defaultValue={initialData.opening_hours.saturday}
            placeholder="09:00 - 22:00"
          />
          <Field
            label="Sunday"
            name="opening_hours_sunday"
            defaultValue={initialData.opening_hours.sunday}
            placeholder="09:00 - 22:00"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Phân loại hiển thị
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="price_range"
              className="block text-sm font-medium text-slate-800"
            >
              Mức giá
            </label>
            <select
              id="price_range"
              name="price_range"
              defaultValue={initialData.price_range}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            >
              <option value="">Chọn mức giá</option>
              <option value="$">$</option>
              <option value="$$">$$</option>
              <option value="$$$">$$$</option>
              <option value="$$$$">$$$$</option>
            </select>
            {state.errors?.price_range ? (
              <p className="text-xs text-red-600">{state.errors.price_range}</p>
            ) : null}
          </div>

          <TextArea
            label="Tags (phân tách bằng dấu phẩy)"
            name="tags"
            defaultValue={initialData.tags.join(", ")}
            rows={4}
            placeholder="seafood, rooftop, romantic, family"
          />
        </div>

        <div className="mt-4">
          <TextArea
            label="Amenities (phân tách bằng dấu phẩy)"
            name="amenities"
            defaultValue={initialData.amenities.join(", ")}
            rows={4}
            placeholder="wifi, parking, private-room, kids-friendly"
          />
        </div>
      </section>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-h-[44px]">
          {state.message ? (
            <div
              className={`rounded-xl px-4 py-3 text-sm ${
                state.success
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {state.message}
            </div>
          ) : null}
        </div>

        <SubmitButton />
      </div>
    </form>
  );
}