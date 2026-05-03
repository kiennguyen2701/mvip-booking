import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SupplierProfileForm from "@/app/dashboard/supplier/profile/supplier-profile-form";

export const dynamic = "force-dynamic";

type OpeningHours = {
  monday?: string;
  tuesday?: string;
  wednesday?: string;
  thursday?: string;
  friday?: string;
  saturday?: string;
  sunday?: string;
};

type SupplierRow = {
  id: string;
  user_id: string;
  company_name: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  slug: string | null;
  short_description: string | null;
  full_description: string | null;
  cover_image: string | null;
  gallery_images: string[] | null;
  whatsapp: string | null;
  opening_hours: OpeningHours | null;
  price_range: string | null;
  amenities: string[] | null;
  tags: string[] | null;
  latitude: number | null;
  longitude: number | null;
  updated_at: string | null;
};

export default async function SupplierProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
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
        address,
        city,
        slug,
        short_description,
        full_description,
        cover_image,
        gallery_images,
        whatsapp,
        opening_hours,
        price_range,
        amenities,
        tags,
        latitude,
        longitude,
        updated_at
      `
    )
    .eq("user_id", user.id)
    .single<SupplierRow>();

  if (error || !supplier) {
    return (
      <div className="mx-auto max-w-5xl p-4 md:p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          Không tìm thấy hồ sơ supplier của tài khoản này. Anh kiểm tra lại bảng
          <span className="mx-1 font-semibold">suppliers.user_id</span>
          đã map đúng với
          <span className="mx-1 font-semibold">auth.users.id</span>
          chưa.
        </div>
      </div>
    );
  }

  const openingHours = supplier.opening_hours ?? {};

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-6">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Supplier Profile CMS
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Nhà hàng tự cập nhật bài giới thiệu, hình ảnh, liên hệ và thông tin hiển
            thị đồng bộ lên hệ thống.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
          <div className="font-medium text-slate-900">Cập nhật gần nhất</div>
          <div className="text-slate-600">
            {supplier.updated_at
              ? new Date(supplier.updated_at).toLocaleString("vi-VN")
              : "Chưa có dữ liệu"}
          </div>
        </div>
      </div>

      <SupplierProfileForm
        initialData={{
          company_name: supplier.company_name ?? "",
          contact_name: supplier.contact_name ?? "",
          phone: supplier.phone ?? "",
          email: supplier.email ?? "",
          address: supplier.address ?? "",
          city: supplier.city ?? "",
          slug: supplier.slug ?? "",
          short_description: supplier.short_description ?? "",
          full_description: supplier.full_description ?? "",
          cover_image: supplier.cover_image ?? "",
          gallery_images: supplier.gallery_images ?? [],
          whatsapp: supplier.whatsapp ?? "",
          opening_hours: {
            monday: openingHours.monday ?? "",
            tuesday: openingHours.tuesday ?? "",
            wednesday: openingHours.wednesday ?? "",
            thursday: openingHours.thursday ?? "",
            friday: openingHours.friday ?? "",
            saturday: openingHours.saturday ?? "",
            sunday: openingHours.sunday ?? "",
          },
          price_range: supplier.price_range ?? "",
          amenities: supplier.amenities ?? [],
          tags: supplier.tags ?? [],
          latitude: supplier.latitude ?? null,
          longitude: supplier.longitude ?? null,
        }}
      />
    </div>
  );
}