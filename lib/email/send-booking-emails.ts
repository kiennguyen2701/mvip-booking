// lib/email/send-booking-emails.ts

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL =
  process.env.BOOKING_FROM_EMAIL ||
  "Mvip Booking <onboarding@resend.dev>";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";

type BookingCreatedPayload = {
  customerEmail?: string | null;
  supplierEmail?: string | null;
  adminEmail?: string | null;

  customerName: string;
  restaurantName: string;

  bookingCode: string;

  bookingDate: string;
  bookingTime: string;

  guests: number;

  phone?: string | null;
  whatsapp?: string | null;
};

type BookingConfirmedPayload = {
  customerEmail?: string | null;

  customerName: string;
  restaurantName: string;

  bookingCode: string;

  bookingDate: string;
  bookingTime: string;
};

type BookingCompletedPayload = {
  customerEmail?: string | null;
  supplierEmail?: string | null;
  agentEmail?: string | null;
  adminEmail?: string | null;

  customerName: string;
  restaurantName: string;

  bookingCode: string;

  totalBill?: number;

  customerDiscountAmount?: number;
  platformCommissionAmount?: number;
  agentCommissionAmount?: number;
  platformNetAmount?: number;
};

type BookingCancelledPayload = {
  customerEmail?: string | null;
  supplierEmail?: string | null;
  agentEmail?: string | null;
  adminEmail?: string | null;

  customerName: string;
  restaurantName: string;

  bookingCode: string;

  bookingDate?: string | null;
  bookingTime?: string | null;

  cancellationReason?: string | null;
};

function currency(value?: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function luxuryEmail({
  eyebrow,
  title,
  subtitle,
  badge,
  body,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  badge: string;
  body: string;
}) {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
</head>

<body style="
  margin:0;
  padding:0;
  background:#0a0a0a;
  font-family:Arial,sans-serif;
">

<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center" style="padding:40px 16px;">

<table width="620" cellpadding="0" cellspacing="0" style="
  width:100%;
  max-width:620px;
  background:#111111;
  border:1px solid #262626;
  border-radius:24px;
  overflow:hidden;
">

<tr>
<td style="
  padding:40px 32px;
  background:
    radial-gradient(circle at top left,#7c5200 0%,#111111 45%);
">

<div style="
  color:#facc15;
  font-size:12px;
  letter-spacing:3px;
  font-weight:700;
  text-transform:uppercase;
  margin-bottom:14px;
">
${eyebrow}
</div>

<h1 style="
  margin:0;
  color:white;
  font-size:36px;
  line-height:1.1;
  font-weight:800;
">
${title}
</h1>

<p style="
  margin:18px 0 0;
  color:#d4d4d4;
  font-size:15px;
  line-height:1.7;
">
${subtitle}
</p>

<div style="
  margin-top:24px;
  display:inline-block;
  padding:10px 18px;
  border-radius:999px;
  background:#facc15;
  color:#111111;
  font-weight:700;
  font-size:13px;
">
${badge}
</div>

</td>
</tr>

<tr>
<td style="
  padding:32px;
  background:#111111;
">
${body}
</td>
</tr>

<tr>
<td style="
  padding:24px 32px;
  border-top:1px solid #262626;
  color:#737373;
  font-size:12px;
  line-height:1.7;
  background:#0f0f0f;
">
Mvip Booking • Premium Reservation Platform
</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
`;
}

function bookingCard(payload: {
  bookingCode: string;
  customerName: string;
  restaurantName: string;
  bookingDate?: string | null;
  bookingTime?: string | null;
  guests?: number;
  phone?: string | null;
  whatsapp?: string | null;
}) {
  return `
<div style="
  border:1px solid #262626;
  border-radius:18px;
  overflow:hidden;
">

${cardRow("Booking Code", payload.bookingCode)}
${cardRow("Customer", payload.customerName)}
${cardRow("Restaurant", payload.restaurantName)}
${cardRow("Guests", String(payload.guests || 1))}
${cardRow("Date", payload.bookingDate || "-")}
${cardRow("Time", payload.bookingTime || "-")}
${cardRow("Phone", payload.phone || "-")}
${cardRow("WhatsApp", payload.whatsapp || "-")}

</div>
`;
}

function cardRow(label: string, value: string) {
  return `
<div style="
  display:flex;
  justify-content:space-between;
  gap:20px;
  padding:14px 18px;
  border-bottom:1px solid #262626;
">
<div style="
  color:#a3a3a3;
  font-size:14px;
">
${label}
</div>

<div style="
  color:white;
  font-size:14px;
  font-weight:700;
  text-align:right;
">
${value}
</div>
</div>
`;
}

async function sendMail({
  to,
  subject,
  html,
}: {
  to?: string | null;
  subject: string;
  html: string;
}) {
  if (!to) return;

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html,
  });
}

/**
 * =========================================================
 * BOOKING CREATED
 * =========================================================
 */

export async function sendBookingCreatedEmails(
  payload: BookingCreatedPayload,
) {
  const commonCard = bookingCard({
    bookingCode: payload.bookingCode,
    customerName: payload.customerName,
    restaurantName: payload.restaurantName,
    bookingDate: payload.bookingDate,
    bookingTime: payload.bookingTime,
    guests: payload.guests,
    phone: payload.phone,
    whatsapp: payload.whatsapp,
  });

  /**
   * CUSTOMER
   */
  if (payload.customerEmail) {
    await sendMail({
      to: payload.customerEmail,
      subject: `Booking Received - ${payload.restaurantName}`,
      html: luxuryEmail({
        eyebrow: "Booking Confirmation",
        title: "Reservation Received",
        subtitle:
          "Your reservation request has been successfully submitted and is currently pending confirmation.",
        badge: "Customer Copy",
        body: commonCard,
      }),
    });
  }

  /**
   * SUPPLIER
   */
  if (payload.supplierEmail) {
    await sendMail({
      to: payload.supplierEmail,
      subject: `Supplier Copy - New Booking Request - ${payload.bookingCode}`,
      html: luxuryEmail({
        eyebrow: "Supplier Notification",
        title: "New Reservation Request",
        subtitle:
          "A new booking request has been submitted and requires supplier review.",
        badge: "Supplier Copy",
        body: commonCard,
      }),
    });
  }

  /**
   * ADMIN
   */
  if (payload.adminEmail) {
    await sendMail({
      to: payload.adminEmail,
      subject: `Admin Copy - New Booking Created - ${payload.bookingCode}`,
      html: luxuryEmail({
        eyebrow: "Admin Notification",
        title: "New Booking Created",
        subtitle:
          "A new booking has been created on Mvip Booking and is now pending confirmation.",
        badge: "Admin Copy",
        body: commonCard,
      }),
    });
  }
}

/**
 * =========================================================
 * BOOKING CONFIRMED
 * =========================================================
 */

export async function sendBookingConfirmedEmail(
  payload: BookingConfirmedPayload,
) {
  if (!payload.customerEmail) return;

  await sendMail({
    to: payload.customerEmail,
    subject: `Booking Confirmed - ${payload.restaurantName}`,
    html: luxuryEmail({
      eyebrow: "Booking Confirmed",
      title: "Reservation Confirmed",
      subtitle:
        "Your reservation has officially been confirmed by the restaurant.",
      badge: "Confirmed",
      body: bookingCard({
        bookingCode: payload.bookingCode,
        customerName: payload.customerName,
        restaurantName: payload.restaurantName,
        bookingDate: payload.bookingDate,
        bookingTime: payload.bookingTime,
      }),
    }),
  });
}

/**
 * =========================================================
 * BOOKING COMPLETED
 * =========================================================
 */

export async function sendBookingCompletedEmails(
  payload: BookingCompletedPayload,
) {
  const body = `
${bookingCard({
  bookingCode: payload.bookingCode,
  customerName: payload.customerName,
  restaurantName: payload.restaurantName,
})}

<div style="height:20px"></div>

<div style="
  border:1px solid #262626;
  border-radius:18px;
  overflow:hidden;
">
${cardRow(
  "Total Bill",
  currency(payload.totalBill),
)}
${cardRow(
  "Customer Discount",
  currency(payload.customerDiscountAmount),
)}
${cardRow(
  "Platform Commission",
  currency(payload.platformCommissionAmount),
)}
${cardRow(
  "Agent Commission",
  currency(payload.agentCommissionAmount),
)}
${cardRow(
  "Platform Net",
  currency(payload.platformNetAmount),
)}
</div>
`;

  const recipients = [
    payload.customerEmail,
    payload.supplierEmail,
    payload.agentEmail,
    payload.adminEmail || ADMIN_EMAIL,
  ];

  const uniqueRecipients = [
    ...new Set(recipients.filter(Boolean)),
  ];

  await Promise.all(
    uniqueRecipients.map((email) =>
      sendMail({
        to: email,
        subject: `Booking Completed - ${payload.bookingCode}`,
        html: luxuryEmail({
          eyebrow: "Booking Completed",
          title: "Reservation Completed",
          subtitle:
            "The booking has been completed successfully.",
          badge: "Completed",
          body,
        }),
      }),
    ),
  );
}

/**
 * =========================================================
 * BOOKING CANCELLED
 * =========================================================
 */

export async function sendBookingCancelledEmails(
  payload: BookingCancelledPayload,
) {
  const body = `
${bookingCard({
  bookingCode: payload.bookingCode,
  customerName: payload.customerName,
  restaurantName: payload.restaurantName,
  bookingDate: payload.bookingDate,
  bookingTime: payload.bookingTime,
})}

<div style="
  margin-top:20px;
  padding:18px;
  border-radius:16px;
  background:#2b1111;
  border:1px solid #7f1d1d;
">

<div style="
  color:#fca5a5;
  font-size:12px;
  letter-spacing:2px;
  font-weight:700;
  text-transform:uppercase;
  margin-bottom:10px;
">
Cancellation Reason
</div>

<div style="
  color:white;
  font-size:14px;
  line-height:1.7;
">
${payload.cancellationReason || "No reason provided"}
</div>

</div>
`;

  const recipients = [
    payload.customerEmail,
    payload.supplierEmail,
    payload.agentEmail,
    payload.adminEmail || ADMIN_EMAIL,
  ];

  const uniqueRecipients = [
    ...new Set(recipients.filter(Boolean)),
  ];

  await Promise.all(
    uniqueRecipients.map((email) =>
      sendMail({
        to: email,
        subject: `Booking Cancelled - ${payload.bookingCode}`,
        html: luxuryEmail({
          eyebrow: "Booking Cancelled",
          title: "Reservation Cancelled",
          subtitle:
            "This reservation has been cancelled.",
          badge: "Cancelled",
          body,
        }),
      }),
    ),
  );
}