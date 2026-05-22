"use client";

import { memo, useActionState, useEffect, useMemo, useState } from "react";
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

function SupplierBookingStatusFormComponent({
  booking,
}: SupplierBookingStatusFormProps) {
  const [state, formAction, pending] = useActionState(
    updateSupplierBookingStatus,
    initialState,
  );

  const [status, setStatus] = useState<BookingStatus>(booking.status);

  const [totalBill, setTotalBill] = useState(
    String(booking.total_bill ?? 0),
  );

  useEffect(() => {
    setStatus(booking.status);
    setTotalBill(String(booking.total_bill ?? 0));
  }, [booking.id, booking.status, booking.total_bill]);

  const showTotalBill = useMemo(() => {
    return status === "confirmed" || status === "completed";
  }, [status]);

  const showCancelReason = useMemo(() => {
    return status === "cancelled";
  }, [status]);

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-4"
    >
      <input type="hidden" name="bookingId" value={booking.id} />

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">
            Status
          </label>

          <select
            name="status"
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as BookingStatus)
            }
            disabled={pending}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-black"
          >
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {showTotalBill ? (
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">
              Total Bill
            </label>

            <input
              type="number"
              inputMode="numeric"
              name="total_bill"
              value={totalBill}
              onChange={(e) => setTotalBill(e.target.value)}
              disabled={pending}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-black"
            />
          </div>
        ) : null}
      </div>

      {showCancelReason ? (
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">
            Cancellation Reason
          </label>

          <textarea
            name="cancellation_reason"
            defaultValue={booking.cancellation_reason ?? ""}
            rows={3}
            disabled={pending}
            className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-black"
          />
        </div>
      ) : null}

      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-500">
          Supplier Note
        </label>

        <textarea
          name="supplier_note"
          defaultValue={booking.supplier_note ?? ""}
          rows={3}
          disabled={pending}
          className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-black"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Updating..." : "Update Booking"}
      </button>

      {state.message ? (
        <div
          className={`rounded-xl px-3 py-2 text-sm ${
            state.success
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {state.message}
        </div>
      ) : null}
    </form>
  );
}

export const SupplierBookingStatusForm = memo(
  SupplierBookingStatusFormComponent,
);