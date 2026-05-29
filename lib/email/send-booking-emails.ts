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
  restaurantAddress?: string | null;
  googleMapsUrl?: string | null;
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
  restaurantAddress?: string | null;
  googleMapsUrl?: string | null;
  bookingCode: string;
  bookingDate: string;
  bookingTime: string;
  guests?: number | null;
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

// ---------------------------------------------------------------------------
// i18n
// ---------------------------------------------------------------------------

const COPY = {
  en: {
    bookingCode: "Booking Code",
    customer: "Customer",
    restaurant: "Restaurant",
    address: "Address",
    guests: "Guests",
    date: "Date",
    time: "Time",
    phone: "Phone",
    whatsapp: "WhatsApp",
    totalBill: "Total Bill",
    customerDiscount: "Your 5% Discount",
    platformCommission: "Platform Commission",
    agentCommission: "Agent Commission",
    platformNet: "Platform Net",
    openMaps: "Open in Google Maps",
    memberBenefit: "Member Benefit",
    memberBenefitDesc:
      "This discount will be applied directly to your final bill at the restaurant, as part of Mvip Booking membership benefits.",
    viewBooking: "View My Booking →",
    viewDetails: "View Booking Details →",
    leaveReview: "Leave a Review →",
    bookAgain: "Book a New Table →",
    openDashboard: "Open Admin Dashboard →",
    // Created
    createdSubject: "Booking Received",
    createdEyebrow: "Booking Confirmation",
    createdTitle: "Reservation Received",
    createdSubtitle:
      "Your reservation has been submitted and is awaiting confirmation from the restaurant.",
    pendingBadge: "● Pending Confirmation",
    // Confirmed
    confirmedSubject: "Booking Confirmed",
    confirmedEyebrow: "Booking Confirmed",
    confirmedTitle: "Your Table is Reserved",
    confirmedSubtitle:
      "Great news! The restaurant has confirmed your reservation. We look forward to seeing you.",
    confirmedBadge: "✓ Confirmed",
    confirmedNote:
      "Your table has been officially confirmed. Please arrive on time and present your booking code at the restaurant to redeem your 5% member discount.",
    tag1: "5% Member Discount",
    tag2: "Show booking code",
    // Completed
    completedSubject: "Booking Completed",
    completedEyebrow: "Booking Completed",
    completedTitle: "Thank You for Dining",
    completedSubtitle:
      "We hope you had a wonderful experience. Your booking has been marked as completed.",
    completedBadge: "★ Completed",
    completedNote:
      "Thank you for using Mvip Booking. We hope to see you again soon. Your feedback helps us improve — feel free to leave a review on the restaurant page.",
    billSummary: "Bill Summary",
    thankYou: "Thank You",
    // Cancelled
    cancelledSubject: "Booking Cancelled",
    cancelledEyebrow: "Booking Cancelled",
    cancelledTitle: "Reservation Cancelled",
    cancelledSubtitle:
      "Your reservation has been cancelled. We hope to welcome you again soon.",
    cancelledBadge: "✕ Cancelled",
    cancellationReason: "Cancellation Reason",
    noReason: "No reason provided",
    // Internal
    supplierCopy: "Supplier Copy",
    adminCopy: "Admin Copy",
    agentCopy: "Agent Copy",
    internalSettlement: "Internal Notification",
    settlementTitle: "Booking Completed — Settlement",
    settlementSubtitle: "Full booking and financial breakdown for internal records.",
    newBookingTitle: "New Reservation Request",
    newBookingSubtitle:
      "A new booking request has been submitted and requires your review.",
    cancelledInternalTitle: "Booking Cancelled",
    cancelledInternalSubtitle: "A booking has been cancelled.",
    agentCommissionTitle: "Commission Recorded",
    agentCommissionSubtitle: "Your commission has been recorded successfully.",
    financialBreakdown: "Financial Breakdown",
    bookingDetails: "Booking Details",
  },
  zh: {
    bookingCode: "预订编号",
    customer: "顾客",
    restaurant: "餐厅",
    address: "地址",
    guests: "人数",
    date: "日期",
    time: "时间",
    phone: "电话",
    whatsapp: "WhatsApp",
    totalBill: "总账单",
    customerDiscount: "您的 5% 折扣",
    platformCommission: "平台佣金",
    agentCommission: "代理佣金",
    platformNet: "平台净收入",
    openMaps: "在 Google 地图中打开",
    memberBenefit: "会员优惠",
    memberBenefitDesc:
      "此折扣将根据 Mvip Booking 会员政策直接抵扣您在餐厅的最终账单。",
    viewBooking: "查看我的预订 →",
    viewDetails: "查看预订详情 →",
    leaveReview: "撰写评价 →",
    bookAgain: "重新预订 →",
    openDashboard: "打开管理后台 →",
    createdSubject: "已收到您的预订",
    createdEyebrow: "预订确认",
    createdTitle: "已收到预订申请",
    createdSubtitle: "您的预订申请已成功提交，餐厅将尽快确认。",
    pendingBadge: "● 等待确认",
    confirmedSubject: "预订已确认",
    confirmedEyebrow: "预订已确认",
    confirmedTitle: "您的座位已预留",
    confirmedSubtitle: "好消息！餐厅已确认您的预订，期待您的光临。",
    confirmedBadge: "✓ 已确认",
    confirmedNote:
      "您的座位已正式确认。请准时到达，并在餐厅出示预订编号以享受 5% 会员折扣。",
    tag1: "5% 会员折扣",
    tag2: "出示预订编号",
    completedSubject: "预订已完成",
    completedEyebrow: "预订已完成",
    completedTitle: "感谢您的光临",
    completedSubtitle: "希望您用餐愉快。您的预订已成功完成。",
    completedBadge: "★ 已完成",
    completedNote:
      "感谢您使用 Mvip Booking。期待再次为您服务。欢迎在餐厅页面留下您的评价。",
    billSummary: "账单摘要",
    thankYou: "感谢",
    cancelledSubject: "预订已取消",
    cancelledEyebrow: "预订已取消",
    cancelledTitle: "预订已取消",
    cancelledSubtitle: "您的预订已被取消，期待下次为您服务。",
    cancelledBadge: "✕ 已取消",
    cancellationReason: "取消原因",
    noReason: "未提供原因",
    supplierCopy: "供应商副本",
    adminCopy: "管理员副本",
    agentCopy: "代理副本",
    internalSettlement: "内部通知",
    settlementTitle: "预订已完成 — 结算",
    settlementSubtitle: "完整预订信息及财务明细，供内部记录使用。",
    newBookingTitle: "新预订申请",
    newBookingSubtitle: "收到新的预订申请，请查阅。",
    cancelledInternalTitle: "预订已取消",
    cancelledInternalSubtitle: "一笔预订已被取消。",
    agentCommissionTitle: "佣金已记录",
    agentCommissionSubtitle: "您的佣金已成功记录。",
    financialBreakdown: "财务明细",
    bookingDetails: "预订详情",
  },
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function lang(value?: PreferredLanguage | null): PreferredLanguage {
  return value === "zh" ? "zh" : "en";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function vnd(value?: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---------------------------------------------------------------------------
// HTML building blocks
// ---------------------------------------------------------------------------

function base(opts: {
  badge: string;
  badgeColor: "gold" | "green" | "purple" | "red" | "blue" | "orange";
  eyebrow: string;
  title: string;
  subtitle: string;
  body: string;
  ctaText: string;
  ctaUrl: string;
  ctaStyle?: "gold" | "dark";
}) {
  const badgeColors = {
    gold: "background:rgba(245,197,24,.15);color:#f5c518;border:1px solid rgba(245,197,24,.3)",
    green: "background:rgba(34,197,94,.12);color:#4ade80;border:1px solid rgba(34,197,94,.25)",
    purple: "background:rgba(99,102,241,.12);color:#a5b4fc;border:1px solid rgba(99,102,241,.25)",
    red: "background:rgba(239,68,68,.12);color:#fca5a5;border:1px solid rgba(239,68,68,.25)",
    blue: "background:rgba(14,165,233,.12);color:#7dd3fc;border:1px solid rgba(14,165,233,.25)",
    orange: "background:rgba(249,115,22,.12);color:#fdba74;border:1px solid rgba(249,115,22,.25)",
  };

  const ctaBackground =
    opts.ctaStyle === "dark"
      ? "background:linear-gradient(135deg,#374151,#1f2937);color:#e5e7eb"
      : "background:linear-gradient(135deg,#f5c518,#d4a017);color:#1a1000";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(opts.eyebrow)}</title>
</head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased">

<table width="100%" cellpadding="0" cellspacing="0" role="presentation">
<tr><td align="center" style="padding:40px 16px">

<table width="600" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;max-width:600px;background:#141414;border:1px solid #2a2a2a;border-radius:20px;overflow:hidden">

<!-- HEADER -->
<tr><td style="padding:36px 36px 28px;background:linear-gradient(135deg,rgba(60,35,0,.6) 0%,transparent 60%)">

  <!-- Logo -->
  <table cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:24px">
  <tr>
    <td style="width:36px;height:36px;background:linear-gradient(135deg,#f5c518,#d4a017);border-radius:10px;text-align:center;vertical-align:middle;font-size:18px;color:#1a1000;font-weight:900">&#9819;</td>
    <td style="padding-left:10px;color:#f5c518;font-size:13px;font-weight:700;letter-spacing:.5px;vertical-align:middle">MVIP BOOKING</td>
  </tr>
  </table>

  <!-- Badge -->
  <div style="display:inline-block;padding:5px 14px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:16px;${badgeColors[opts.badgeColor]}">${esc(opts.badge)}</div>

  <!-- Title block -->
  <div style="color:#f5c518;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:10px">${esc(opts.eyebrow)}</div>
  <h1 style="margin:0 0 10px;color:#ffffff;font-size:30px;font-weight:800;line-height:1.15">${opts.title}</h1>
  <p style="margin:0;color:#a3a3a3;font-size:14px;line-height:1.7">${esc(opts.subtitle)}</p>

</td></tr>

<!-- DIVIDER -->
<tr><td style="height:1px;background:#242424;font-size:0;line-height:0">&nbsp;</td></tr>

<!-- BODY -->
<tr><td style="padding:28px 36px;background:#141414">
${opts.body}

  <!-- CTA -->
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:4px">
  <tr><td>
    <a href="${opts.ctaUrl}" style="display:block;text-align:center;padding:15px 24px;border-radius:12px;font-size:14px;font-weight:800;text-decoration:none;letter-spacing:.3px;${ctaBackground}">${esc(opts.ctaText)}</a>
  </td></tr>
  </table>

</td></tr>

<!-- FOOTER -->
<tr><td style="padding:20px 36px;border-top:1px solid #1e1e1e;background:#0f0f0f">
  <p style="margin:0 0 6px;color:#4a4a4a;font-size:12px;font-weight:600">Mvip Booking &middot; Premium Reservation Platform</p>
  <p style="margin:0;color:#3a3a3a;font-size:11px">
    <a href="#" style="color:#3a3a3a;text-decoration:none;margin-right:16px">Unsubscribe</a>
    <a href="#" style="color:#3a3a3a;text-decoration:none">Privacy Policy</a>
  </p>
</td></tr>

</table>
</td></tr>
</table>

</body>
</html>`;
}

function sectionLabel(text: string) {
  return `<p style="margin:0 0 10px;color:#737373;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase">${esc(text)}</p>`;
}

function infoCard(rows: { label: string; value: string; highlight?: boolean }[]) {
  const rowsHtml = rows
    .map(
      (r, i) => `
<tr>
<td style="padding:12px 18px;color:#737373;font-size:13px;border-bottom:${i < rows.length - 1 ? "1px solid #222" : "none"};white-space:nowrap;width:140px">${esc(r.label)}</td>
<td style="padding:12px 18px;color:${r.highlight ? "#f5c518" : "#ffffff"};font-size:${r.highlight ? "12px" : "13px"};font-weight:700;text-align:right;border-bottom:${i < rows.length - 1 ? "1px solid #222" : "none"};font-family:${r.highlight ? "monospace,Courier New" : "Arial,Helvetica,sans-serif"};word-break:break-word">${esc(r.value)}</td>
</tr>`,
    )
    .join("");

  return `
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:14px;overflow:hidden;margin-bottom:14px;border-collapse:collapse">
${rowsHtml}
</table>`;
}

function mapsButton(label: string, url: string) {
  if (!url) return "";
  return `
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:14px">
<tr>
  <td style="background:#1a2a1a;border:1px solid #2d5a2d;border-radius:12px;padding:13px 18px">
    <table cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td style="width:22px;height:22px;background:#4ade80;border-radius:50%;text-align:center;vertical-align:middle;font-size:11px;color:#0a1f12;font-weight:900">&#9679;</td>
      <td style="padding-left:10px">
        <a href="${url}" style="color:#4ade80;font-size:13px;font-weight:700;text-decoration:none">${esc(label)}</a>
      </td>
    </tr>
    </table>
  </td>
</tr>
</table>`;
}

function memberBenefitBox(label: string, desc: string) {
  return `
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:14px">
<tr><td style="background:#1a1200;border:1px solid #3d2900;border-radius:14px;padding:18px">
  <p style="margin:0 0 6px;color:#f5c518;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase">${esc(label)}</p>
  <p style="margin:0 0 4px;color:#f5c518;font-size:28px;font-weight:800;line-height:1">5% OFF</p>
  <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.6">${esc(desc)}</p>
</td></tr>
</table>`;
}

function confirmedBox(note: string, tag1: string, tag2: string) {
  return `
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:14px">
<tr><td style="background:#0a1f12;border:1px solid #1a4d2a;border-radius:14px;padding:18px">
  <p style="margin:0 0 10px;color:#d1fae5;font-size:13px;line-height:1.7">${esc(note)}</p>
  <span style="display:inline-block;padding:3px 10px;border-radius:999px;font-size:10px;font-weight:700;background:rgba(74,222,128,.15);color:#4ade80;border:1px solid rgba(74,222,128,.25);margin-right:6px">${esc(tag1)}</span>
  <span style="display:inline-block;padding:3px 10px;border-radius:999px;font-size:10px;font-weight:700;background:rgba(74,222,128,.15);color:#4ade80;border:1px solid rgba(74,222,128,.25)">${esc(tag2)}</span>
</td></tr>
</table>`;
}

function thankYouBox(label: string, note: string) {
  return `
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:14px">
<tr><td style="background:#0a0f1f;border:1px solid #1a2a4d;border-radius:14px;padding:18px">
  <p style="margin:0 0 8px;color:#7dd3fc;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase">${esc(label)}</p>
  <p style="margin:0;color:#bae6fd;font-size:13px;line-height:1.7">${esc(note)}</p>
</td></tr>
</table>`;
}

function cancellationBox(label: string, reason: string) {
  return `
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:14px">
<tr><td style="background:#1a0a0a;border:1px solid #4d1a1a;border-radius:14px;padding:18px">
  <p style="margin:0 0 8px;color:#fca5a5;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase">${esc(label)}</p>
  <p style="margin:0;color:#fecaca;font-size:14px;line-height:1.7">${esc(reason)}</p>
</td></tr>
</table>`;
}

function financeCard(rows: { label: string; value: string; color?: "white" | "amber" | "green" | "red"; bold?: boolean }[]) {
  const colorMap = { white: "#ffffff", amber: "#f5c518", green: "#4ade80", red: "#fca5a5" };
  const rowsHtml = rows
    .map(
      (r, i) => `
<tr style="${r.bold ? "background:#1f1a00" : ""}">
<td style="padding:11px 18px;color:${r.bold ? (colorMap[r.color || "amber"]) : "#9ca3af"};font-size:13px;border-bottom:${i < rows.length - 1 ? "1px solid #1e1e1e" : "none"};font-weight:${r.bold ? "700" : "400"}">${esc(r.label)}</td>
<td style="padding:11px 18px;color:${colorMap[r.color || "white"]};font-size:13px;font-weight:700;text-align:right;border-bottom:${i < rows.length - 1 ? "1px solid #1e1e1e" : "none"}">${esc(r.value)}</td>
</tr>`,
    )
    .join("");

  return `
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:14px;overflow:hidden;margin-bottom:14px;border-collapse:collapse">
${rowsHtml}
</table>`;
}

async function sendMail(to: string | null | undefined, subject: string, html: string) {
  if (!to) return;
  await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
}

// ---------------------------------------------------------------------------
// BOOKING CREATED
// ---------------------------------------------------------------------------

export async function sendBookingCreatedEmails(payload: BookingCreatedPayload) {
  const l = lang(payload.customerLanguage);
  const t = COPY[l];
  const tEn = COPY.en;

  const guestsLabel = `${payload.guests} ${payload.guests === 1 ? "guest" : l === "zh" ? "位客人" : "guests"}`;

  const customerRows = [
    { label: t.bookingCode, value: payload.bookingCode, highlight: true },
    { label: t.customer, value: payload.customerName },
    { label: t.restaurant, value: payload.restaurantName },
    ...(payload.restaurantAddress ? [{ label: t.address, value: payload.restaurantAddress }] : []),
    { label: t.date, value: payload.bookingDate },
    { label: t.time, value: payload.bookingTime },
    { label: t.guests, value: guestsLabel },
    ...(payload.phone ? [{ label: t.phone, value: payload.phone }] : []),
    ...(payload.whatsapp ? [{ label: t.whatsapp, value: payload.whatsapp }] : []),
  ];

  const internalRows = [
    { label: tEn.bookingCode, value: payload.bookingCode, highlight: true },
    { label: tEn.customer, value: payload.customerName },
    { label: tEn.restaurant, value: payload.restaurantName },
    ...(payload.restaurantAddress ? [{ label: tEn.address, value: payload.restaurantAddress }] : []),
    { label: tEn.date, value: payload.bookingDate },
    { label: tEn.time, value: payload.bookingTime },
    { label: tEn.guests, value: `${payload.guests}` },
    ...(payload.phone ? [{ label: tEn.phone, value: payload.phone }] : []),
    ...(payload.whatsapp ? [{ label: tEn.whatsapp, value: payload.whatsapp }] : []),
  ];

  const customerBody = `
${sectionLabel(l === "zh" ? "预订详情" : "Booking details")}
${infoCard(customerRows)}
${mapsButton(t.openMaps, payload.googleMapsUrl || "")}
${memberBenefitBox(t.memberBenefit, t.memberBenefitDesc)}`;

  const internalBody = `
${sectionLabel("Booking details")}
${infoCard(internalRows)}
${mapsButton(tEn.openMaps, payload.googleMapsUrl || "")}`;

  if (payload.customerEmail) {
    await sendMail(
      payload.customerEmail,
      `${t.createdSubject} — ${payload.restaurantName}`,
      base({
        badge: t.pendingBadge,
        badgeColor: "gold",
        eyebrow: t.createdEyebrow,
        title: t.createdTitle,
        subtitle: t.createdSubtitle,
        body: customerBody,
        ctaText: t.viewBooking,
        ctaUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.mvipbooking.com"}/dashboard/customer`,
      }),
    );
    await sleep(SEND_DELAY_MS);
  }

  if (payload.supplierEmail) {
    await sendMail(
      payload.supplierEmail,
      `${tEn.supplierCopy} — New Booking — ${payload.bookingCode}`,
      base({
        badge: tEn.supplierCopy,
        badgeColor: "blue",
        eyebrow: tEn.internalSettlement,
        title: tEn.newBookingTitle,
        subtitle: tEn.newBookingSubtitle,
        body: internalBody,
        ctaText: tEn.openDashboard,
        ctaUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.mvipbooking.com"}/dashboard/supplier`,
        ctaStyle: "dark",
      }),
    );
    await sleep(SEND_DELAY_MS);
  }

  if (payload.adminEmail) {
    await sendMail(
      payload.adminEmail,
      `${tEn.adminCopy} — New Booking — ${payload.bookingCode}`,
      base({
        badge: tEn.adminCopy,
        badgeColor: "orange",
        eyebrow: tEn.internalSettlement,
        title: tEn.newBookingTitle,
        subtitle: tEn.newBookingSubtitle,
        body: internalBody,
        ctaText: tEn.openDashboard,
        ctaUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.mvipbooking.com"}/dashboard/admin`,
        ctaStyle: "dark",
      }),
    );
    await sleep(SEND_DELAY_MS);
  }
}

// ---------------------------------------------------------------------------
// BOOKING CONFIRMED
// ---------------------------------------------------------------------------

export async function sendBookingConfirmedEmail(payload: BookingConfirmedPayload) {
  if (!payload.customerEmail) return;

  const l = lang(payload.customerLanguage);
  const t = COPY[l];

  const guestsLabel = payload.guests
    ? `${payload.guests} ${l === "zh" ? "位客人" : payload.guests === 1 ? "guest" : "guests"}`
    : null;

  const rows = [
    { label: t.bookingCode, value: payload.bookingCode, highlight: true },
    { label: t.customer, value: payload.customerName },
    { label: t.restaurant, value: payload.restaurantName },
    ...(payload.restaurantAddress ? [{ label: t.address, value: payload.restaurantAddress }] : []),
    { label: t.date, value: payload.bookingDate },
    { label: t.time, value: payload.bookingTime },
    ...(guestsLabel ? [{ label: t.guests, value: guestsLabel }] : []),
  ];

  const body = `
${sectionLabel(l === "zh" ? "预订详情" : "Reservation details")}
${infoCard(rows)}
${mapsButton(t.openMaps, payload.googleMapsUrl || "")}
${confirmedBox(t.confirmedNote, t.tag1, t.tag2)}`;

  await sendMail(
    payload.customerEmail,
    `${t.confirmedSubject} — ${payload.restaurantName}`,
    base({
      badge: t.confirmedBadge,
      badgeColor: "green",
      eyebrow: t.confirmedEyebrow,
      title: t.confirmedTitle,
      subtitle: t.confirmedSubtitle,
      body,
      ctaText: t.viewDetails,
      ctaUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.mvipbooking.com"}/dashboard/customer`,
    }),
  );
}

// ---------------------------------------------------------------------------
// BOOKING COMPLETED
// ---------------------------------------------------------------------------

export async function sendBookingCompletedEmails(payload: BookingCompletedPayload) {
  const l = lang(payload.customerLanguage);
  const t = COPY[l];
  const tEn = COPY.en;

  const guestsLabel = payload.guests
    ? `${payload.guests} ${l === "zh" ? "位客人" : payload.guests === 1 ? "guest" : "guests"}`
    : null;

  const baseRows = [
    { label: t.bookingCode, value: payload.bookingCode, highlight: true },
    { label: t.restaurant, value: payload.restaurantName },
    { label: t.date, value: `${payload.bookingDate || "—"} · ${payload.bookingTime || "—"}` },
    ...(guestsLabel ? [{ label: t.guests, value: guestsLabel }] : []),
  ];

  const customerBody = `
${sectionLabel(l === "zh" ? "预订摘要" : "Summary")}
${infoCard(baseRows)}
${sectionLabel(l === "zh" ? t.billSummary : "Bill summary")}
${financeCard([
  { label: t.totalBill, value: vnd(payload.totalBill), color: "white", bold: true },
  { label: t.customerDiscount, value: `−${vnd(payload.customerDiscountAmount)}`, color: "amber" },
])}
${thankYouBox(t.thankYou, t.completedNote)}`;

  const internalBody = `
${sectionLabel("Booking details")}
${infoCard([
  { label: tEn.bookingCode, value: payload.bookingCode, highlight: true },
  { label: tEn.customer, value: payload.customerName },
  ...(payload.phone ? [{ label: tEn.phone, value: payload.phone }] : []),
  ...(payload.whatsapp ? [{ label: tEn.whatsapp, value: payload.whatsapp }] : []),
  { label: tEn.restaurant, value: payload.restaurantName },
  { label: tEn.date, value: `${payload.bookingDate || "—"} · ${payload.bookingTime || "—"}` },
  ...(payload.guests ? [{ label: tEn.guests, value: `${payload.guests}` }] : []),
])}
${sectionLabel("Financial breakdown")}
${financeCard([
  { label: tEn.totalBill, value: vnd(payload.totalBill), color: "amber", bold: true },
  { label: "Customer Discount (5%)", value: `−${vnd(payload.customerDiscountAmount)}`, color: "red" },
  { label: "Platform Commission (10%)", value: `+${vnd(payload.platformCommissionAmount)}`, color: "green" },
  { label: "Agent Commission (5%)", value: `+${vnd(payload.agentCommissionAmount)}`, color: "white" },
  { label: "Platform Net", value: vnd(payload.platformNetAmount), color: "green" },
])}`;

  if (payload.customerEmail) {
    await sendMail(
      payload.customerEmail,
      `${t.completedSubject} — ${payload.bookingCode}`,
      base({
        badge: t.completedBadge,
        badgeColor: "purple",
        eyebrow: t.completedEyebrow,
        title: t.completedTitle,
        subtitle: t.completedSubtitle,
        body: customerBody,
        ctaText: t.leaveReview,
        ctaUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.mvipbooking.com"}/dashboard/customer`,
      }),
    );
    await sleep(SEND_DELAY_MS);
  }

  if (payload.supplierEmail) {
    await sendMail(
      payload.supplierEmail,
      `${tEn.supplierCopy} — Booking Completed — ${payload.bookingCode}`,
      base({
        badge: tEn.supplierCopy,
        badgeColor: "blue",
        eyebrow: tEn.internalSettlement,
        title: tEn.settlementTitle,
        subtitle: tEn.settlementSubtitle,
        body: internalBody,
        ctaText: tEn.openDashboard,
        ctaUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.mvipbooking.com"}/dashboard/supplier`,
        ctaStyle: "dark",
      }),
    );
    await sleep(SEND_DELAY_MS);
  }

  if (payload.adminEmail || ADMIN_EMAIL) {
    await sendMail(
      payload.adminEmail || ADMIN_EMAIL,
      `${tEn.adminCopy} — Booking Completed — ${payload.bookingCode}`,
      base({
        badge: tEn.adminCopy,
        badgeColor: "orange",
        eyebrow: tEn.internalSettlement,
        title: tEn.settlementTitle,
        subtitle: tEn.settlementSubtitle,
        body: internalBody,
        ctaText: tEn.openDashboard,
        ctaUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.mvipbooking.com"}/dashboard/admin`,
        ctaStyle: "dark",
      }),
    );
    await sleep(SEND_DELAY_MS);
  }

  if (payload.agentEmail) {
    await sendMail(
      payload.agentEmail,
      `${tEn.agentCopy} — Commission — ${payload.bookingCode}`,
      base({
        badge: tEn.agentCopy,
        badgeColor: "orange",
        eyebrow: "Agent Commission",
        title: tEn.agentCommissionTitle,
        subtitle: tEn.agentCommissionSubtitle,
        body: `
${sectionLabel("Booking details")}
${infoCard([
  { label: tEn.bookingCode, value: payload.bookingCode, highlight: true },
  { label: tEn.restaurant, value: payload.restaurantName },
  { label: tEn.date, value: `${payload.bookingDate || "—"} · ${payload.bookingTime || "—"}` },
])}
${sectionLabel("Commission")}
${financeCard([
  { label: "Agent Commission (5%)", value: `+${vnd(payload.agentCommissionAmount)}`, color: "amber", bold: true },
])}`,
        ctaText: tEn.openDashboard,
        ctaUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.mvipbooking.com"}/dashboard/agent`,
        ctaStyle: "dark",
      }),
    );
    await sleep(SEND_DELAY_MS);
  }
}

// ---------------------------------------------------------------------------
// BOOKING CANCELLED
// ---------------------------------------------------------------------------

export async function sendBookingCancelledEmails(payload: BookingCancelledPayload) {
  const l = lang(payload.customerLanguage);
  const t = COPY[l];
  const tEn = COPY.en;

  const reason = payload.cancellationReason || t.noReason;
  const reasonEn = payload.cancellationReason || tEn.noReason;

  const customerBody = `
${sectionLabel(l === "zh" ? "已取消预订" : "Cancelled reservation")}
${infoCard([
  { label: t.bookingCode, value: payload.bookingCode, highlight: true },
  { label: t.customer, value: payload.customerName },
  { label: t.restaurant, value: payload.restaurantName },
  { label: t.date, value: `${payload.bookingDate || "—"} · ${payload.bookingTime || "—"}` },
])}
${cancellationBox(t.cancellationReason, reason)}`;

  const internalBody = `
${sectionLabel("Cancelled reservation")}
${infoCard([
  { label: tEn.bookingCode, value: payload.bookingCode, highlight: true },
  { label: tEn.customer, value: payload.customerName },
  { label: tEn.restaurant, value: payload.restaurantName },
  { label: tEn.date, value: `${payload.bookingDate || "—"} · ${payload.bookingTime || "—"}` },
])}
${cancellationBox("Cancellation Reason", reasonEn)}`;

  if (payload.customerEmail) {
    await sendMail(
      payload.customerEmail,
      `${t.cancelledSubject} — ${payload.bookingCode}`,
      base({
        badge: t.cancelledBadge,
        badgeColor: "red",
        eyebrow: t.cancelledEyebrow,
        title: t.cancelledTitle,
        subtitle: t.cancelledSubtitle,
        body: customerBody,
        ctaText: t.bookAgain,
        ctaUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.mvipbooking.com"}/restaurants`,
        ctaStyle: "dark",
      }),
    );
    await sleep(SEND_DELAY_MS);
  }

  if (payload.supplierEmail) {
    await sendMail(
      payload.supplierEmail,
      `${tEn.supplierCopy} — Booking Cancelled — ${payload.bookingCode}`,
      base({
        badge: tEn.supplierCopy,
        badgeColor: "blue",
        eyebrow: tEn.internalSettlement,
        title: tEn.cancelledInternalTitle,
        subtitle: tEn.cancelledInternalSubtitle,
        body: internalBody,
        ctaText: tEn.openDashboard,
        ctaUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.mvipbooking.com"}/dashboard/supplier`,
        ctaStyle: "dark",
      }),
    );
    await sleep(SEND_DELAY_MS);
  }

  if (payload.adminEmail || ADMIN_EMAIL) {
    await sendMail(
      payload.adminEmail || ADMIN_EMAIL,
      `${tEn.adminCopy} — Booking Cancelled — ${payload.bookingCode}`,
      base({
        badge: tEn.adminCopy,
        badgeColor: "orange",
        eyebrow: tEn.internalSettlement,
        title: tEn.cancelledInternalTitle,
        subtitle: tEn.cancelledInternalSubtitle,
        body: internalBody,
        ctaText: tEn.openDashboard,
        ctaUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.mvipbooking.com"}/dashboard/admin`,
        ctaStyle: "dark",
      }),
    );
    await sleep(SEND_DELAY_MS);
  }

  if (payload.agentEmail) {
    await sendMail(
      payload.agentEmail,
      `${tEn.agentCopy} — Booking Cancelled — ${payload.bookingCode}`,
      base({
        badge: tEn.agentCopy,
        badgeColor: "orange",
        eyebrow: tEn.internalSettlement,
        title: tEn.cancelledInternalTitle,
        subtitle: "A booking linked to your referral has been cancelled.",
        body: internalBody,
        ctaText: tEn.openDashboard,
        ctaUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.mvipbooking.com"}/dashboard/agent`,
        ctaStyle: "dark",
      }),
    );
    await sleep(SEND_DELAY_MS);
  }
}