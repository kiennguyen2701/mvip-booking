// lib/email/send-booking-emails.ts

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL =
  process.env.BOOKING_FROM_EMAIL ||
  "Mvip Booking <onboarding@resend.dev>";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";
const SEND_DELAY_MS = 900;

type PreferredLanguage = "en" | "zh";

type BookingCreatedPayload = {
  customerEmail?: string | null;
  customerLanguage?: PreferredLanguage | null;
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
  customerLanguage?: PreferredLanguage | null;

  customerName: string;
  restaurantName: string;

  bookingCode: string;

  bookingDate: string;
  bookingTime: string;
};

type BookingCompletedPayload = {
  customerEmail?: string | null;
  customerLanguage?: PreferredLanguage | null;
  supplierEmail?: string | null;
  agentEmail?: string | null;
  adminEmail?: string | null;

  customerName: string;
  restaurantName: string;

  bookingCode: string;

  bookingDate?: string | null;
  bookingTime?: string | null;
  guests?: number | null;
  phone?: string | null;
  whatsapp?: string | null;

  totalBill?: number;

  customerDiscountAmount?: number;
  platformCommissionAmount?: number;
  agentCommissionAmount?: number;
  platformNetAmount?: number;
};

type BookingCancelledPayload = {
  customerEmail?: string | null;
  customerLanguage?: PreferredLanguage | null;
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

const EMAIL_COPY = {
  en: {
    bookingCode: "Booking Code",
    customer: "Customer",
    restaurant: "Restaurant",
    guests: "Guests",
    date: "Date",
    time: "Time",
    phone: "Phone",
    whatsapp: "WhatsApp",
    totalBill: "Total Bill",
    customerDiscount: "Customer Discount",
    bookingReceivedSubject: "Booking Received",
    bookingReceivedEyebrow: "Booking Confirmation",
    bookingReceivedTitle: "Reservation Received",
    bookingReceivedSubtitle:
      "Your reservation request has been successfully submitted and is currently pending confirmation.",
    customerCopy: "Customer Copy",
    bookingConfirmedSubject: "Booking Confirmed",
    bookingConfirmedEyebrow: "Booking Confirmed",
    bookingConfirmedTitle: "Reservation Confirmed",
    bookingConfirmedSubtitle:
      "Your reservation has officially been confirmed by the restaurant.",
    confirmedBadge: "Confirmed",
    bookingCompletedSubject: "Booking Completed",
    bookingCompletedEyebrow: "Booking Completed",
    bookingCompletedTitle: "Reservation Completed",
    bookingCompletedSubtitle:
      "Thank you for dining with us. Your booking has been completed successfully.",
    completedBadge: "Completed",
    completedNotice:
      "Thank you for using Mvip Booking. We hope you had a wonderful dining experience.",
    bookingCancelledSubject: "Booking Cancelled",
    bookingCancelledEyebrow: "Booking Cancelled",
    bookingCancelledTitle: "Reservation Cancelled",
    bookingCancelledSubtitle: "This reservation has been cancelled.",
    cancelledBadge: "Cancelled",
    cancellationReason: "Cancellation Reason",
    noReason: "No reason provided",
  },
  zh: {
    bookingCode: "预订编号",
    customer: "顾客",
    restaurant: "餐厅",
    guests: "人数",
    date: "日期",
    time: "时间",
    phone: "电话",
    whatsapp: "WhatsApp",
    totalBill: "总账单",
    customerDiscount: "顾客优惠",
    bookingReceivedSubject: "已收到您的预订",
    bookingReceivedEyebrow: "预订确认",
    bookingReceivedTitle: "已收到预订申请",
    bookingReceivedSubtitle: "您的预订申请已成功提交，餐厅将尽快确认。",
    customerCopy: "顾客副本",
    bookingConfirmedSubject: "预订已确认",
    bookingConfirmedEyebrow: "预订已确认",
    bookingConfirmedTitle: "您的预订已确认",
    bookingConfirmedSubtitle: "餐厅已正式确认您的预订。",
    confirmedBadge: "已确认",
    bookingCompletedSubject: "预订已完成",
    bookingCompletedEyebrow: "预订已完成",
    bookingCompletedTitle: "感谢您的光临",
    bookingCompletedSubtitle: "您的预订已成功完成。",
    completedBadge: "已完成",
    completedNotice: "感谢您使用 Mvip Booking。祝您拥有愉快的用餐体验。",
    bookingCancelledSubject: "预订已取消",
    bookingCancelledEyebrow: "预订已取消",
    bookingCancelledTitle: "您的预订已取消",
    bookingCancelledSubtitle: "此预订已被取消。",
    cancelledBadge: "已取消",
    cancellationReason: "取消原因",
    noReason: "未提供原因",
  },
} as const;

function normalizeLanguage(value?: PreferredLanguage | null): PreferredLanguage {
  return value === "zh" ? "zh" : "en";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
  guests?: number | null;
  phone?: string | null;
  whatsapp?: string | null;
  language?: PreferredLanguage | null;
}) {
  const t = EMAIL_COPY[normalizeLanguage(payload.language)];

  return `
<div style="
  border:1px solid #262626;
  border-radius:18px;
  overflow:hidden;
">

${cardRow(t.bookingCode, payload.bookingCode)}
${cardRow(t.customer, payload.customerName)}
${cardRow(t.restaurant, payload.restaurantName)}
${cardRow(t.guests, String(payload.guests || 1))}
${cardRow(t.date, payload.bookingDate || "-")}
${cardRow(t.time, payload.bookingTime || "-")}
${cardRow(t.phone, payload.phone || "-")}
${cardRow(t.whatsapp, payload.whatsapp || "-")}

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
  const customerLanguage = normalizeLanguage(payload.customerLanguage);
  const customerCopy = EMAIL_COPY[customerLanguage];

  const customerCard = bookingCard({
    bookingCode: payload.bookingCode,
    customerName: payload.customerName,
    restaurantName: payload.restaurantName,
    bookingDate: payload.bookingDate,
    bookingTime: payload.bookingTime,
    guests: payload.guests,
    phone: payload.phone,
    whatsapp: payload.whatsapp,
    language: customerLanguage,
  });

  const internalCard = bookingCard({
    bookingCode: payload.bookingCode,
    customerName: payload.customerName,
    restaurantName: payload.restaurantName,
    bookingDate: payload.bookingDate,
    bookingTime: payload.bookingTime,
    guests: payload.guests,
    phone: payload.phone,
    whatsapp: payload.whatsapp,
    language: "en",
  });

  if (payload.customerEmail) {
    await sendMail({
      to: payload.customerEmail,
      subject: `${customerCopy.bookingReceivedSubject} - ${payload.restaurantName}`,
      html: luxuryEmail({
        eyebrow: customerCopy.bookingReceivedEyebrow,
        title: customerCopy.bookingReceivedTitle,
        subtitle: customerCopy.bookingReceivedSubtitle,
        badge: customerCopy.customerCopy,
        body: customerCard,
      }),
    });

    await sleep(SEND_DELAY_MS);
  }

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
        body: internalCard,
      }),
    });

    await sleep(SEND_DELAY_MS);
  }

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
        body: internalCard,
      }),
    });

    await sleep(SEND_DELAY_MS);
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

  const customerLanguage = normalizeLanguage(payload.customerLanguage);
  const customerCopy = EMAIL_COPY[customerLanguage];

  await sendMail({
    to: payload.customerEmail,
    subject: `${customerCopy.bookingConfirmedSubject} - ${payload.restaurantName}`,
    html: luxuryEmail({
      eyebrow: customerCopy.bookingConfirmedEyebrow,
      title: customerCopy.bookingConfirmedTitle,
      subtitle: customerCopy.bookingConfirmedSubtitle,
      badge: customerCopy.confirmedBadge,
      body: bookingCard({
        bookingCode: payload.bookingCode,
        customerName: payload.customerName,
        restaurantName: payload.restaurantName,
        bookingDate: payload.bookingDate,
        bookingTime: payload.bookingTime,
        language: customerLanguage,
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
  const customerLanguage = normalizeLanguage(payload.customerLanguage);
  const customerCopy = EMAIL_COPY[customerLanguage];

  const customerBody = `
${bookingCard({
  bookingCode: payload.bookingCode,
  customerName: payload.customerName,
  restaurantName: payload.restaurantName,
  bookingDate: payload.bookingDate,
  bookingTime: payload.bookingTime,
  guests: payload.guests,
  phone: payload.phone,
  whatsapp: payload.whatsapp,
  language: customerLanguage,
})}

<div style="height:20px"></div>

<div style="
  border:1px solid #262626;
  border-radius:18px;
  overflow:hidden;
">
${cardRow(customerCopy.totalBill, currency(payload.totalBill))}
${cardRow(
  customerCopy.customerDiscount,
  currency(payload.customerDiscountAmount),
)}
</div>

<div style="
  margin-top:20px;
  padding:18px;
  border-radius:16px;
  background:#102313;
  border:1px solid #166534;
">
<div style="
  color:#bbf7d0;
  font-size:14px;
  line-height:1.7;
  font-weight:600;
">
${customerCopy.completedNotice}
</div>
</div>
`;

  const internalBody = `
${bookingCard({
  bookingCode: payload.bookingCode,
  customerName: payload.customerName,
  restaurantName: payload.restaurantName,
  bookingDate: payload.bookingDate,
  bookingTime: payload.bookingTime,
  guests: payload.guests,
  phone: payload.phone,
  whatsapp: payload.whatsapp,
  language: "en",
})}

<div style="height:20px"></div>

<div style="
  border:1px solid #262626;
  border-radius:18px;
  overflow:hidden;
">
${cardRow("Total Bill", currency(payload.totalBill))}
${cardRow("Customer Discount", currency(payload.customerDiscountAmount))}
${cardRow("Platform Commission", currency(payload.platformCommissionAmount))}
${cardRow("Agent Commission", currency(payload.agentCommissionAmount))}
${cardRow("Platform Net", currency(payload.platformNetAmount))}
</div>
`;

  if (payload.customerEmail) {
    await sendMail({
      to: payload.customerEmail,
      subject: `${customerCopy.bookingCompletedSubject} - ${payload.bookingCode}`,
      html: luxuryEmail({
        eyebrow: customerCopy.bookingCompletedEyebrow,
        title: customerCopy.bookingCompletedTitle,
        subtitle: customerCopy.bookingCompletedSubtitle,
        badge: customerCopy.completedBadge,
        body: customerBody,
      }),
    });

    await sleep(SEND_DELAY_MS);
  }

  if (payload.supplierEmail) {
    await sendMail({
      to: payload.supplierEmail,
      subject: `Supplier Copy - Booking Completed - ${payload.bookingCode}`,
      html: luxuryEmail({
        eyebrow: "Supplier Settlement",
        title: "Booking Completed",
        subtitle: "Settlement details are ready for supplier review.",
        badge: "Supplier Copy",
        body: internalBody,
      }),
    });

    await sleep(SEND_DELAY_MS);
  }

  if (payload.adminEmail || ADMIN_EMAIL) {
    await sendMail({
      to: payload.adminEmail || ADMIN_EMAIL,
      subject: `Admin Copy - Booking Completed - ${payload.bookingCode}`,
      html: luxuryEmail({
        eyebrow: "Admin Settlement",
        title: "Booking Completed",
        subtitle: "Commission and settlement details are ready for review.",
        badge: "Admin Copy",
        body: internalBody,
      }),
    });

    await sleep(SEND_DELAY_MS);
  }

  if (payload.agentEmail) {
    await sendMail({
      to: payload.agentEmail,
      subject: `Agent Commission - ${payload.bookingCode}`,
      html: luxuryEmail({
        eyebrow: "Agent Commission",
        title: "Commission Recorded",
        subtitle: "Your commission has been recorded successfully.",
        badge: "Agent Copy",
        body: `
${bookingCard({
  bookingCode: payload.bookingCode,
  customerName: payload.customerName,
  restaurantName: payload.restaurantName,
  bookingDate: payload.bookingDate,
  bookingTime: payload.bookingTime,
  guests: payload.guests,
  phone: payload.phone,
  whatsapp: payload.whatsapp,
  language: "en",
})}

<div style="height:20px"></div>

<div style="
  border:1px solid #262626;
  border-radius:18px;
  overflow:hidden;
">
${cardRow("Agent Commission", currency(payload.agentCommissionAmount))}
</div>
`,
      }),
    });

    await sleep(SEND_DELAY_MS);
  }
}

/**
 * =========================================================
 * BOOKING CANCELLED
 * =========================================================
 */

export async function sendBookingCancelledEmails(
  payload: BookingCancelledPayload,
) {
  const customerLanguage = normalizeLanguage(payload.customerLanguage);
  const customerCopy = EMAIL_COPY[customerLanguage];

  const customerBody = `
${bookingCard({
  bookingCode: payload.bookingCode,
  customerName: payload.customerName,
  restaurantName: payload.restaurantName,
  bookingDate: payload.bookingDate,
  bookingTime: payload.bookingTime,
  language: customerLanguage,
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
${customerCopy.cancellationReason}
</div>

<div style="
  color:white;
  font-size:14px;
  line-height:1.7;
">
${payload.cancellationReason || customerCopy.noReason}
</div>

</div>
`;

  const internalBody = `
${bookingCard({
  bookingCode: payload.bookingCode,
  customerName: payload.customerName,
  restaurantName: payload.restaurantName,
  bookingDate: payload.bookingDate,
  bookingTime: payload.bookingTime,
  language: "en",
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

  if (payload.customerEmail) {
    await sendMail({
      to: payload.customerEmail,
      subject: `${customerCopy.bookingCancelledSubject} - ${payload.bookingCode}`,
      html: luxuryEmail({
        eyebrow: customerCopy.bookingCancelledEyebrow,
        title: customerCopy.bookingCancelledTitle,
        subtitle: customerCopy.bookingCancelledSubtitle,
        badge: customerCopy.cancelledBadge,
        body: customerBody,
      }),
    });

    await sleep(SEND_DELAY_MS);
  }

  if (payload.supplierEmail) {
    await sendMail({
      to: payload.supplierEmail,
      subject: `Supplier Copy - Booking Cancelled - ${payload.bookingCode}`,
      html: luxuryEmail({
        eyebrow: "Supplier Notification",
        title: "Booking Cancelled",
        subtitle: "A booking has been cancelled.",
        badge: "Supplier Copy",
        body: internalBody,
      }),
    });

    await sleep(SEND_DELAY_MS);
  }

  if (payload.adminEmail || ADMIN_EMAIL) {
    await sendMail({
      to: payload.adminEmail || ADMIN_EMAIL,
      subject: `Admin Copy - Booking Cancelled - ${payload.bookingCode}`,
      html: luxuryEmail({
        eyebrow: "Admin Notification",
        title: "Booking Cancelled",
        subtitle: "A booking has been cancelled.",
        badge: "Admin Copy",
        body: internalBody,
      }),
    });

    await sleep(SEND_DELAY_MS);
  }

  if (payload.agentEmail) {
    await sendMail({
      to: payload.agentEmail,
      subject: `Agent Copy - Booking Cancelled - ${payload.bookingCode}`,
      html: luxuryEmail({
        eyebrow: "Agent Notification",
        title: "Booking Cancelled",
        subtitle: "A booking linked to your referral has been cancelled.",
        badge: "Agent Copy",
        body: internalBody,
      }),
    });

    await sleep(SEND_DELAY_MS);
  }
}
