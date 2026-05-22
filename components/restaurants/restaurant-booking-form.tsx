"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type PreferredLanguage = "en" | "zh";

type Props = {
  restaurantId: string;
  restaurantName: string;
  supplierId?: string | null;
  preferredLanguage?: PreferredLanguage;
};

type CustomerProfile = {
  full_name?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
};

const HOURS = Array.from({ length: 24 }, (_, index) =>
  String(index).padStart(2, "0"),
);

const MINUTES = ["00", "10", "20", "30", "40", "50"];

function getTodayDateInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

const bookingText = {
  en: {
    premiumBooking: "Premium Booking",
    reserveTitle: "Reserve a Table",
    secureSeat: "Secure your seat before arrival",
    instantDiscount: "Instant 5% Discount",
    useProfile: "Use My Profile Information",
    fullName: "Full Name",
    phoneNumber: "Phone Number",
    whatsapp: "WhatsApp (optional)",
    guests: "Guests",
    guest: "guest",
    guestPlural: "guests",
    date: "Date",
    hour: "Hour",
    minute: "Minute",
    yourName: "Your name",
    processing: "Processing...",
    reserveNow: "Reserve Now",
    invalidResponse:
      "Booking API returned an invalid response. Check terminal log.",
    unableCreate: "Unable to create booking.",
    missingId: "Booking created but booking ID was missing.",
    unableCreateTerminal: "Unable to create booking. Please check terminal log.",
  },
  zh: {
    premiumBooking: "高端预订",
    reserveTitle: "预订餐桌",
    secureSeat: "提前预订您的座位",
    instantDiscount: "即时 5% 折扣",
    useProfile: "使用我的资料",
    fullName: "姓名",
    phoneNumber: "电话号码",
    whatsapp: "WhatsApp（可选）",
    guests: "人数",
    guest: "位客人",
    guestPlural: "位客人",
    date: "日期",
    hour: "小时",
    minute: "分钟",
    yourName: "请输入姓名",
    processing: "正在处理...",
    reserveNow: "立即预订",
    invalidResponse: "预订接口返回异常。请检查终端日志。",
    unableCreate: "无法创建预订。",
    missingId: "预订已创建，但缺少预订 ID。",
    unableCreateTerminal: "无法创建预订。请检查终端日志。",
  },
} as const;

export default function RestaurantBookingForm({
  restaurantId,
  restaurantName,
  supplierId,
  preferredLanguage = "en",
}: Props) {
  const t = useMemo(() => {
    return preferredLanguage === "zh" ? bookingText.zh : bookingText.en;
  }, [preferredLanguage]);

  const formRef = useRef<HTMLFormElement | null>(null);
  const profileLoadedRef = useRef(false);

  const todayDate = useMemo(() => getTodayDateInputValue(), []);

  const [loading, setLoading] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  const [bookingDate, setBookingDate] = useState(todayDate);
  const [bookingHour, setBookingHour] = useState("18");
  const [bookingMinute, setBookingMinute] = useState("00");

  const [profileLoading, setProfileLoading] = useState(false);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);

  const loadProfile = useCallback(async () => {
    if (profileLoadedRef.current) return;

    profileLoadedRef.current = true;

    try {
      setProfileLoading(true);

      const response = await fetch("/api/customer/profile", {
        cache: "no-store",
      });

      if (!response.ok) return;

      const data = await response.json();

      if (!data?.profile) return;

      setProfile(data.profile);
    } catch (error) {
      console.error("LOAD_PROFILE_ERROR:", error);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    const currentForm = formRef.current;

    if (!currentForm || typeof IntersectionObserver === "undefined") {
      const timer = window.setTimeout(() => {
        void loadProfile();
      }, 800);

      return () => window.clearTimeout(timer);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((entry) => entry.isIntersecting);

        if (visible) {
          void loadProfile();
          observer.disconnect();
        }
      },
      {
        rootMargin: "300px 0px",
        threshold: 0.01,
      },
    );

    observer.observe(currentForm);

    return () => observer.disconnect();
  }, [loadProfile]);

  const applyProfile = useCallback(() => {
    if (!profile) return;

    setCustomerName(profile.full_name || "");
    setPhone(profile.phone || "");
    setWhatsapp(profile.whatsapp || "");
  }, [profile]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (loading) return;

      const formData = new FormData(event.currentTarget);

      const agentRef =
        localStorage.getItem("agent_ref") ||
        sessionStorage.getItem("agent_ref") ||
        "";

      const bookingTime = `${bookingHour}:${bookingMinute}`;

      setLoading(true);

      try {
        const response = await fetch("/api/booking/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            restaurantId,
            restaurantName,
            supplierId,
            customerName: String(formData.get("customer_name") || ""),
            phone: String(formData.get("phone") || ""),
            whatsapp: String(formData.get("whatsapp") || ""),
            guests: Number(formData.get("guest_count") || 1),
            bookingDate: String(formData.get("booking_date") || bookingDate),
            bookingTime,
            agentRef,
            customerLanguage: preferredLanguage,
            preferredLanguage,
          }),
        });

        const rawText = await response.text();

        let result: { bookingId?: string; error?: string } = {};

        try {
          result = rawText ? JSON.parse(rawText) : {};
        } catch {
          console.error("BOOKING_API_NON_JSON_RESPONSE:", rawText);
          alert(t.invalidResponse);
          return;
        }

        if (!response.ok) {
          console.error("BOOKING_API_ERROR:", result);
          alert(result.error || t.unableCreate);
          return;
        }

        if (!result.bookingId) {
          console.error("BOOKING_API_MISSING_ID:", result);
          alert(t.missingId);
          return;
        }

        window.location.href = `/booking/${result.bookingId}`;
      } catch (error) {
        console.error("BOOKING_FORM_SUBMIT_ERROR:", error);
        alert(t.unableCreateTerminal);
      } finally {
        setLoading(false);
      }
    },
    [
      bookingDate,
      bookingHour,
      bookingMinute,
      loading,
      preferredLanguage,
      restaurantId,
      restaurantName,
      supplierId,
      t.invalidResponse,
      t.missingId,
      t.unableCreate,
      t.unableCreateTerminal,
    ],
  );

  return (
    <aside className="self-start lg:sticky lg:top-28 lg:h-fit">
      <section className="relative overflow-hidden rounded-[34px] border border-white/15 bg-gradient-to-br from-[#15110b]/95 via-[#0b0906]/95 to-[#211509]/95 p-1 shadow-2xl shadow-black/30">
        <div className="pointer-events-none absolute -left-24 -top-24 h-56 w-56 rounded-full bg-amber-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-56 w-56 rounded-full bg-orange-600/20 blur-3xl" />

        <div className="relative rounded-[30px] border border-white/10 bg-white/[0.07] p-6 backdrop-blur-2xl">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-200 via-amber-300 to-yellow-600 text-2xl text-slate-950 shadow-xl shadow-amber-900/30">
              ♛
            </div>

            <p className="mt-4 text-xs font-black uppercase tracking-[0.28em] text-amber-300">
              {t.premiumBooking}
            </p>

            <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
              {t.reserveTitle}
            </h2>

            <p className="mt-2 text-sm font-medium text-slate-400">
              {t.secureSeat}
            </p>

            <div className="mx-auto mt-4 w-fit rounded-full border border-amber-300/25 bg-amber-300/10 px-4 py-2 text-sm font-black text-amber-200">
              {t.instantDiscount}
            </div>
          </div>

          {profile && (
            <button
              type="button"
              onClick={applyProfile}
              disabled={profileLoading}
              className="mt-5 flex w-full items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm font-black text-amber-200 transition hover:bg-amber-300/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t.useProfile}
            </button>
          )}

          <form ref={formRef} onSubmit={handleSubmit} className="mt-7 space-y-4">
            <Field label={t.fullName}>
              <input
                name="customer_name"
                placeholder={t.yourName}
                required
                autoComplete="name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="booking-input"
              />
            </Field>

            <Field label={t.phoneNumber}>
              <input
                name="phone"
                placeholder="090..."
                required
                autoComplete="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="booking-input"
              />
            </Field>

            <Field label={t.whatsapp}>
              <input
                name="whatsapp"
                placeholder="+84..."
                autoComplete="tel"
                inputMode="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="booking-input"
              />
            </Field>

            <Field label={t.guests}>
              <select
                name="guest_count"
                defaultValue="2"
                className="booking-input"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((item) => (
                  <option key={item} value={item} className="text-slate-950">
                    {item} {item === 1 ? t.guest : t.guestPlural}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={t.date}>
              <input
                name="booking_date"
                type="date"
                required
                min={todayDate}
                value={bookingDate}
                onChange={(event) => {
                  const nextDate = event.target.value;

                  if (!nextDate || nextDate < todayDate) {
                    setBookingDate(todayDate);
                    return;
                  }

                  setBookingDate(nextDate);
                }}
                className="booking-input"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t.hour}>
                <select
                  value={bookingHour}
                  onChange={(event) => setBookingHour(event.target.value)}
                  className="booking-input"
                >
                  {HOURS.map((hour) => (
                    <option
                      key={hour}
                      value={hour}
                      className="text-slate-950"
                    >
                      {hour}h
                    </option>
                  ))}
                </select>
              </Field>

              <Field label={t.minute}>
                <select
                  value={bookingMinute}
                  onChange={(event) => setBookingMinute(event.target.value)}
                  className="booking-input"
                >
                  {MINUTES.map((minute) => (
                    <option
                      key={minute}
                      value={minute}
                      className="text-slate-950"
                    >
                      {minute}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative mt-2 w-full overflow-hidden rounded-2xl bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 px-5 py-4 text-sm font-black text-slate-950 shadow-2xl shadow-amber-900/25 transition duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="relative">
                {loading ? t.processing : t.reserveNow}
              </span>
            </button>
          </form>
        </div>
      </section>
    </aside>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-slate-300">
        {label}
      </span>

      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-[1px] shadow-inner shadow-black/20 transition focus-within:border-amber-300/40 focus-within:ring-4 focus-within:ring-amber-300/10">
        {children}
      </div>
    </label>
  );
}