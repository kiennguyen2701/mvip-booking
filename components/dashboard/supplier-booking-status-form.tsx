"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  updateSupplierBookingStatus,
  type SupplierActionState,
} from "@/app/dashboard/supplier/actions";

type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

type SupplierBookingStatusFormProps = {
  booking: {
    id: string;
    status: BookingStatus;
    total_bill: number | null;
    supplier_note: string | null;
    cancellation_reason: string | null;
  };
};

const initialState: SupplierActionState = {
  success: false,
  message: "",
};

export function SupplierBookingStatusForm({
  booking,
}: SupplierBookingStatusFormProps) {
  const [state, formAction, pending] = useActionState(
    updateSupplierBookingStatus,
    initialState,
  );

  const [status, setStatus] = useState<BookingStatus>(booking.status);
  const [totalBill, setTotalBill] = useState(String(booking.total_bill ?? 0));

  useEffect(() => {
    setStatus(booking.status);
    setTotalBill(String(booking.total_bill ?? 0));
  }, [booking.id, booking.status, booking.total_bill]);

  const showTotalBill = useMemo(
    () => status === "confirmed" || status === "completed",
    [status],
  );

  const showCancelReason = status === "cancelled";

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-4"
    >
      <input type="hidden" name="bookingId" value={booking.id} />

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Trạng thái
          </label>
          <select
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as BookingStatus)}
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none"
          >
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Ghi chú supplier
          </label>
          <input
            name="supplierNote"
            defaultValue={booking.supplier_note ?? ""}
            placeholder="Nhập ghi chú..."
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none"
          />
        </div>
      </div>

      {showTotalBill ? (
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Tổng bill thực tế
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            name="totalBill"
            value={totalBill}
            onChange={(e) => setTotalBill(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none"
          />
          <p className="mt-1 text-xs text-gray-500">
            Hệ thống sẽ tự tính: 5% customer off và Agent + Platform 10%.
          </p>
        </div>
      ) : (
        <input type="hidden" name="totalBill" value="0" />
      )}

      {showCancelReason ? (
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Lý do hủy
          </label>
          <input
            name="cancellationReason"
            defaultValue={booking.cancellation_reason ?? ""}
            placeholder="Nhập lý do hủy..."
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none"
          />
        </div>
      ) : (
        <input type="hidden" name="cancellationReason" value="" />
      )}

      {state.message ? (
        <p
          className={`text-sm ${
            state.success ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Đang cập nhật..." : "Cập nhật booking"}
      </button>
    </form>
  );
}