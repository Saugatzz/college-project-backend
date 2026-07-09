import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

const ADMIN_EMAIL  = process.env.ADMIN_EMAIL  ?? 'admin@nepaltreks.com';
const BUSINESS_NAME = process.env.BUSINESS_NAME ?? 'SwiftRoute Global Pvt Ltd.';
const FRONTEND_URL  = process.env.FRONTEND_URL  ?? 'http://localhost:3000';

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
    .status-badge { display:inline-block; padding:3px 12px; border-radius:20px; font-size:12px; font-weight:700; }
    .status-pending   { background:#fffbeb; color:#f59e0b; }
    .status-confirmed { background:#f0fdf4; color:#10b981; }
    .status-cancelled { background:#fef2f2; color:#ef4444; }
    .btn { display:inline-block; margin-top:16px; padding:11px 26px; background:linear-gradient(135deg,#2e86c1,#0f4c81); color:#fff; font-weight:600; border-radius:8px; text-decoration:none; font-size:13px; }
    .footer { background:#f8fafc; border-top:1px solid #e2eaf4; padding:14px 32px; font-size:11px; color:#94a3b8; text-align:center; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>🏔️ ${BUSINESS_NAME}</h1>
      <p>SwiftRoute Global Pvt Ltd.</p>
    </div>
    <div class="body">
      <h2>${title}</h2>
      ${body}
    </div>
    <div class="footer">© ${new Date().getFullYear()} ${BUSINESS_NAME}. All rights reserved.</div>
  </div>
</body>
</html>`.trim();
}

@Injectable()
export class MailService {
  constructor(private mailerService: MailerService) {}

  async sendBookingConfirmation(booking: {
    id: number;
    email: string;
    firstName: string;
    tourName: string;
    travelers: number;
    totalAmount: number;
    paymentMethod: string;
    departureDate?: string;
  }): Promise<void> {
    const html = emailShell(`Booking Received — #${String(booking.id).padStart(4,'0')}`, `
      <p>Hi <strong>${booking.firstName}</strong>,</p>
      <p>We've received your booking for <strong>${booking.tourName}</strong>. 
         Our team will verify your payment and confirm within 2 business hours.</p>

      <div class="info-box">
        <p><strong>Booking ID:</strong> #${String(booking.id).padStart(4,'0')}</p>
        <p><strong>Tour:</strong> ${booking.tourName}</p>
        <p><strong>Travelers:</strong> ${booking.travelers}</p>
        ${booking.departureDate ? `<p><strong>Departure:</strong> ${new Date(booking.departureDate).toDateString()}</p>` : ''}
        <p><strong>Payment Method:</strong> ${booking.paymentMethod}</p>
        <p><strong>Total Amount:</strong> $${Number(booking.totalAmount).toLocaleString()}</p>
        <p><strong>Status:</strong> <span class="status-badge status-pending">Pending</span></p>
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

    const html = emailShell(`${cfg.emoji} ${cfg.headline}`, `
      <p>Hi <strong>${booking.firstName}</strong>,</p>
      <p>${cfg.message}</p>

      <div class="info-box">
        <p><strong>Booking ID:</strong> #${String(booking.id).padStart(4,'0')}</p>
        <p><strong>Tour:</strong> ${booking.tourName}</p>
        <p><strong>Status:</strong>
          <span class="status-badge status-${booking.status}">${booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}</span>
        </p>
      </div>

      <p style="margin-top:20px;font-size:12px;color:#94a3b8">Need help? Reply to this email or contact our support team.</p>
    `);

    try {
      await this.mailerService.sendMail({
        to: booking.email,
        subject: `Booking ${cfg.emoji} ${booking.status.charAt(0).toUpperCase() + booking.status.slice(1)} — ${booking.tourName}`,
        html,
      });
    } catch (err) {
      console.error(`Failed to send status update to ${booking.email}:`, err);
    }
  }
}