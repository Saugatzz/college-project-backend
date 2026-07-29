import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

const ADMIN_EMAIL  = process.env.ADMIN_EMAIL  ?? 'sumanbasnet301@gmail.com';
const BUSINESS_NAME = process.env.BUSINESS_NAME ?? 'Sajilo Yatra Pvt Ltd.';
const FRONTEND_URL  = process.env.FRONTEND_URL  ?? 'http://localhost:3000';

type DateFlexibility = 'exact' | 'flexible' | undefined;
type GuideCoordinationStatus = 'pending_contact' | 'contacting_guides' | 'guides_confirmed';

// Formats a booking's requested timing (preferredDate + dateFlexibility +
// flexibilityWindow) into one readable line, mirroring the logic used on
// the checkout form and the admin dashboard.
function formatPreferredTiming(b: {
  preferredDate?: string;
  dateFlexibility?: DateFlexibility;
  flexibilityWindow?: string;
}): string {
  if (!b.preferredDate) return 'No preference given';
  const d = new Date(b.preferredDate);
  if (b.dateFlexibility === 'flexible') {
    const monthLabel = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    return `${monthLabel} (flexible — ${b.flexibilityWindow ?? 'no window given'})`;
  }
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function emailShell(title: string, body: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    body { margin:0; padding:0; background:#f0f4f8; font-family:Arial,sans-serif; }
    .wrapper { max-width:580px; margin:32px auto; background:#fff; border-radius:12px; overflow:hidden; border:1px solid #e2eaf4; }
    .header { background:linear-gradient(135deg,#0f4c81,#2e86c1); padding:28px 32px; }
    .header h1 { margin:0; font-size:20px; font-weight:400; color:#fff; letter-spacing:.5px; }
    .header p  { margin:6px 0 0; font-size:12px; color:rgba(255,255,255,0.65); }
    .body { padding:28px 32px; color:#334155; font-size:14px; line-height:1.7; }
    .body h2   { font-size:16px; margin-top:0; color:#1a1a2e; }
    .info-box  { background:#f0f8ff; border:1px solid rgba(46,134,193,0.2); border-radius:10px; padding:16px 20px; margin:16px 0; font-size:13px; }
    .info-box p { margin:5px 0; }
    .info-box strong { color:#0f4c81; }
    .timing-box { background:#fefaf0; border:1px dashed rgba(245,158,11,0.4); border-radius:10px; padding:14px 20px; margin:16px 0; font-size:13px; }
    .timing-box p { margin:4px 0; }
    .timing-box strong { color:#b45309; }
    .status-badge { display:inline-block; padding:3px 12px; border-radius:20px; font-size:12px; font-weight:700; }
    .status-pending   { background:#fffbeb; color:#f59e0b; }
    .status-confirmed { background:#f0fdf4; color:#10b981; }
    .status-cancelled { background:#fef2f2; color:#ef4444; }
    .status-pending_contact       { background:#f1f5f9; color:#64748b; }
    .status-contacting_guides     { background:#fffbeb; color:#f59e0b; }
    .status-guides_confirmed      { background:#f0fdf4; color:#10b981; }
    .btn { display:inline-block; margin-top:16px; padding:11px 26px; background:linear-gradient(135deg,#2e86c1,#0f4c81); color:#fff; font-weight:600; border-radius:8px; text-decoration:none; font-size:13px; }
    .code-box { text-align:center; margin:20px 0; }
    .code-box .code { display:inline-block; font-size:32px; font-weight:700; letter-spacing:10px; color:#0f4c81; background:#f0f8ff; border:1.5px dashed rgba(46,134,193,0.4); border-radius:12px; padding:14px 20px; }
    .footer { background:#f8fafc; border-top:1px solid #e2eaf4; padding:14px 32px; font-size:11px; color:#94a3b8; text-align:center; }
    .footer p { margin:3px 0; }
    .footer a { color:#2e86c1; text-decoration:none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>🏔️ ${BUSINESS_NAME}</h1>
      <p>Saugat Suman Shovit Collective Pvt Ltd.</p>
    </div>
    <div class="body">
      <h2>${title}</h2>
      ${body}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ${BUSINESS_NAME}. All rights reserved.</p>
      <p>📞 <a href="tel:+9779845439816">+977 984 543 9816</a> &nbsp;·&nbsp; ✉️ <a href="mailto:saugatpant31@gmail.com">saugatpant31@gmail.com</a></p>
    </div>
  </div>
</body>
</html>`.trim();
}

@Injectable()
export class MailService {
  constructor(private mailerService: MailerService) {}

  async sendVerificationCode(email: string, code: string): Promise<void> {
    const html = emailShell('Verify your email address', `
      <p>Use the code below to confirm this email address and continue your booking.</p>
      <div class="code-box">
        <span class="code">${code}</span>
      </div>
      <p style="font-size:13px;color:#64748b">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
    `);

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `Your verification code is ${code}`,
        html,
      });
    } catch (err) {
      console.error(`Failed to send verification code to ${email}:`, err);
      throw err;
    }
  }

  async sendBookingConfirmation(booking: {
    id: number;
    email: string;
    firstName: string;
    tourName: string;
    travelers: number;
    totalAmount: number;
    paymentMethod: string;
    preferredDate?: string;
    dateFlexibility?: DateFlexibility;
    flexibilityWindow?: string;
    dateSurcharge?: number;
  }): Promise<void> {
    const timingLabel = formatPreferredTiming(booking);
    const isExact = booking.dateFlexibility !== 'flexible';
    const hasSurcharge = Number(booking.dateSurcharge) > 0;

    const html = emailShell(`Booking Received — #${String(booking.id).padStart(4,'0')}`, `
      <p>Hi <strong>${booking.firstName}</strong>,</p>
      <p>We've received your booking for <strong>${booking.tourName}</strong>. 
         Our team will verify your payment and confirm within 2 business hours.</p>

      <div class="info-box">
        <p><strong>Booking ID:</strong> #${String(booking.id).padStart(4,'0')}</p>
        <p><strong>Tour:</strong> ${booking.tourName}</p>
        <p><strong>Travelers:</strong> ${booking.travelers}</p>
        <p><strong>Payment Method:</strong> ${booking.paymentMethod}</p>
        ${hasSurcharge ? `<p><strong>Exact Date Guarantee Fee:</strong> $${Number(booking.dateSurcharge).toLocaleString()}</p>` : ''}
        <p><strong>Total Amount:</strong> $${Number(booking.totalAmount).toLocaleString()}</p>
        <p><strong>Status:</strong> <span class="status-badge status-pending">Pending</span></p>
      </div>

      <div class="timing-box">
        <p>🗓️ <strong>Requested start:</strong> ${timingLabel}</p>
        ${isExact
          ? `<p style="color:#92702a">Because you chose an exact date, a guide is guaranteed for your trip on this date — we'll follow up shortly to confirm final arrangements.</p>`
          : `<p style="color:#92702a">We'll reach out to our local guides and confirm the exact departure date within your requested window shortly.</p>`}
      </div>

      <p style="font-size:13px;color:#64748b">
        ${booking.paymentMethod !== 'Card'
          ? 'Once we verify your receipt, you will receive a confirmation email.'
          : 'Your booking is being reviewed and you will hear from us shortly.'}
      </p>
      <p style="margin-top:20px;font-size:12px;color:#94a3b8">Questions? Reply to this email.</p>
    `);

    try {
      await this.mailerService.sendMail({
        to: booking.email,
        subject: `Booking Received 🏔️ — ${booking.tourName} (#${String(booking.id).padStart(4,'0')})`,
        html,
      });
    } catch (err) {
      console.error(`Failed to send booking confirmation to ${booking.email}:`, err);
    }
  }

  /**
   * Notifies the business owner/admin inbox whenever a new booking comes
   * in. Best-effort — a failure here should never block booking creation,
   * so errors are logged and swallowed, same as the customer-facing
   * confirmation email.
   */
  async sendOwnerNotification(booking: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    country: string;
    travelers: number;
    tourName: string;
    totalAmount: number;
    paymentMethod: string;
    notes?: string;
    preferredDate?: string;
    dateFlexibility?: DateFlexibility;
    flexibilityWindow?: string;
    dateNotes?: string;
    dateSurcharge?: number;
  }): Promise<void> {
    const timingLabel = formatPreferredTiming(booking);
    const isExact = booking.dateFlexibility !== 'flexible';
    const hasSurcharge = Number(booking.dateSurcharge) > 0;

    const html = emailShell(`🔔 New Booking — #${String(booking.id).padStart(4,'0')}`, `
      <p>A new booking just came in.</p>

      <div class="info-box">
        <p><strong>Booking ID:</strong> #${String(booking.id).padStart(4,'0')}</p>
        <p><strong>Customer:</strong> ${booking.firstName} ${booking.lastName}</p>
        <p><strong>Email:</strong> ${booking.email}</p>
        <p><strong>Phone:</strong> ${booking.phone}</p>
        <p><strong>Country:</strong> ${booking.country}</p>
        <p><strong>Tour:</strong> ${booking.tourName}</p>
        <p><strong>Travelers:</strong> ${booking.travelers}</p>
        <p><strong>Payment Method:</strong> ${booking.paymentMethod}</p>
        ${hasSurcharge ? `<p><strong>Exact Date Guarantee Fee:</strong> $${Number(booking.dateSurcharge).toLocaleString()}</p>` : ''}
        <p><strong>Total Amount:</strong> $${Number(booking.totalAmount).toLocaleString()}</p>
        <p><strong>Status:</strong> <span class="status-badge status-pending">Pending</span></p>
        ${booking.notes ? `<p><strong>Notes:</strong> ${booking.notes}</p>` : ''}
      </div>

      <div class="timing-box">
        <p>🗓️ <strong>Requested start:</strong> ${timingLabel}</p>
        ${booking.dateNotes ? `<p><strong>Timing notes:</strong> ${booking.dateNotes}</p>` : ''}
        ${isExact
          ? `<p style="color:#92702a">Exact date — a guide MUST be assigned for this date (guarantee fee paid). Contact guides and move this to "Guides confirmed" as soon as arrangements are locked in.</p>`
          : `<p style="color:#92702a">Flexible window — reach out to guides for this window and update the "Guide Coordination" status once a concrete departure date is confirmed. The customer gets an automatic email each time you do.</p>`}
      </div>

      <p style="font-size:13px;color:#64748b">Log in to the admin dashboard to review, confirm, and coordinate guides for this booking.</p>
    `);

    try {
      await this.mailerService.sendMail({
        to: ADMIN_EMAIL,
        subject: `New Booking — ${booking.tourName} (#${String(booking.id).padStart(4,'0')})`,
        html,
      });
    } catch (err) {
      console.error(`Failed to send owner notification for booking #${booking.id}:`, err);
    }
  }

  async sendStatusUpdate(booking: {
    id: number;
    email: string;
    firstName: string;
    tourName: string;
    status: string;
  }): Promise<void> {
    const statusContent: Record<string, { headline: string; message: string; emoji: string }> = {
      confirmed: {
        emoji: '✅',
        headline: 'Your booking is confirmed!',
        message: "Great news! We've verified your payment and confirmed your booking. Pack your bags — adventure awaits!",
      },
      cancelled: {
        emoji: '❌',
        headline: 'Your booking has been cancelled',
        message: "Your booking has been cancelled. If you didn't request this or have any questions, please contact us.",
      },
      pending: {
        emoji: '🕐',
        headline: 'Your booking is pending review',
        message: "Your booking is pending review. We'll update you shortly once verification is complete.",
      },
    };

    const cfg = statusContent[booking.status] ?? statusContent.pending;
    const statusLabel = booking.status.charAt(0).toUpperCase() + booking.status.slice(1);

    const html = emailShell(`${cfg.emoji} ${cfg.headline}`, `
      <p>Hi <strong>${booking.firstName}</strong>,</p>
      <p>${cfg.message}</p>

      <div class="info-box">
        <p><strong>Booking ID:</strong> #${String(booking.id).padStart(4,'0')}</p>
        <p><strong>Tour:</strong> ${booking.tourName}</p>
        <p><strong>Status:</strong>
          <span class="status-badge status-${booking.status}">${statusLabel}</span>
        </p>
      </div>

      <p style="margin-top:20px;font-size:12px;color:#94a3b8">Need help? Reply to this email or contact our support team.</p>
    `);

    try {
      await this.mailerService.sendMail({
        to: booking.email,
        subject: `Booking ${statusLabel} — ${booking.tourName} (#${String(booking.id).padStart(4,'0')})`,
        html,
      });
    } catch (err) {
      console.error(`Failed to send status update to ${booking.email}:`, err);
    }
  }

  /**
   * Sent every time an admin updates guide-coordination progress for a
   * booking. Keeps the customer in the loop while the business lines up
   * local guides for their requested window — from first contact,
   * through "still finalizing," to a locked-in departure date. There is
   * no "couldn't accommodate" outcome: a guide is always assigned,
   * guaranteed outright for exact dates and worked out within the window
   * for flexible ones.
   */
  async sendGuideCoordinationUpdate(booking: {
    id: number;
    email: string;
    firstName: string;
    tourName: string;
    guideCoordinationStatus: GuideCoordinationStatus;
    departureDate?: string;
    preferredDate?: string;
    dateFlexibility?: DateFlexibility;
    flexibilityWindow?: string;
  }): Promise<void> {
    const timingLabel = formatPreferredTiming(booking);
    const isExact = booking.dateFlexibility !== 'flexible';
    const confirmedLabel = booking.departureDate
      ? new Date(booking.departureDate).toLocaleDateString('en-US', {
          weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
        })
      : null;

    const content: Record<GuideCoordinationStatus, { emoji: string; headline: string; message: string }> = {
      pending_contact: {
        emoji: '🕐',
        headline: 'We have your preferred dates',
        message: isExact
          ? `We've logged your exact requested date of <strong>${timingLabel}</strong>. A guide is guaranteed for this date, and we're reaching out to our local guides now to finalize arrangements.`
          : `We've logged your requested start of <strong>${timingLabel}</strong> and will be reaching out to our local guides shortly.`,
      },
      contacting_guides: {
        emoji: '📞',
        headline: "We're lining up your guide",
        message: isExact
          ? `We're finalizing guide arrangements for your confirmed date of <strong>${timingLabel}</strong>. We'll follow up as soon as everything is locked in.`
          : `We're currently reaching out to our local guides to see who's available around <strong>${timingLabel}</strong>. We'll follow up as soon as we hear back.`,
      },
      guides_confirmed: {
        emoji: '✅',
        headline: 'Your guide is confirmed!',
        message: confirmedLabel
          ? `Great news — we've locked in a guide and your departure date is now <strong>${confirmedLabel}</strong>.`
          : `Great news — we've locked in a guide for your trip around <strong>${timingLabel}</strong>. We'll send your exact departure date shortly.`,
      },
    };

    const cfg = content[booking.guideCoordinationStatus] ?? content.pending_contact;

    const html = emailShell(`${cfg.emoji} ${cfg.headline}`, `
      <p>Hi <strong>${booking.firstName}</strong>,</p>
      <p>${cfg.message}</p>

      <div class="info-box">
        <p><strong>Booking ID:</strong> #${String(booking.id).padStart(4,'0')}</p>
        <p><strong>Tour:</strong> ${booking.tourName}</p>
        <p><strong>Requested start:</strong> ${timingLabel}</p>
        ${confirmedLabel ? `<p><strong>Confirmed departure:</strong> ${confirmedLabel}</p>` : ''}
        <p><strong>Guide coordination:</strong>
          <span class="status-badge status-${booking.guideCoordinationStatus}">${cfg.headline}</span>
        </p>
      </div>

      <p style="margin-top:20px;font-size:12px;color:#94a3b8">Questions about the timing? Just reply to this email.</p>
    `);

    try {
      await this.mailerService.sendMail({
        to: booking.email,
        subject: `${cfg.emoji} Guide update — ${booking.tourName} (#${String(booking.id).padStart(4,'0')})`,
        html,
      });
    } catch (err) {
      console.error(`Failed to send guide coordination update to ${booking.email}:`, err);
    }
  }

  /**
   * Sent to the ADMIN inbox when a customer cancels their own booking
   * (as opposed to an admin changing the status from the dashboard,
   * which the admin already knows about since they did it themselves).
   */
  async sendCustomerCancelledNotice(booking: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    tourName: string;
  }): Promise<void> {
    const html = emailShell(`❌ Customer cancelled booking #${String(booking.id).padStart(4,'0')}`, `
      <p><strong>${booking.firstName} ${booking.lastName}</strong> (${booking.email}) just cancelled their own booking from their account dashboard.</p>

      <div class="info-box">
        <p><strong>Booking ID:</strong> #${String(booking.id).padStart(4,'0')}</p>
        <p><strong>Tour:</strong> ${booking.tourName}</p>
        <p><strong>Status:</strong> <span class="status-badge status-cancelled">Cancelled</span></p>
      </div>

      <p style="font-size:13px;color:#64748b">No action needed unless you'd like to follow up with the customer.</p>
    `);

    try {
      await this.mailerService.sendMail({
        to: ADMIN_EMAIL,
        subject: `Customer Cancelled — ${booking.tourName} (#${String(booking.id).padStart(4,'0')})`,
        html,
      });
    } catch (err) {
      console.error(`Failed to send customer-cancelled notice for booking #${booking.id}:`, err);
    }
  }

  /**
   * Sent to the CUSTOMER confirming their own edit to a pending booking
   * went through, with a summary of the current (post-edit) details.
   */
  async sendBookingUpdatedByCustomer(booking: {
    id: number;
    email: string;
    firstName: string;
    tourName: string;
    travelers: number;
    preferredDate?: string;
    dateFlexibility?: DateFlexibility;
    flexibilityWindow?: string;
    dateNotes?: string;
    notes?: string;
  }): Promise<void> {
    const timingLabel = formatPreferredTiming(booking);

    const html = emailShell(`✏️ Your booking has been updated`, `
      <p>Hi <strong>${booking.firstName}</strong>,</p>
      <p>We've updated booking <strong>#${String(booking.id).padStart(4,'0')}</strong> with the changes you made. Here's where things stand now:</p>

      <div class="info-box">
        <p><strong>Tour:</strong> ${booking.tourName}</p>
        <p><strong>Travelers:</strong> ${booking.travelers}</p>
        <p><strong>Requested start:</strong> ${timingLabel}</p>
        ${booking.dateNotes ? `<p><strong>Timing notes:</strong> ${booking.dateNotes}</p>` : ''}
        ${booking.notes ? `<p><strong>Special requests:</strong> ${booking.notes}</p>` : ''}
      </div>

      <p style="font-size:13px;color:#64748b">
        This booking is still pending confirmation — you can make further changes from your account dashboard as long as it stays pending.
      </p>
    `);

    try {
      await this.mailerService.sendMail({
        to: booking.email,
        subject: `Booking Updated — ${booking.tourName} (#${String(booking.id).padStart(4,'0')})`,
        html,
      });
    } catch (err) {
      console.error(`Failed to send booking-updated confirmation to ${booking.email}:`, err);
    }
  }

  /**
   * Sent to the ADMIN inbox whenever a customer edits their own pending
   * booking, so the team reviews the new details rather than working
   * from stale ones.
   */
  async sendCustomerEditedNotice(booking: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    tourName: string;
  }): Promise<void> {
    const html = emailShell(`✏️ Customer updated booking #${String(booking.id).padStart(4,'0')}`, `
      <p><strong>${booking.firstName} ${booking.lastName}</strong> (${booking.email}) just edited their own booking from their account dashboard.</p>

      <div class="info-box">
        <p><strong>Booking ID:</strong> #${String(booking.id).padStart(4,'0')}</p>
        <p><strong>Tour:</strong> ${booking.tourName}</p>
      </div>

      <p style="font-size:13px;color:#64748b">Log in to the admin dashboard to review the updated details.</p>
    `);

    try {
      await this.mailerService.sendMail({
        to: ADMIN_EMAIL,
        subject: `Booking Updated by Customer — ${booking.tourName} (#${String(booking.id).padStart(4,'0')})`,
        html,
      });
    } catch (err) {
      console.error(`Failed to send customer-edited notice for booking #${booking.id}:`, err);
    }
  }
}