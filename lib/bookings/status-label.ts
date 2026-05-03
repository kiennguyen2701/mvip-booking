export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

export function getBookingStatusLabel(status: string) {
  switch (status) {
    case "pending":
      return "Pending";
    case "confirmed":
      return "Confirmed";
    case "cancelled":
      return "Cancelled";
    case "completed":
      return "Completed";
    default:
      return status;
  }
}