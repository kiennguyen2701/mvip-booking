// components/booking/cancel-booking-button.tsx
"use client";

import { useState } from "react";
import { cancelBookingByCustomer } from "@/app/actions/customer-cancel-booking";
import { useLang } from "@/lib/hooks/use-lang";

const COPY = {
  en: {
    cancel: "Cancel Booking",
    confirm: "Confirm Cancellation",
    confirmMsg: "Are you sure you want to cancel this booking? This action cannot be undone.",
    yes: "Yes, Cancel",
    no: "Go Back",
    cancelling: "Cancelling...",
    cancelled: "Booking Cancelled",
    error: "Failed to cancel. Please try again.",
  },
  zh: {
    cancel: "取消预订",
    confirm: "确认取消",
    confirmMsg: "您确定要取消此预订吗？此操作无法撤销。",
    yes: "确认取消",
    no: "返回",
    cancelling: "正在取消...",
    cancelled: "预订已取消",
    error: "取消失败，请重试。",
  },
} as const;

type Props = {
  bookingId: string;
  status: string;
};

export default function CancelBookingButton({ bookingId, status }: Props) {
  const lang = useLang();
  const t = COPY[lang];

  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  // Chỉ hiển thị nút với booking pending hoặc confirmed
  if (!["pending", "confirmed"].includes(status) || done) {
    if (done) {
      return (
        <div className="mt-4 rounded-2xl border border-red-300/20 bg-red-500/10 px-5 py-4 text-center text-sm font-black text-red-200">
          {t.cancelled}
        </div>
      );
    }
    return null;
  }

  async function handleCancel() {
    setLoading(true);
    setError("");

    const result = await cancelBookingByCustomer(bookingId);

    if (result.success) {
      setDone(true);
      setShowConfirm(false);
      // Reload page để cập nhật status
      window.location.reload();
    } else {
      setError(result.message || t.error);
    }

    setLoading(false);
  }

  return (
    <div className="mt-4">
      {!showConfirm ? (
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="w-full rounded-2xl border border-red-400/30 bg-red-500/10 px-5 py-4 text-sm font-black text-red-200 transition hover:border-red-400/60 hover:bg-red-500/20"
        >
          {t.cancel}
        </button>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-red-400/30 bg-red-500/10">
          <div className="p-4">
            <p className="text-sm font-bold text-red-200 leading-6">
              {t.confirmMsg}
            </p>
          </div>

          {error && (
            <div className="border-t border-red-400/20 px-4 py-3 text-xs font-bold text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 border-t border-red-400/20">
            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              disabled={loading}
              className="border-r border-red-400/20 py-4 text-sm font-black text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
            >
              {t.no}
            </button>

            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="py-4 text-sm font-black text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
            >
              {loading ? t.cancelling : t.yes}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
