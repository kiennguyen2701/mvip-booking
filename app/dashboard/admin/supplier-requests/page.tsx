import Link from "next/link";
import { adminClient } from "@/lib/supabase/admin";
import { approveRestaurant, rejectRestaurant } from "./actions";

type RestaurantRequest = {
  id: string;
  name: string | null;
  slug: string | null;
  city: string | null;
  district: string | null;
  address: string | null;
  category: string | null;
  cuisine_type: string | null;
  short_description: string | null;
  cover_image: string | null;
  image_url: string | null;
  status: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

function getStatusLabel(status: string | null, isActive: boolean | null) {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  if (status === "pending_review") return "Pending Review";
  if (isActive) return "Active";
  return "Draft / Inactive";
}

function getStatusClass(status: string | null, isActive: boolean | null) {
  if (status === "approved" || isActive) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "rejected") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getImage(restaurant: RestaurantRequest) {
  return restaurant.cover_image || restaurant.image_url || "";
}

function StatCard({
  title,
  value,
  description,
}: {
  title: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
        {title}
      </p>
      <p className="mt-3 text-4xl font-black tracking-tight text-slate-950">
        {value}
      </p>
      <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-[30px] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-2xl">
        ✓
      </div>
      <h3 className="mt-4 text-xl font-black text-slate-950">
        Không có request đang chờ duyệt
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        Khi supplier tạo restaurant mới, request sẽ xuất hiện tại đây để Admin
        approve hoặc reject.
      </p>
    </div>
  );
}

function RequestCard({ restaurant }: { restaurant: RestaurantRequest }) {
  const image = getImage(restaurant);
  const statusLabel = getStatusLabel(restaurant.status, restaurant.is_active);
  const statusClass = getStatusClass(restaurant.status, restaurant.is_active);

  return (
    <article className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-0 lg:grid-cols-[280px_1fr]">
        <div className="relative min-h-[210px] bg-slate-100">
          {image ? (
            <img
              src={image}
              alt={restaurant.name || "Restaurant"}
              className="h-full min-h-[210px] w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full min-h-[210px] items-center justify-center text-5xl">
              🏪
            </div>
          )}

          <div className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-black text-slate-900 shadow-sm">
            {restaurant.cuisine_type || restaurant.category || "Restaurant"}
          </div>
        </div>

        <div className="flex min-w-0 flex-col justify-between p-5 md:p-6">
          <div className="min-w-0">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <h2 className="break-words text-2xl font-black tracking-tight text-slate-950">
                  {restaurant.name || "Unnamed restaurant"}
                </h2>

                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                  {restaurant.short_description || "Chưa có mô tả ngắn."}
                </p>
              </div>

              <span
                className={`w-fit shrink-0 rounded-full border px-3 py-1 text-xs font-black ${statusClass}`}
              >
                {statusLabel}
              </span>
            </div>

            <div className="mt-5 grid gap-3 text-sm md:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                  Location
                </p>
                <p className="mt-2 font-bold text-slate-800">
                  {restaurant.district || restaurant.city || "-"}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                  Address
                </p>
                <p className="mt-2 line-clamp-2 font-bold text-slate-800">
                  {restaurant.address || "-"}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                  Created
                </p>
                <p className="mt-2 font-bold text-slate-800">
                  {formatDate(restaurant.created_at)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              {restaurant.slug && (
                <Link
                  href={`/restaurants/${restaurant.slug}`}
                  target="_blank"
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                >
                  View Detail
                </Link>
              )}

              <Link
                href="/dashboard/admin/suppliers"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                Supplier List
              </Link>
            </div>

            {restaurant.status === "pending_review" ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <form action={rejectRestaurant.bind(null, restaurant.id)}>
                  <button className="w-full rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-black text-red-700 transition hover:bg-red-100 sm:w-auto">
                    Reject
                  </button>
                </form>

                <form action={approveRestaurant.bind(null, restaurant.id)}>
                  <button className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 sm:w-auto">
                    Approve & Publish
                  </button>
                </form>
              </div>
            ) : (
              <div className="text-sm font-bold text-slate-400">
                No action required
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function ReviewedCard({ restaurant }: { restaurant: RestaurantRequest }) {
  const statusLabel = getStatusLabel(restaurant.status, restaurant.is_active);
  const statusClass = getStatusClass(restaurant.status, restaurant.is_active);

  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <p className="truncate text-base font-black text-slate-950">
          {restaurant.name || "Unnamed restaurant"}
        </p>
        <p className="mt-1 truncate text-sm font-medium text-slate-500">
          {restaurant.city || "-"} · Updated {formatDate(restaurant.updated_at)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span
          className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass}`}
        >
          {statusLabel}
        </span>

        {restaurant.slug && (
          <Link
            href={`/restaurants/${restaurant.slug}`}
            target="_blank"
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-black text-slate-600 hover:bg-slate-50"
          >
            View
          </Link>
        )}
      </div>
    </div>
  );
}

export default async function SupplierRequestsPage() {
  const { data, error } = await adminClient
    .from("restaurants")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="mx-auto max-w-6xl rounded-3xl border border-red-200 bg-white p-6 text-red-700 shadow-sm">
          <h1 className="text-xl font-black">Không tải được Supplier Requests</h1>
          <p className="mt-2 text-sm">{error.message}</p>
        </div>
      </main>
    );
  }

  const restaurants = (data || []) as RestaurantRequest[];

  const pending = restaurants.filter(
    (restaurant) => restaurant.status === "pending_review",
  );

  const approved = restaurants.filter(
    (restaurant) => restaurant.status === "approved",
  );

  const rejected = restaurants.filter(
    (restaurant) => restaurant.status === "rejected",
  );

  const reviewed = [...approved, ...rejected].slice(0, 12);

  return (
    <main className="min-h-screen bg-[#f8f3ea] px-4 py-7 md:px-6 md:py-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-amber-700">
              Platform Admin
            </p>

            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
              Supplier Requests
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
              Duyệt các restaurant do supplier tạo. Khi approve, restaurant sẽ
              active và hiển thị public cho customer.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/admin/suppliers"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Supplier Management
            </Link>

            <Link
              href="/dashboard/admin"
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-slate-800"
            >
              Admin Dashboard
            </Link>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="Pending"
            value={pending.length}
            description="Restaurant đang chờ Admin duyệt."
          />
          <StatCard
            title="Approved"
            value={approved.length}
            description="Restaurant đã được publish ra public."
          />
          <StatCard
            title="Rejected"
            value={rejected.length}
            description="Restaurant đã bị từ chối hoặc cần chỉnh sửa."
          />
        </section>

        <section className="mt-8 rounded-[34px] border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur md:p-6">
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-950">
                Pending Review
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Ưu tiên xử lý các request mới nhất ở đầu danh sách.
              </p>
            </div>

            <span className="w-fit rounded-full bg-amber-100 px-4 py-2 text-xs font-black text-amber-800">
              {pending.length} request pending
            </span>
          </div>

          {pending.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-5">
              {pending.map((restaurant) => (
                <RequestCard key={restaurant.id} restaurant={restaurant} />
              ))}
            </div>
          )}
        </section>

        <section className="mt-8">
          <div className="mb-5">
            <h2 className="text-2xl font-black text-slate-950">
              Recently Reviewed
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Danh sách restaurant đã được approve hoặc reject gần đây.
            </p>
          </div>

          {reviewed.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500 shadow-sm">
              Chưa có restaurant nào được review.
            </div>
          ) : (
            <div className="grid gap-3">
              {reviewed.map((restaurant) => (
                <ReviewedCard key={restaurant.id} restaurant={restaurant} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}