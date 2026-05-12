"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  createRestaurant,
  updateRestaurant,
  type RestaurantManagerState,
} from "@/app/dashboard/supplier/restaurants/actions";
import { getRestaurantImageUrl } from "@/lib/restaurants/images";

type RestaurantItem = {
  id: string;
  supplier_id: string;
  name: string;
  slug: string;
  short_description?: string | null;
  full_description?: string | null;
  cover_image?: string | null;
  gallery_images?: string[] | null;
  menu_images?: string[] | null;
  address?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  whatsapp?: string | null;
  opening_hours?: Record<string, string> | null;
  price_range?: string | null;
  discount_percent?: number | null;
  tags?: string[] | null;
  amenities?: string[] | null;
  is_active?: boolean;
  is_featured?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

type RestaurantManagerProps = {
  restaurants: RestaurantItem[];
  editingRestaurant: RestaurantItem | null;
};

type ModalState =
  | { mode: "create"; restaurant: null }
  | { mode: "update"; restaurant: RestaurantItem };

const initialState: RestaurantManagerState = {
  success: false,
  message: "",
};

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  error,
  type = "text",
  step,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  placeholder?: string;
  error?: string;
  type?: string;
  step?: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={name} className="block text-sm font-bold text-slate-800">
        {label}
      </label>

      <input
        id={name}
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
      />

      {error ? (
        <p className="text-xs font-semibold text-red-600">{error}</p>
      ) : null}
    </div>
  );
}

function TextArea({
  label,
  name,
  defaultValue,
  placeholder,
  rows = 4,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={name} className="block text-sm font-bold text-slate-800">
        {label}
      </label>

      <textarea
        id={name}
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
      />
    </div>
  );
}

async function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve(blob || new Blob());
      },
      "image/webp",
      quality,
    );
  });
}

async function compressImageFile(
  file: File,
  options: {
    maxWidth: number;
    maxHeight: number;
    targetKb: number;
  },
) {
  if (!file.type.startsWith("image/")) return file;

  const originalKb = Math.round(file.size / 1024);
  if (originalKb <= options.targetKb) return file;

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Cannot load image."));
    };

    img.src = objectUrl;
  });

  const ratio = Math.min(
    options.maxWidth / image.width,
    options.maxHeight / image.height,
    1,
  );

  const width = Math.max(1, Math.round(image.width * ratio));
  const height = Math.max(1, Math.round(image.height * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) return file;

  context.drawImage(image, 0, 0, width, height);

  let quality = 0.82;
  let blob = await canvasToBlob(canvas, quality);

  while (blob.size / 1024 > options.targetKb && quality > 0.42) {
    quality -= 0.08;
    blob = await canvasToBlob(canvas, quality);
  }

  const filename = file.name.replace(/\.[^.]+$/, ".webp");

  return new File([blob], filename, {
    type: "image/webp",
    lastModified: Date.now(),
  });
}

function LocationPicker({ restaurant }: { restaurant?: RestaurantItem | null }) {
  const [address, setAddress] = useState(restaurant?.address ?? "");
  const [city, setCity] = useState(restaurant?.city ?? "Hà Nội");
  const [latitude, setLatitude] = useState(
    restaurant?.latitude !== null && restaurant?.latitude !== undefined
      ? String(restaurant.latitude)
      : "",
  );
  const [longitude, setLongitude] = useState(
    restaurant?.longitude !== null && restaurant?.longitude !== undefined
      ? String(restaurant.longitude)
      : "",
  );
  const [message, setMessage] = useState("");

  async function geocodeAddress() {
    if (!address.trim()) {
      setMessage("Anh cần nhập địa chỉ trước.");
      return;
    }

    setMessage("Đang tìm tọa độ theo địa chỉ...");

    const query = [address, city, "Việt Nam"].filter(Boolean).join(", ");

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
          query,
        )}`,
      );

      const result = await response.json();

      if (!Array.isArray(result) || !result[0]) {
        setMessage("Không tìm thấy tọa độ. Anh nhập địa chỉ cụ thể hơn.");
        return;
      }

      setLatitude(String(Number(result[0].lat)));
      setLongitude(String(Number(result[0].lon)));
      setMessage("Đã lấy tọa độ. Anh có thể chỉnh Latitude/Longitude thủ công.");
    } catch {
      setMessage("Không thể tìm tọa độ. Anh nhập Latitude/Longitude thủ công.");
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <h3 className="text-lg font-black text-slate-950">Vị trí nhà hàng</h3>
      <p className="mt-1 text-sm text-slate-500">
        Điền địa chỉ để lấy tọa độ tự động, hoặc nhập Latitude/Longitude thủ công.
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <label htmlFor="address" className="block text-sm font-bold text-slate-800">
            Địa chỉ
          </label>

          <input
            id="address"
            name="address"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="Số nhà, tên đường..."
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="city" className="block text-sm font-bold text-slate-800">
            Thành phố
          </label>

          <input
            id="city"
            name="city"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="Hà Nội"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
          />
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={geocodeAddress}
            className="h-12 w-full rounded-xl bg-slate-950 text-sm font-black text-white hover:bg-slate-800"
          >
            Lấy tọa độ theo địa chỉ
          </button>
        </div>

        <div className="space-y-2">
          <label htmlFor="latitude" className="block text-sm font-bold text-slate-800">
            Latitude
          </label>

          <input
            id="latitude"
            name="latitude"
            type="number"
            step="any"
            value={latitude}
            onChange={(event) => setLatitude(event.target.value)}
            placeholder="21.028511"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="longitude" className="block text-sm font-bold text-slate-800">
            Longitude
          </label>

          <input
            id="longitude"
            name="longitude"
            type="number"
            step="any"
            value={longitude}
            onChange={(event) => setLongitude(event.target.value)}
            placeholder="105.804817"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
          />
        </div>
      </div>

      {message && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
          {message}
        </div>
      )}
    </section>
  );
}

function ImageUploader({ restaurant }: { restaurant?: RestaurantItem | null }) {
  const initialGallery = restaurant?.gallery_images || [];
  const originalCoverUrl = getRestaurantImageUrl(restaurant?.cover_image);

  const [coverPreview, setCoverPreview] = useState("");
  const [coverRemoved, setCoverRemoved] = useState(false);
  const [existingGallery, setExistingGallery] = useState<string[]>(initialGallery);
  const [galleryPreview, setGalleryPreview] = useState<string[]>([]);

  const visibleCoverUrl = coverRemoved ? "" : originalCoverUrl;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-slate-950">Hình ảnh</h2>

      <p className="mt-1 text-sm text-slate-500">
        Ảnh upload sẽ được tự động nén về khoảng 300–700KB trước khi lưu.
      </p>

      <input
        type="hidden"
        name="existing_cover_image"
        value={coverRemoved ? "" : restaurant?.cover_image || ""}
      />

      <input
        type="hidden"
        name="existing_gallery_images"
        value={existingGallery.join("\n")}
      />

      <div className="mt-4 grid gap-4">
        <Field
          label="Cover image URL"
          name="cover_image"
          defaultValue=""
          placeholder="Dán link ảnh ngoài hoặc upload file bên dưới"
        />

        <div className="space-y-2">
          <label className="block text-sm font-bold text-slate-800">
            Upload cover image
          </label>

          <input
            name="cover_image_file"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (file) {
                setCoverRemoved(false);
                setCoverPreview(URL.createObjectURL(file));
              }
            }}
          />
        </div>

        {(coverPreview || visibleCoverUrl) && (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <img
              src={coverPreview || visibleCoverUrl}
              alt="Cover preview"
              className="h-56 w-full object-cover"
              referrerPolicy="no-referrer"
              loading="lazy"
              decoding="async"
            />
          </div>
        )}

        {(restaurant?.cover_image || coverPreview) && !coverRemoved && (
          <button
            type="button"
            onClick={() => {
              setCoverRemoved(true);
              setCoverPreview("");
            }}
            className="w-fit rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-black text-red-600 hover:bg-red-100"
          >
            Remove cover image
          </button>
        )}

        {coverRemoved && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            Cover image will be removed after saving.
          </div>
        )}

        <TextArea
          label="Thêm Gallery ảnh mới, mỗi dòng 1 link"
          name="gallery_images"
          defaultValue=""
          rows={5}
          placeholder={`https://image-1.jpg\nhttps://image-2.jpg`}
        />

        <div className="space-y-2">
          <label className="block text-sm font-bold text-slate-800">
            Upload thêm gallery images
          </label>

          <input
            name="gallery_image_files"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
            onChange={(event) => {
              const files = Array.from(event.target.files || []);
              setGalleryPreview(files.map((file) => URL.createObjectURL(file)));
            }}
          />
        </div>

        {!!galleryPreview.length && (
          <div>
            <p className="mb-2 text-sm font-bold text-slate-800">
              Gallery preview mới
            </p>

            <div className="grid grid-cols-3 gap-3">
              {galleryPreview.map((img) => (
                <div
                  key={img}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                >
                  <img
                    src={img}
                    alt="Gallery preview"
                    className="h-24 w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {existingGallery.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-bold text-slate-800">
              Gallery hiện tại
            </p>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {existingGallery.map((img) => {
                const url = getRestaurantImageUrl(img);

                return (
                  <div
                    key={img}
                    className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                  >
                    <img
                      src={url}
                      alt="Gallery"
                      className="h-24 w-full object-cover"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      decoding="async"
                    />

                    <button
                      type="button"
                      onClick={() => {
                        setExistingGallery((current) =>
                          current.filter((item) => item !== img),
                        );
                      }}
                      className="absolute right-2 top-2 rounded-full bg-red-600 px-2 py-1 text-[10px] font-black text-white shadow hover:bg-red-700"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>

            <p className="mt-2 text-xs font-semibold text-slate-500">
              Những ảnh đã remove sẽ bị xóa khỏi gallery sau khi bấm lưu cập nhật.
            </p>
          </div>
        )}

        {!existingGallery.length && restaurant?.gallery_images?.length ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            All current gallery images will be removed after saving.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function MenuImageUploader({
  restaurant,
}: {
  restaurant?: RestaurantItem | null;
}) {
  const initialMenuImages = restaurant?.menu_images || [];
  const [existingMenuImages, setExistingMenuImages] =
    useState<string[]>(initialMenuImages);
  const [menuPreview, setMenuPreview] = useState<string[]>([]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-slate-950">Hình ảnh Menu</h2>

      <p className="mt-1 text-sm text-slate-500">
        Upload nhiều ảnh menu hoặc dán link ảnh menu. Ảnh upload cũng sẽ được nén trước khi lưu.
      </p>

      <input
        type="hidden"
        name="existing_menu_images"
        value={existingMenuImages.join("\n")}
      />

      <div className="mt-4 grid gap-4">
        <TextArea
          label="Thêm ảnh Menu mới, mỗi dòng 1 link"
          name="menu_images"
          defaultValue=""
          rows={5}
          placeholder={`https://menu-1.jpg\nhttps://menu-2.jpg`}
        />

        <div className="space-y-2">
          <label className="block text-sm font-bold text-slate-800">
            Upload ảnh menu
          </label>

          <input
            name="menu_image_files"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
            onChange={(event) => {
              const files = Array.from(event.target.files || []);
              setMenuPreview(files.map((file) => URL.createObjectURL(file)));
            }}
          />

          <p className="text-xs font-semibold text-slate-500">
            Có thể chọn nhiều ảnh menu cùng lúc.
          </p>
        </div>

        {!!menuPreview.length && (
          <div>
            <p className="mb-2 text-sm font-bold text-slate-800">
              Menu preview mới
            </p>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {menuPreview.map((img) => (
                <div
                  key={img}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                >
                  <img
                    src={img}
                    alt="Menu preview"
                    className="h-40 w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {existingMenuImages.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-bold text-slate-800">
              Menu hiện tại
            </p>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {existingMenuImages.map((img) => {
                const url = getRestaurantImageUrl(img) || img;

                return (
                  <div
                    key={img}
                    className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                  >
                    <img
                      src={url}
                      alt="Menu"
                      className="h-40 w-full object-cover"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      decoding="async"
                    />

                    <button
                      type="button"
                      onClick={() => {
                        setExistingMenuImages((current) =>
                          current.filter((item) => item !== img),
                        );
                      }}
                      className="absolute right-2 top-2 rounded-full bg-red-600 px-2 py-1 text-[10px] font-black text-white shadow hover:bg-red-700"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>

            <p className="mt-2 text-xs font-semibold text-slate-500">
              Những ảnh menu đã remove sẽ bị xóa khỏi menu sau khi bấm lưu cập nhật.
            </p>
          </div>
        )}

        {!existingMenuImages.length && restaurant?.menu_images?.length ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            All current menu images will be removed after saving.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function RestaurantForm({
  mode,
  restaurant,
}: {
  mode: "create" | "update";
  restaurant?: RestaurantItem | null;
}) {
  const [state, setState] = useState<RestaurantManagerState>(initialState);
  const [submitting, setSubmitting] = useState(false);

  const openingHours = restaurant?.opening_hours || {};

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    setSubmitting(true);
    setState({ success: false, message: "Đang nén ảnh và lưu dữ liệu..." });

    try {
      const coverFile = formData.get("cover_image_file");

      if (coverFile instanceof File && coverFile.size > 0) {
        const compressedCover = await compressImageFile(coverFile, {
          maxWidth: 1600,
          maxHeight: 1200,
          targetKb: 650,
        });

        formData.set("cover_image_file", compressedCover);
      }

      const galleryFiles = formData.getAll("gallery_image_files");
      formData.delete("gallery_image_files");

      for (const item of galleryFiles) {
        if (item instanceof File && item.size > 0) {
          const compressedGallery = await compressImageFile(item, {
            maxWidth: 1400,
            maxHeight: 1000,
            targetKb: 550,
          });

          formData.append("gallery_image_files", compressedGallery);
        }
      }

      const menuFiles = formData.getAll("menu_image_files");
      formData.delete("menu_image_files");

      for (const item of menuFiles) {
        if (item instanceof File && item.size > 0) {
          const compressedMenu = await compressImageFile(item, {
            maxWidth: 1600,
            maxHeight: 2200,
            targetKb: 750,
          });

          formData.append("menu_image_files", compressedMenu);
        }
      }

      const result =
        mode === "create"
          ? await createRestaurant(initialState, formData)
          : await updateRestaurant(initialState, formData);

      setState(result);
    } catch (error) {
      setState({
        success: false,
        message:
          error instanceof Error ? error.message : "Không thể lưu restaurant.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {mode === "update" && restaurant && (
        <input type="hidden" name="restaurant_id" value={restaurant.id} />
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">
          {mode === "create" ? "Tạo nhà hàng mới" : "Cập nhật nhà hàng"}
        </h2>

        <p className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-800">
          Nhà hàng Supplier tạo mới mặc định Inactive. Admin sẽ duyệt Active sau.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field
            label="Tên nhà hàng"
            name="name"
            defaultValue={restaurant?.name}
            placeholder="Ví dụ: Mvip Rooftop Dining"
            error={state.errors?.name}
          />

          <Field
            label="Slug"
            name="slug"
            defaultValue={restaurant?.slug}
            placeholder="mvip-rooftop-dining"
            error={state.errors?.slug}
          />

          <Field
            label="Số điện thoại"
            name="phone"
            defaultValue={restaurant?.phone}
            placeholder="090..."
          />

          <Field
            label="WhatsApp"
            name="whatsapp"
            defaultValue={restaurant?.whatsapp}
            placeholder="+84..."
          />

          <Field
            label="Discount % cho Customer"
            name="discount_percent"
            defaultValue={restaurant?.discount_percent ?? 5}
            placeholder="5"
            type="number"
            step="any"
          />

          <div className="space-y-2">
            <label htmlFor="price_range" className="block text-sm font-bold text-slate-800">
              Mức giá
            </label>

            <select
              id="price_range"
              name="price_range"
              defaultValue={restaurant?.price_range || ""}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
            >
              <option value="">Chọn mức giá</option>
              <option value="$">$</option>
              <option value="$$">$$</option>
              <option value="$$$">$$$</option>
              <option value="$$$$">$$$$</option>
            </select>
          </div>
        </div>

        <div className="mt-5">
          <LocationPicker restaurant={restaurant} />
        </div>

        <div className="mt-5">
          <TextArea
            label="Mô tả ngắn"
            name="short_description"
            defaultValue={restaurant?.short_description}
            rows={3}
            placeholder="Mô tả ngắn cho card/search"
          />
        </div>

        <div className="mt-5">
          <TextArea
            label="Bài giới thiệu dài HTML"
            name="full_description"
            defaultValue={restaurant?.full_description}
            rows={10}
            placeholder={`<p>Không gian sang trọng...</p>\n<img src="https://..." />`}
          />
        </div>
      </section>

      <ImageUploader restaurant={restaurant} />
      <MenuImageUploader restaurant={restaurant} />

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">Giờ mở cửa</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Monday" name="opening_hours_monday" defaultValue={openingHours.monday || ""} placeholder="09:00 - 22:00" />
          <Field label="Tuesday" name="opening_hours_tuesday" defaultValue={openingHours.tuesday || ""} placeholder="09:00 - 22:00" />
          <Field label="Wednesday" name="opening_hours_wednesday" defaultValue={openingHours.wednesday || ""} placeholder="09:00 - 22:00" />
          <Field label="Thursday" name="opening_hours_thursday" defaultValue={openingHours.thursday || openingHours.Thursday || ""} placeholder="09:00 - 22:00" />
          <Field label="Friday" name="opening_hours_friday" defaultValue={openingHours.friday || ""} placeholder="09:00 - 22:00" />
          <Field label="Saturday" name="opening_hours_saturday" defaultValue={openingHours.saturday || ""} placeholder="09:00 - 22:00" />
          <Field label="Sunday" name="opening_hours_sunday" defaultValue={openingHours.sunday || ""} placeholder="09:00 - 22:00" />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">Phân loại</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <TextArea
            label="Tags, phân tách bằng dấu phẩy"
            name="tags"
            defaultValue={(restaurant?.tags || []).join(", ")}
            rows={4}
            placeholder="buffet, seafood, rooftop"
          />

          <TextArea
            label="Amenities, phân tách bằng dấu phẩy"
            name="amenities"
            defaultValue={(restaurant?.amenities || []).join(", ")}
            rows={4}
            placeholder="parking, private-room, wifi"
          />
        </div>
      </section>

      {state.message && (
        <div
          className={
            state.success
              ? "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700"
              : "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700"
          }
        >
          {state.message}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-xl bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting
          ? "Đang xử lý..."
          : mode === "create"
            ? "Tạo nhà hàng"
            : "Lưu cập nhật"}
      </button>
    </form>
  );
}

function RestaurantFormModal({
  modal,
  onClose,
}: {
  modal: ModalState;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[99999] overflow-y-auto bg-black/70 px-2 py-3 backdrop-blur-md md:px-6 md:py-6">
      <button
        type="button"
        onClick={onClose}
        className="fixed inset-0 cursor-default"
        aria-label="Close restaurant form"
      />

      <section className="relative z-10 mx-auto flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50 shadow-2xl">
        <div className="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-500">
              Supplier Restaurant
            </p>

            <h2 className="mt-1 text-2xl font-black text-slate-950">
              {modal.mode === "create" ? "Tạo nhà hàng mới" : "Chỉnh sửa nhà hàng"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-xl font-black text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <RestaurantForm
            key={modal.mode === "create" ? "create" : modal.restaurant.id}
            mode={modal.mode}
            restaurant={modal.restaurant}
          />
        </div>
      </section>
    </div>
  );
}

export default function RestaurantManager({
  restaurants,
}: RestaurantManagerProps) {
  const [modal, setModal] = useState<ModalState | null>(null);

  const sortedRestaurants = useMemo(() => restaurants, [restaurants]);

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-950">
              Danh sách nhà hàng
            </h2>
            <p className="text-sm text-slate-500">
              Tổng số: {sortedRestaurants.length}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setModal({ mode: "create", restaurant: null })}
            className="w-fit rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-slate-800"
          >
            + Tạo mới
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {sortedRestaurants.map((restaurant) => {
            const coverUrl = getRestaurantImageUrl(restaurant.cover_image);

            return (
              <div
                key={restaurant.id}
                className="rounded-2xl border border-slate-200 p-4 transition hover:border-amber-200 hover:bg-amber-50/30"
              >
                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="h-32 w-full overflow-hidden rounded-xl bg-amber-50 sm:h-24 sm:w-32">
                    {coverUrl ? (
                      <img
                        src={coverUrl}
                        alt={restaurant.name}
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-3xl">
                        🏪
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-black text-slate-950">
                      {restaurant.name}
                    </h3>

                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                      {restaurant.address || "Chưa có địa chỉ"}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <span
                        className={
                          restaurant.is_active
                            ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700"
                            : "rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700"
                        }
                      >
                        {restaurant.is_active ? "Active" : "Inactive"}
                      </span>

                      <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700">
                        Giảm {restaurant.discount_percent ?? 5}%
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href={`/restaurants/${restaurant.slug}`}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        Xem chi tiết
                      </Link>

                      <button
                        type="button"
                        onClick={() =>
                          setModal({ mode: "update", restaurant })
                        }
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        Chỉnh sửa
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {!sortedRestaurants.length && (
            <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 md:col-span-2">
              Chưa có nhà hàng nào.
            </div>
          )}
        </div>
      </section>

      {modal ? (
        <RestaurantFormModal modal={modal} onClose={() => setModal(null)} />
      ) : null}
    </>
  );
}