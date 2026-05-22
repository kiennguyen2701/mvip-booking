import { memo } from "react";
import { getBookingStatusLabel } from "@/lib/bookings/status-label";

type StatusLogItem = {
  id: string;
  old_status: string | null;
  new_status: string;
  changed_by_role: string | null;
  note: string | null;
  created_at: string;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function TimelineComponent({ logs }: { logs: StatusLogItem[] }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-900">
          Lịch sử trạng thái
        </h3>

        <p className="text-xs text-gray-500">
          Timeline thay đổi booking
        </p>
      </div>

      {logs.length === 0 ? (
        <p className="text-sm text-gray-500">
          Chưa có log trạng thái.
        </p>
      ) : (
        <div className="space-y-3">
          {logs.map((log, index) => (
            <div key={log.id} className="flex gap-3">
              <div className="flex w-5 flex-col items-center pt-1">
                <span className="h-2.5 w-2.5 rounded-full bg-black" />

                {index < logs.length - 1 ? (
                  <span className="mt-1 h-full w-px bg-gray-200" />
                ) : null}
              </div>

              <div className="flex-1 rounded-xl bg-gray-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900">
                    {getBookingStatusLabel(log.new_status)}
                  </p>

                  <span className="text-xs text-gray-500">
                    {formatDateTime(log.created_at)}
                  </span>
                </div>

                {log.old_status ? (
                  <p className="mt-1 text-xs text-gray-500">
                    Từ{" "}
                    <span className="font-medium">
                      {getBookingStatusLabel(log.old_status)}
                    </span>
                  </p>
                ) : null}

                {log.changed_by_role ? (
                  <p className="mt-1 text-xs text-gray-500">
                    Bởi:{" "}
                    <span className="font-medium capitalize">
                      {log.changed_by_role}
                    </span>
                  </p>
                ) : null}

                {log.note ? (
                  <p className="mt-2 text-sm text-gray-700">
                    {log.note}
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const BookingStatusTimeline = memo(TimelineComponent);