"use client";

import { useState } from "react";

type Props = {
  restaurantId: string;
  restaurantName: string;
  supplierId?: string | null;
};

export default function RestaurantBookingForm({
  restaurantId,
  restaurantName,
  supplierId,
}: Props) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    const agentRef =
      localStorage.getItem("agent_ref") ||
      sessionStorage.getItem("agent_ref") ||
      "";

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
          bookingDate: String(formData.get("booking_date") || ""),
          bookingTime: String(formData.get("booking_time") || ""),
          agentRef,
        }),
      });

      const rawText = await response.text();

      let result: { bookingId?: string; error?: string } = {};

      try {
        result = rawText ? JSON.parse(rawText) : {};
      } catch {
        console.error("BOOKING_API_NON_JSON_RESPONSE:", rawText);
        alert("Booking API returned an invalid response. Check terminal log.");
        return;
      }

      if (!response.ok) {
        console.error("BOOKING_API_ERROR:", result);
        alert(result.error || "Unable to create booking.");
        return;
      }

      if (!result.bookingId) {
        console.error("BOOKING_API_MISSING_ID:", result);
        alert("Booking created but booking ID was missing.");
        return;
      }

      window.location.href = `/booking/${result.bookingId}`;
    } catch (error) {
      console.error("BOOKING_FORM_SUBMIT_ERROR:", error);
      alert("Unable to create booking. Please check terminal log.");
    } finally {
      setLoading(false);
    }
  }

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
              Premium Booking
            </p>

            <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
              Reserve a Table
            </h2>

            <p className="mt-2 text-sm font-medium text-slate-400">
              Secure your seat before arrival
            </p>

            <div className="mx-auto mt-4 w-fit rounded-full border border-amber-300/25 bg-amber-300/10 px-4 py-2 text-sm font-black text-amber-200">
              Instant 5% Discount
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <Field label="Full Name">
              <input
                name="customer_name"
                placeholder="Your name"
                required
                className="booking-input"
              />
            </Field>

            <Field label="Phone Number">
              <input
                name="phone"
                placeholder="090..."
                required
                className="booking-input"
              />
            </Field>

            <Field label="WhatsApp (optional)">
              <input
                name="whatsapp"
                placeholder="+84..."
                className="booking-input"
              />
            </Field>

            <Field label="Guests">
              <select
                name="guest_count"
                defaultValue="2"
                className="booking-input"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((item) => (
                  <option key={item} value={item} className="text-slate-950">
                    {item} {item === 1 ? "guest" : "guests"}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Date">
                <input
                  name="booking_date"
                  type="date"
                  required
                  className="booking-input"
                />
              </Field>

              <Field label="Time">
                <input
                  name="booking_time"
                  type="time"
                  required
                  className="booking-input"
                />
              </Field>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative mt-2 w-full overflow-hidden rounded-2xl bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 px-5 py-4 text-sm font-black text-slate-950 shadow-2xl shadow-amber-900/25 transition duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="relative">
                {loading ? "Processing..." : "Reserve Now"}
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