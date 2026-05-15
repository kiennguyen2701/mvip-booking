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

const SEND_DELAY_MS = 1200;
const RETRY_DELAY_MS = 2500;
const MAX_SEND_ATTEMPTS = 5;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
      <td style="padding:14px 0;color:#7a6a55;font-size:14px;font-weight:700;border-bottom:1px solid #eadfce;">
        ${escapeHtml(label)}
      </td>
      <td align="right" style="padding:14px 0;color:#17120b;font-size:14px;font-weight:900;border-bottom:1px solid #eadfce;">
        ${escapeHtml(value || "-")}
      </td>
    </tr>
  `;
}

function moneyRow(
  label: string,
  value: number | null | undefined,
  tone = "#17120b",
) {
  return `
    <tr>
      <td style="padding:14px 0;color:#7a6a55;font-size:14px;font-weight:700;border-bottom:1px solid #eadfce;">
        ${escapeHtml(label)}
      </td>
      <td align="right" style="padding:14px 0;color:${tone};font-size:15px;font-weight:900;border-bottom:1px solid #eadfce;">
        ${formatMoney(value)}
      </td>
    </tr>
  `;
}

function detailCard(rows: string) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;border-collapse:separate;border-spacing:0;background:#fffdf8;border:1px solid #eadfce;border-radius:20px;overflow:hidden;">
      <tr>
        <td style="padding:22px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            ${rows}
          </table>
        </td>
      </tr>
    </table>
  `;
}

function premiumNotice({
  title,
  value,
  description,
  color = "#166534",
  background = "#ecfdf3",
  border = "#bbf7d0",
}: {
  title: string;
  value: string;
  description: string;
  color?: string;
  background?: string;
  border?: string;
}) {
  return `
    <div style="margin-top:22px;background:${background};border:1px solid ${border};border-radius:18px;padding:18px 20px;">
      <p style="margin:0;color:${color};font-size:13px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;">
        ${escapeHtml(title)}
      </p>
      <p style="margin:7px 0 0;color:${color};font-size:24px;line-height:1.1;font-weight:900;">
        ${escapeHtml(value)}
      </p>
      <p style="margin:9px 0 0;color:${color};font-size:13px;line-height:1.7;">
        ${escapeHtml(description)}
      </p>
    </div>
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
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <title>${escapeHtml(title)}</title>
      </head>

      <body style="margin:0;padding:0;background:#f4efe6;font-family:Arial,Helvetica,sans-serif;color:#17120b;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
          ${escapeHtml(subtitle)}
        </div>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4efe6;padding:24px 10px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;border-collapse:collapse;">
                <tr>
                  <td style="padding:0;border-radius:28px;background:#ffffff;border:1px solid #e6d8c3;box-shadow:0 18px 50px rgba(72,50,20,.14);overflow:hidden;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#ffffff;">
                      <tr>
                        <td style="background:#fff8ea;padding:28px 26px 24px;border-bottom:1px solid #eadfce;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="vertical-align:top;">
                                <div style="display:inline-block;background:linear-gradient(135deg,#ffd95a,#c99116);color:#17120b;border-radius:18px;width:54px;height:54px;line-height:54px;text-align:center;font-size:25px;font-weight:900;">
                                  ♛
                                </div>
                              </td>
                              <td align="right" style="vertical-align:top;">
                                ${
                                  badge
                                    ? `<span style="display:inline-block;border:1px solid #e0bd62;background:#fff3c4;color:#7a4a00;border-radius:999px;padding:9px 14px;font-size:11px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;">${escapeHtml(
                                        badge,
                                      )}</span>`
                                    : ""
                                }
                              </td>
                            </tr>
                          </table>

                          <p style="margin:24px 0 0;color:#b07a00;font-size:12px;font-weight:900;letter-spacing:.24em;text-transform:uppercase;">
                            ${escapeHtml(eyebrow)}
                          </p>

                          <h1 style="margin:10px 0 0;color:#17120b;font-size:34px;line-height:1.08;font-weight:900;letter-spacing:-.03em;">
                            ${escapeHtml(title)}
                          </h1>

                          <p style="margin:14px 0 0;color:#5f5446;font-size:16px;line-height:1.7;font-weight:600;">
                            ${escapeHtml(subtitle)}
                          </p>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding:28px 26px 28px;color:#17120b;background:#ffffff;">
                          ${body}
                        </td>
                      </tr>

                      <tr>
                        <td style="padding:22px 26px;background:#fbf7ef;border-top:1px solid #eadfce;">
                          <p style="margin:0;color:#6f6253;font-size:12px;line-height:1.6;">
                            ${escapeHtml(
                              footerNote ||
                                "This is an automated notification from Mvip Booking. Please do not reply directly to this email.",
                            )}
                          </p>

                          <p style="margin:13px 0 0;color:#17120b;font-size:12px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;">
                            Mvip Booking · Premium Booking Platform
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding:18px 8px 0;color:#8a7d6c;font-size:11px;line-height:1.6;">
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

function getErrorStatus(error: unknown) {
  if (typeof error === "object" && error !== null && "statusCode" in error) {
    return Number((error as { statusCode?: number }).statusCode);
  }

  if (typeof error === "object" && error !== null && "status" in error) {
    return Number((error as { status?: number }).status);
  }

  return null;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message?: unknown }).message || "");
  }

  return String(error || "Unknown email error");
}

async function safeSendEmail(input: {
  to?: string | null;
  subject: string;
  html: string;
}) {
  const recipients = getRecipients(input.to);

  if (!recipients.length) {
    console.log("EMAIL_SKIPPED_NO_RECIPIENT:", input.subject);
    return null;
  }

  const subject = getSubject(input.subject, input.to);

  for (let attempt = 1; attempt <= MAX_SEND_ATTEMPTS; attempt += 1) {
    try {
      const result = await resend.emails.send({
        from: FROM_EMAIL,
        to: recipients,
        subject,
        html: input.html,
      });

      if (!result.error) {
        console.log("RESEND_SEND_SUCCESS:", {
          to: recipients,
          subject,
          data: result.data,
        });

        return result;
      }

      const status = getErrorStatus(result.error);
      const message = getErrorMessage(result.error);

      console.error("RESEND_SEND_ERROR:", {
        to: recipients,
        subject,
        attempt,
        status,
        message,
        error: result.error,
      });

      if (status === 429 && attempt < MAX_SEND_ATTEMPTS) {
        await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }

      throw new Error(`Resend failed for ${recipients.join(", ")}: ${message}`);
    } catch (error) {
      const status = getErrorStatus(error);
      const message = getErrorMessage(error);

      console.error("EMAIL_SEND_FATAL:", {
        to: recipients,
        subject,
        attempt,
        status,
        message,
        error,
      });

      if (attempt < MAX_SEND_ATTEMPTS) {
        await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }

      throw error;
    }
  }

  return null;
}

async function sendSequentially(
  items: Array<{
    to?: string | null;
    subject: string;
    html: string;
  }>,
) {
  for (const item of items) {
    await safeSendEmail(item);
    await sleep(SEND_DELAY_MS);
  }
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

  await sendSequentially([
    {
      to: payload.customerEmail,
      subject: `Customer Copy - Booking Received - ${payload.restaurantName}`,
      html: luxuryEmail({
        eyebrow: "Reservation Request",
        title: "Booking Received",
        subtitle:
          "Your reservation request has been submitted. The restaurant will review and confirm your booking shortly.",
        badge: "Customer",
        body: `
          <p style="margin:0;color:#17120b;font-size:15px;line-height:1.8;">
            Hello <strong>${escapeHtml(payload.customerName)}</strong>,
          </p>
          <p style="margin:12px 0 0;color:#4f4538;font-size:15px;line-height:1.8;">
            Thank you for booking with Mvip Booking. Your request has been received successfully.
          </p>
          ${commonCard}
          ${premiumNotice({
            title: "Customer Benefit",
            value: "Instant 5% Discount",
            description:
              "This discount will be applied directly to your bill according to Mvip Booking policy.",
          })}
        `,
      }),
    },
    {
      to: payload.supplierEmail,
      subject: `Supplier Copy - New Booking Request - ${payload.bookingCode}`,
      html: luxuryEmail({
        eyebrow: "Supplier Notification",
        title: "New Booking Request",
        subtitle:
          "A customer has submitted a new reservation. Please review and update the booking status in your dashboard.",
        badge: "Supplier",
        body: `
          <p style="margin:0;color:#4f4538;font-size:15px;line-height:1.8;">
            A new customer booking request has been created for your restaurant.
          </p>
          ${commonCard}
          ${premiumNotice({
            title: "Action Required",
            value: "Pending Confirmation",
            description:
              "Please confirm or update this booking from your supplier dashboard.",
            color: "#92400e",
            background: "#fffbeb",
            border: "#fde68a",
          })}
        `,
      }),
    },
    {
      to: payload.adminEmail,
      subject: `Admin Copy - New Booking Created - ${payload.bookingCode}`,
      html: luxuryEmail({
        eyebrow: "Admin Notification",
        title: "New Booking Created",
        subtitle:
          "A new booking has been created on Mvip Booking and is now pending confirmation.",
        badge: "Admin",
        body: `
          ${commonCard}
          ${premiumNotice({
            title: "System Status",
            value: "Pending Confirmation",
            description:
              "The supplier should review and confirm this reservation request.",
            color: "#92400e",
            background: "#fffbeb",
            border: "#fde68a",
          })}
        `,
      }),
    },
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
        <p style="margin:0;color:#17120b;font-size:15px;line-height:1.8;">
          Hello <strong>${escapeHtml(payload.customerName)}</strong>,
        </p>
        <p style="margin:12px 0 0;color:#4f4538;font-size:15px;line-height:1.8;">
          Your booking at <strong>${escapeHtml(payload.restaurantName)}</strong> is now confirmed.
        </p>
        ${card}
        ${premiumNotice({
          title: "Please Note",
          value: "Show Your Booking Code",
          description:
            "Please show your booking code upon arrival if requested by the restaurant.",
          color: "#1d4ed8",
          background: "#eff6ff",
          border: "#bfdbfe",
        })}
      `,
    }),
  });
}

export async function sendBookingCompletedEmails(payload: {
  customerEmail?: string | null;
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
  totalBill: number;
  customerDiscountAmount: number;
  platformCommissionAmount: number;
  agentCommissionAmount: number;
  platformNetAmount: number;
}) {
  const baseRows =
    infoRow("Booking Code", payload.bookingCode) +
    infoRow("Restaurant", payload.restaurantName) +
    infoRow("Date", payload.bookingDate || "-") +
    infoRow("Time", payload.bookingTime || "-") +
    infoRow("Guests", payload.guests || "-") +
    infoRow("Customer", payload.customerName) +
    infoRow("Phone", payload.phone || "-") +
    infoRow("WhatsApp", payload.whatsapp || "-");

  const customerCard = detailCard(
    baseRows +
      moneyRow("Total Bill", payload.totalBill) +
      moneyRow("Customer Discount 5%", payload.customerDiscountAmount, "#047857"),
  );

  const supplierCard = detailCard(
    baseRows +
      moneyRow("Total Bill", payload.totalBill) +
      moneyRow("Customer Discount 5%", payload.customerDiscountAmount, "#047857") +
      moneyRow("Platform Commission 10%", payload.platformCommissionAmount),
  );

  const adminCard = detailCard(
    baseRows +
      moneyRow("Total Bill", payload.totalBill) +
      moneyRow("Customer Discount 5%", payload.customerDiscountAmount, "#047857") +
      moneyRow("Platform Commission 10%", payload.platformCommissionAmount) +
      moneyRow("Agent Payout 5%", payload.agentCommissionAmount) +
      moneyRow("Platform Net 5%", payload.platformNetAmount),
  );

  await sendSequentially([
    {
      to: payload.customerEmail,
      subject: `Customer Copy - Booking Completed - ${payload.restaurantName}`,
      html: luxuryEmail({
        eyebrow: "Booking Completed",
        title: "Thank You",
        subtitle:
          "Your booking has been completed successfully. Below is your final booking summary.",
        badge: "Customer",
        body: `
          <p style="margin:0;color:#17120b;font-size:15px;line-height:1.8;">
            Hello <strong>${escapeHtml(payload.customerName)}</strong>,
          </p>
          <p style="margin:12px 0 0;color:#4f4538;font-size:15px;line-height:1.8;">
            Thank you for using Mvip Booking. Your customer discount has been applied directly to your bill.
          </p>
          ${customerCard}
        `,
      }),
    },
    {
      to: payload.supplierEmail,
      subject: `Supplier Copy - Booking Completed - ${payload.bookingCode}`,
      html: luxuryEmail({
        eyebrow: "Supplier Settlement",
        title: "Booking Completed",
        subtitle:
          "A booking has been marked completed. Below is the supplier settlement summary.",
        badge: "Supplier",
        body: supplierCard,
      }),
    },
    {
      to: payload.agentEmail,
      subject: `Agent Copy - Booking Completed - ${payload.bookingCode}`,
      html: luxuryEmail({
        eyebrow: "Agent Notification",
        title: "Booking Completed",
        subtitle:
          "A booking linked to your referral has been completed. Commission is now ready for payout tracking.",
        badge: "Agent",
        body: detailCard(
          baseRows + moneyRow("Agent Payout 5%", payload.agentCommissionAmount),
        ),
      }),
    },
    {
      to: payload.adminEmail || ADMIN_EMAIL,
      subject: `Admin Copy - Booking Completed - ${payload.bookingCode}`,
      html: luxuryEmail({
        eyebrow: "Admin Settlement",
        title: "Booking Completed",
        subtitle: "Commission and settlement details are ready for review.",
        badge: "Admin",
        body: adminCard,
      }),
    },
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

  await sendSequentially([
    {
      to: payload.customerEmail,
      subject: `Customer Copy - Booking Cancelled - ${payload.restaurantName}`,
      html: luxuryEmail({
        eyebrow: "Reservation Update",
        title: "Booking Cancelled",
        subtitle: "Your booking has been cancelled.",
        badge: "Cancelled",
        body: `
          <p style="margin:0;color:#17120b;font-size:15px;line-height:1.8;">
            Hello <strong>${escapeHtml(payload.customerName)}</strong>,
          </p>
          <p style="margin:12px 0 0;color:#4f4538;font-size:15px;line-height:1.8;">
            Your booking at <strong>${escapeHtml(payload.restaurantName)}</strong> has been cancelled.
          </p>
          ${cancelCard}
        `,
      }),
    },
    {
      to: payload.supplierEmail,
      subject: `Supplier Copy - Booking Cancelled - ${payload.bookingCode}`,
      html: luxuryEmail({
        eyebrow: "Supplier Notification",
        title: "Booking Cancelled",
        subtitle: "A booking has been cancelled.",
        badge: "Supplier",
        body: cancelCard,
      }),
    },
    {
      to: payload.agentEmail,
      subject: `Agent Copy - Booking Cancelled - ${payload.bookingCode}`,
      html: luxuryEmail({
        eyebrow: "Agent Notification",
        title: "Booking Cancelled",
        subtitle: "A booking linked to your referral has been cancelled.",
        badge: "Agent",
        body: cancelCard,
      }),
    },
    {
      to: payload.adminEmail || ADMIN_EMAIL,
      subject: `Admin Copy - Booking Cancelled - ${payload.bookingCode}`,
      html: luxuryEmail({
        eyebrow: "Admin Notification",
        title: "Booking Cancelled",
        subtitle: "A booking has been cancelled.",
        badge: "Admin",
        body: cancelCard,
      }),
    },
  ]);
}