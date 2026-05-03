import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL =
  process.env.BOOKING_FROM_EMAIL ||
  process.env.FROM_EMAIL ||
  "Mvip Booking <onboarding@resend.dev>";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";
const EMAIL_TEST_TO = process.env.EMAIL_TEST_TO || "";

const IS_DEV_REDIRECT =
  process.env.NODE_ENV !== "production" && Boolean(EMAIL_TEST_TO);

function getRecipients(to?: string | null) {
  if (!to) return [];
  if (IS_DEV_REDIRECT) return [EMAIL_TEST_TO];
  return [to];
}

function getSubject(subject: string, originalTo?: string | null) {
  if (IS_DEV_REDIRECT) {
    return `[DEV REDIRECT | original: ${originalTo || "empty"}] ${subject}`;
  }

  return subject;
}

function formatMoney(value: number | null | undefined) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function infoRow(label: string, value?: string | number | null) {
  return `
    <tr>
      <td style="padding:12px 0;color:#7c6f5a;font-size:13px;font-weight:700;border-bottom:1px solid #eee6d8;">
        ${escapeHtml(label)}
      </td>
      <td align="right" style="padding:12px 0;color:#15110b;font-size:13px;font-weight:900;border-bottom:1px solid #eee6d8;">
        ${escapeHtml(value || "-")}
      </td>
    </tr>
  `;
}

function moneyRow(label: string, value: number | null | undefined, tone = "#15110b") {
  return `
    <tr>
      <td style="padding:12px 0;color:#7c6f5a;font-size:13px;font-weight:700;border-bottom:1px solid #eee6d8;">
        ${escapeHtml(label)}
      </td>
      <td align="right" style="padding:12px 0;color:${tone};font-size:14px;font-weight:900;border-bottom:1px solid #eee6d8;">
        ${formatMoney(value)}
      </td>
    </tr>
  `;
}

function detailCard(rows: string) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border-collapse:collapse;background:#fffaf1;border:1px solid #eee0c8;border-radius:18px;overflow:hidden;">
      <tr>
        <td style="padding:20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            ${rows}
          </table>
        </td>
      </tr>
    </table>
  `;
}

function luxuryEmail({
  eyebrow,
  title,
  subtitle,
  badge,
  body,
  footerNote,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  badge?: string;
  body: string;
  footerNote?: string;
}) {
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(title)}</title>
      </head>

      <body style="margin:0;padding:0;background:#080704;font-family:Arial,Helvetica,sans-serif;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
          ${escapeHtml(subtitle)}
        </div>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#080704;padding:32px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;border-collapse:collapse;">
                <tr>
                  <td style="padding:1px;border-radius:30px;background:linear-gradient(135deg,#f7d58b,#6f4a13,#19110a);">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-radius:29px;overflow:hidden;background:#fffaf1;">
                      <tr>
                        <td style="background:linear-gradient(135deg,#100d09 0%,#1b1208 58%,#6f4a13 100%);padding:34px 28px;color:#ffffff;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td>
                                <div style="display:inline-block;background:#f6c85f;color:#15110b;border-radius:16px;width:48px;height:48px;line-height:48px;text-align:center;font-size:24px;font-weight:900;">
                                  ♛
                                </div>
                              </td>
                              <td align="right" style="vertical-align:top;">
                                ${
                                  badge
                                    ? `<span style="display:inline-block;border:1px solid rgba(246,200,95,.45);background:rgba(246,200,95,.12);color:#ffe7a6;border-radius:999px;padding:9px 13px;font-size:11px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;">${escapeHtml(
                                        badge,
                                      )}</span>`
                                    : ""
                                }
                              </td>
                            </tr>
                          </table>

                          <p style="margin:26px 0 0;color:#f6c85f;font-size:11px;font-weight:900;letter-spacing:.28em;text-transform:uppercase;">
                            ${escapeHtml(eyebrow)}
                          </p>

                          <h1 style="margin:10px 0 0;color:#ffffff;font-size:34px;line-height:1.08;font-weight:900;letter-spacing:-.03em;">
                            ${escapeHtml(title)}
                          </h1>

                          <p style="margin:14px 0 0;color:#d8c8ad;font-size:15px;line-height:1.7;">
                            ${escapeHtml(subtitle)}
                          </p>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding:30px 28px 26px;color:#15110b;">
                          ${body}
                        </td>
                      </tr>

                      <tr>
                        <td style="padding:22px 28px;background:#f3eadb;border-top:1px solid #eadcc5;">
                          <p style="margin:0;color:#7c6f5a;font-size:12px;line-height:1.6;">
                            ${escapeHtml(
                              footerNote ||
                                "This is an automated notification from Mvip Booking. Please do not reply directly to this email.",
                            )}
                          </p>

                          <p style="margin:12px 0 0;color:#15110b;font-size:12px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;">
                            Mvip Booking · Premium Booking Platform
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding:18px 8px 0;color:#6b6254;font-size:11px;">
                    © 2026 Mvip Booking. All rights reserved.
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

async function safeSendEmail(input: {
  to?: string | null;
  subject: string;
  html: string;
}) {
  const recipients = getRecipients(input.to);

  if (!recipients.length) {
    console.log("EMAIL_SKIPPED_NO_RECIPIENT:", input.subject);
    return;
  }

  const subject = getSubject(input.subject, input.to);

  console.log("EMAIL_SEND_DEBUG:", {
    originalTo: input.to,
    finalTo: recipients,
    subject,
    devRedirect: IS_DEV_REDIRECT,
  });

  const result = await resend.emails.send({
    from: FROM_EMAIL,
    to: recipients,
    subject,
    html: input.html,
  });

  if (result.error) {
    console.error("RESEND_SEND_ERROR:", result.error);
  } else {
    console.log("RESEND_SEND_SUCCESS:", result.data);
  }

  return result;
}

export async function sendBookingCreatedEmails(payload: {
  customerEmail?: string | null;
  customerName: string;
  supplierEmail?: string | null;
  adminEmail?: string | null;
  restaurantName: string;
  bookingCode: string;
  bookingDate: string;
  bookingTime: string;
  guests: number;
  phone?: string | null;
  whatsapp?: string | null;
}) {
  const rows =
    infoRow("Booking Code", payload.bookingCode) +
    infoRow("Restaurant", payload.restaurantName) +
    infoRow("Date", payload.bookingDate) +
    infoRow("Time", payload.bookingTime) +
    infoRow("Guests", payload.guests) +
    infoRow("Customer", payload.customerName) +
    infoRow("Phone", payload.phone || "-") +
    infoRow("WhatsApp", payload.whatsapp || "-");

  const commonCard = detailCard(rows);

  await Promise.allSettled([
    safeSendEmail({
      to: payload.customerEmail,
      subject: `Customer Copy - Booking Received - ${payload.restaurantName}`,
      html: luxuryEmail({
        eyebrow: "Reservation Request",
        title: "Booking Received",
        subtitle:
          "Your reservation request has been submitted. The restaurant will review and confirm your booking shortly.",
        badge: "Customer",
        body: `
          <p style="margin:0;color:#15110b;font-size:15px;line-height:1.8;">
            Hello <strong>${escapeHtml(payload.customerName)}</strong>,
          </p>
          <p style="margin:12px 0 0;color:#4b4033;font-size:15px;line-height:1.8;">
            Thank you for booking with Mvip Booking. Your request has been received successfully.
          </p>
          ${commonCard}
          <div style="margin-top:20px;background:#ecfdf5;border:1px solid #bbf7d0;border-radius:18px;padding:18px;">
            <p style="margin:0;color:#047857;font-size:14px;font-weight:900;">Customer Benefit</p>
            <p style="margin:6px 0 0;color:#065f46;font-size:24px;font-weight:900;">Instant 5% Discount</p>
            <p style="margin:8px 0 0;color:#047857;font-size:13px;line-height:1.7;">
              This discount will be applied directly to your bill according to Mvip Booking policy.
            </p>
          </div>
        `,
      }),
    }),

    safeSendEmail({
      to: payload.supplierEmail,
      subject: `Supplier Copy - New Booking Request - ${payload.bookingCode}`,
      html: luxuryEmail({
        eyebrow: "Supplier Notification",
        title: "New Booking Request",
        subtitle:
          "A customer has submitted a new reservation. Please review and update the booking status in your dashboard.",
        badge: "Supplier",
        body: `
          <p style="margin:0;color:#4b4033;font-size:15px;line-height:1.8;">
            A new customer booking request has been created for your restaurant.
          </p>
          ${commonCard}
        `,
      }),
    }),

    safeSendEmail({
      to: payload.adminEmail || ADMIN_EMAIL,
      subject: `Admin Copy - New Booking Created - ${payload.bookingCode}`,
      html: luxuryEmail({
        eyebrow: "Admin Notification",
        title: "New Booking Created",
        subtitle:
          "A new booking has been created on Mvip Booking and is now pending confirmation.",
        badge: "Admin",
        body: commonCard,
      }),
    }),
  ]);
}

export async function sendBookingConfirmedEmail(payload: {
  customerEmail?: string | null;
  customerName: string;
  restaurantName: string;
  bookingCode: string;
  bookingDate: string;
  bookingTime: string;
}) {
  const card = detailCard(
    infoRow("Booking Code", payload.bookingCode) +
      infoRow("Restaurant", payload.restaurantName) +
      infoRow("Date", payload.bookingDate) +
      infoRow("Time", payload.bookingTime),
  );

  await safeSendEmail({
    to: payload.customerEmail,
    subject: `Customer Copy - Booking Confirmed - ${payload.restaurantName}`,
    html: luxuryEmail({
      eyebrow: "Reservation Confirmed",
      title: "Booking Confirmed",
      subtitle: "Your reservation has been confirmed by the restaurant.",
      badge: "Confirmed",
      body: `
        <p style="margin:0;color:#15110b;font-size:15px;line-height:1.8;">
          Hello <strong>${escapeHtml(payload.customerName)}</strong>,
        </p>
        <p style="margin:12px 0 0;color:#4b4033;font-size:15px;line-height:1.8;">
          Your booking at <strong>${escapeHtml(payload.restaurantName)}</strong> is now confirmed.
        </p>
        ${card}
        <p style="margin:18px 0 0;color:#7c6f5a;font-size:13px;line-height:1.7;">
          Please show your booking code upon arrival if requested.
        </p>
      `,
    }),
  });
}

export async function sendBookingCompletedEmails(payload: {
  customerEmail?: string | null;
  supplierEmail?: string | null;
  adminEmail?: string | null;
  customerName: string;
  restaurantName: string;
  bookingCode: string;
  totalBill: number;
  customerDiscountAmount: number;
  platformCommissionAmount: number;
  agentCommissionAmount: number;
  platformNetAmount: number;
}) {
  const settlementCard = detailCard(
    infoRow("Booking Code", payload.bookingCode) +
      infoRow("Restaurant", payload.restaurantName) +
      moneyRow("Total Bill", payload.totalBill) +
      moneyRow("Customer Discount 5%", payload.customerDiscountAmount, "#047857") +
      moneyRow("Platform Commission 10%", payload.platformCommissionAmount) +
      moneyRow("Agent Payout 5%", payload.agentCommissionAmount) +
      moneyRow("Platform Net 5%", payload.platformNetAmount),
  );

  await Promise.allSettled([
    safeSendEmail({
      to: payload.customerEmail,
      subject: `Customer Copy - Booking Completed - ${payload.restaurantName}`,
      html: luxuryEmail({
        eyebrow: "Booking Completed",
        title: "Thank You",
        subtitle: "Your booking has been completed successfully.",
        badge: "Customer",
        body: `
          <p style="margin:0;color:#15110b;font-size:15px;line-height:1.8;">
            Hello <strong>${escapeHtml(payload.customerName)}</strong>,
          </p>
          <p style="margin:12px 0 0;color:#4b4033;font-size:15px;line-height:1.8;">
            Thank you for using Mvip Booking. Below is your completed booking summary.
          </p>
          ${settlementCard}
        `,
      }),
    }),

    safeSendEmail({
      to: payload.supplierEmail,
      subject: `Supplier Copy - Booking Completed - ${payload.bookingCode}`,
      html: luxuryEmail({
        eyebrow: "Supplier Settlement",
        title: "Booking Completed",
        subtitle: "A booking has been marked completed with payment details.",
        badge: "Supplier",
        body: settlementCard,
      }),
    }),

    safeSendEmail({
      to: payload.adminEmail || ADMIN_EMAIL,
      subject: `Admin Copy - Booking Completed - ${payload.bookingCode}`,
      html: luxuryEmail({
        eyebrow: "Admin Settlement",
        title: "Booking Completed",
        subtitle: "Commission and settlement details are ready for review.",
        badge: "Admin",
        body: settlementCard,
      }),
    }),
  ]);
}

export async function sendBookingCancelledEmails(payload: {
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
}) {
  const cancelCard = detailCard(
    infoRow("Booking Code", payload.bookingCode) +
      infoRow("Restaurant", payload.restaurantName) +
      infoRow("Date", payload.bookingDate || "-") +
      infoRow("Time", payload.bookingTime || "-") +
      infoRow("Reason", payload.cancellationReason || "-"),
  );

  await Promise.allSettled([
    safeSendEmail({
      to: payload.customerEmail,
      subject: `Customer Copy - Booking Cancelled - ${payload.restaurantName}`,
      html: luxuryEmail({
        eyebrow: "Reservation Update",
        title: "Booking Cancelled",
        subtitle: "Your confirmed booking has been cancelled.",
        badge: "Cancelled",
        body: `
          <p style="margin:0;color:#15110b;font-size:15px;line-height:1.8;">
            Hello <strong>${escapeHtml(payload.customerName)}</strong>,
          </p>
          <p style="margin:12px 0 0;color:#4b4033;font-size:15px;line-height:1.8;">
            Your booking at <strong>${escapeHtml(payload.restaurantName)}</strong> has been cancelled.
          </p>
          ${cancelCard}
        `,
      }),
    }),

    safeSendEmail({
      to: payload.supplierEmail,
      subject: `Supplier Copy - Booking Cancelled - ${payload.bookingCode}`,
      html: luxuryEmail({
        eyebrow: "Supplier Notification",
        title: "Booking Cancelled",
        subtitle: "A confirmed booking has been cancelled.",
        badge: "Supplier",
        body: cancelCard,
      }),
    }),

    safeSendEmail({
      to: payload.agentEmail,
      subject: `Agent Copy - Booking Cancelled - ${payload.bookingCode}`,
      html: luxuryEmail({
        eyebrow: "Agent Notification",
        title: "Booking Cancelled",
        subtitle: "A booking linked to your referral has been cancelled.",
        badge: "Agent",
        body: cancelCard,
      }),
    }),

    safeSendEmail({
      to: payload.adminEmail || ADMIN_EMAIL,
      subject: `Admin Copy - Booking Cancelled - ${payload.bookingCode}`,
      html: luxuryEmail({
        eyebrow: "Admin Notification",
        title: "Booking Cancelled",
        subtitle: "A confirmed booking has been cancelled.",
        badge: "Admin",
        body: cancelCard,
      }),
    }),
  ]);
}