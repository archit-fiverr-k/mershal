import { Resend } from "resend";
import { renderClientWelcomeEmail } from "./templates/ClientWelcome";

const resend = new Resend(process.env.RESEND_API_KEY ?? "");

const defaultFromEmail = process.env.RESEND_FROM_EMAIL ?? "hello@mershal.in";
const defaultFromName = process.env.RESEND_FROM_NAME ?? "Mershal";
export const DEFAULT_FROM = `${defaultFromName} <${defaultFromEmail}>`;
export const DEFAULT_REPLY_TO = process.env.RESEND_REPLY_TO ?? "hello@mershal.in";

export const WELCOME_FROM = DEFAULT_FROM;
export const PAYMENTS_FROM = DEFAULT_FROM;
export const SUPPORT_FROM = DEFAULT_FROM;
export const UPDATES_FROM = DEFAULT_FROM;

// Common email helper template wrappers to ensure beautiful visual styling and branding
const emailStyles = `
  background-color: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  margin: 0;
  padding: 0;
  -webkit-font-smoothing: antialiased;
`;

const emailContainer = `
  background-color: #ffffff;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.025);
  width: 100%;
  max-width: 580px;
  margin: 0 auto;
`;

const emailBody = `
  padding: 0 40px 40px 40px;
  background-color: #ffffff;
`;

const btnStyle = `
  background-color: #5E6AD2;
  color: #ffffff !important;
  display: inline-block;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  padding: 12px 28px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(94, 106, 210, 0.15);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
`;

function renderEmailHead(title: string): string {
  return `
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="x-apple-disable-message-reformatting" />
      <title>${title}</title>
      <style>
        @media only screen and (max-width: 600px) {
          .email-body-table {
            padding: 20px 10px !important;
          }
          .email-container {
            border-radius: 12px !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          .email-header {
            padding: 28px 20px 16px !important;
          }
          .email-body {
            padding: 0 20px 24px 20px !important;
          }
          .email-footer {
            padding: 24px 20px !important;
          }
          .responsive-cell {
            display: block !important;
            width: 100% !important;
            box-sizing: border-box !important;
            padding-bottom: 12px !important;
          }
          .responsive-cell:last-child {
            padding-bottom: 0 !important;
          }
          .responsive-gap {
            display: none !important;
          }
          .personal-note-card {
            padding: 16px !important;
          }
        }
      </style>
    </head>
  `;
}

/**
 * Renders a clean, modern email header with platform or agency branding.
 */
function renderHeader(title: string, subtitle?: string): string {
  const isPlatform = title.toLowerCase() === "mershal";
  
  if (isPlatform) {
    return `
      <div class="email-header" style="padding: 40px 40px 24px; text-align: left;">
        <table border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 16px; border-collapse: collapse;">
          <tr>
            <td style="background-color: #5E6AD2; border-radius: 8px; width: 36px; height: 36px; text-align: center; vertical-align: middle;">
              <span style="color: #ffffff; font-size: 16px; font-weight: 800; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; letter-spacing: -0.5px; line-height: 36px; display: inline-block;">Me</span>
            </td>
            <td style="padding-left: 12px; vertical-align: middle;">
              <span style="color: #0f172a; font-size: 18px; font-weight: 700; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; letter-spacing: -0.3px;">Mer<span style="color: #5E6AD2;">shal</span></span>
            </td>
          </tr>
        </table>
        ${subtitle ? `<p style="color: #64748b; margin: 0; font-size: 13px; font-weight: 500; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; letter-spacing: 0.05em; text-transform: uppercase;">${subtitle}</p>` : ""}
      </div>
    `;
  } else {
    const initials = title
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
      
    return `
      <div class="email-header" style="padding: 40px 40px 24px; text-align: left;">
        <table border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 16px; border-collapse: collapse;">
          <tr>
            <td style="background-color: #f1f5f9; border-radius: 8px; width: 36px; height: 36px; text-align: center; vertical-align: middle; border: 1px solid #e2e8f0;">
              <span style="color: #475569; font-size: 13px; font-weight: 700; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 36px; display: inline-block;">${initials}</span>
            </td>
            <td style="padding-left: 12px; vertical-align: middle;">
              <span style="color: #0f172a; font-size: 16px; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; letter-spacing: -0.2px;">${title}</span>
            </td>
            <td style="padding-left: 8px; vertical-align: middle;">
              <span style="color: #94a3b8; font-size: 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-weight: 600; background-color: #f8fafc; padding: 2px 6px; border-radius: 4px; border: 1px solid #e2e8f0; letter-spacing: 0.05em; text-transform: uppercase;">via Mer<span style="color: #5E6AD2;">shal</span></span>
            </td>
          </tr>
        </table>
        ${subtitle ? `<p style="color: #64748b; margin: 0; font-size: 13px; font-weight: 500; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; letter-spacing: 0.05em; text-transform: uppercase;">${subtitle}</p>` : ""}
      </div>
    `;
  }
}

/**
 * Renders a clean, modern email footer.
 */
function renderFooter(isPlatform: boolean): string {
  if (isPlatform) {
    return `
      <div class="email-footer" style="background-color: #f8fafc; padding: 32px 40px; border-top: 1px solid #f1f5f9; text-align: center;">
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 18px;">
          Questions? Reply to this email to get in touch with our team.
        </p>
        <p style="margin: 0; font-size: 11px; color: #94a3b8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          &copy; 2026 Mershal OS. All rights reserved.
        </p>
      </div>
    `;
  } else {
    return `
      <div class="email-footer" style="background-color: #f8fafc; padding: 32px 40px; border-top: 1px solid #f1f5f9; text-align: center;">
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 18px;">
          This link is secure and private. Please do not share it.
        </p>
        <p style="margin: 0; font-size: 11px; color: #94a3b8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          Powered by <a href="https://mershal.in" style="color: #5E6AD2; text-decoration: none; font-weight: 600;">Mershal OS</a>
        </p>
      </div>
    `;
  }
}

/**
 * Render functions for all transactional templates to generate raw HTML.
 */

export function renderWelcomeEmailHtml(name: string): string {
  return `
    <!DOCTYPE html>
    <html>
    ${renderEmailHead("Welcome to Mershal")}
    <body style="${emailStyles}">
      <table class="email-body-table" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 40px 0;">
        <tr>
          <td align="center">
            <div class="email-container" style="${emailContainer}">
              ${renderHeader("Mershal", "The Freelancer &amp; Agency OS")}
              <div class="email-body" style="${emailBody}">
                <h1 style="color: #0f172a; font-size: 20px; font-weight: 700; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; letter-spacing: -0.5px;">Welcome, ${name}!</h1>
                <p style="color: #475569; font-size: 15px; line-height: 24px; margin: 0 0 28px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                  Thank you for choosing Mershal. You’ve just taken a major step toward streamlining your business operations. Mershal is built to centralize your workflow, client relations, and financial operations in one highly polished, unified workspace.
                </p>
                
                <p style="color: #0f172a; font-weight: 700; font-size: 12px; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.05em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">Get started in 3 simple steps:</p>
                
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 32px; border-collapse: collapse;">
                  <tr>
                    <td class="personal-note-card" style="padding: 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; display: block; margin-bottom: 12px;">
                      <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td width="36" valign="top" style="padding-top: 2px;">
                            <div style="background-color: #5E6AD2; color: #ffffff; font-weight: 700; width: 22px; height: 22px; border-radius: 50%; text-align: center; line-height: 22px; font-size: 11px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">1</div>
                          </td>
                          <td valign="top">
                            <p style="margin: 0; font-weight: 600; font-size: 14px; color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Configure your settings</p>
                            <p style="margin: 4px 0 0 0; font-size: 13px; color: #475569; line-height: 18px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Customize your brand preferences, client portal layouts, and profile metrics to make the app your own.</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr style="height: 10px;"><td></td></tr>
                  <tr>
                    <td class="personal-note-card" style="padding: 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; display: block; margin-bottom: 12px;">
                      <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td width="36" valign="top" style="padding-top: 2px;">
                            <div style="background-color: #5E6AD2; color: #ffffff; font-weight: 700; width: 22px; height: 22px; border-radius: 50%; text-align: center; line-height: 22px; font-size: 11px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">2</div>
                          </td>
                          <td valign="top">
                            <p style="margin: 0; font-weight: 600; font-size: 14px; color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Invite your first client</p>
                            <p style="margin: 4px 0 0 0; font-size: 13px; color: #475569; line-height: 18px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Set up a client record and send them a private, secure portal link to share updates, files, and milestones.</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr style="height: 10px;"><td></td></tr>
                  <tr>
                    <td class="personal-note-card" style="padding: 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; display: block;">
                      <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td width="36" valign="top" style="padding-top: 2px;">
                            <div style="background-color: #5E6AD2; color: #ffffff; font-weight: 700; width: 22px; height: 22px; border-radius: 50%; text-align: center; line-height: 22px; font-size: 11px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">3</div>
                          </td>
                          <td valign="top">
                            <p style="margin: 0; font-weight: 600; font-size: 14px; color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Automate with AI</p>
                            <p style="margin: 4px 0 0 0; font-size: 13px; color: #475569; line-height: 18px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Leverage integrated AI briefing analysis and automatic task checklist builders to accelerate your delivery rate.</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
                
                <div style="text-align: center; margin-top: 36px;">
                  <a href="${process.env.VITE_APP_URL ?? "https://mershal.in"}/dashboard" style="${btnStyle}">
                    Go to Dashboard &rarr;
                  </a>
                </div>
              </div>
              ${renderFooter(true)}
            </div>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export function renderInvoiceEmailHtml(
  clientName: string,
  invoiceNumber: string,
  total: number,
  portalUrl: string,
  agencyName: string = "Our Agency",
): string {
  return `
    <!DOCTYPE html>
    <html>
    ${renderEmailHead(`Invoice ${invoiceNumber}`)}
    <body style="${emailStyles}">
      <table class="email-body-table" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 40px 0;">
        <tr>
          <td align="center">
            <div class="email-container" style="${emailContainer}">
              ${renderHeader(agencyName, "Secure Invoicing Portal")}
              <div class="email-body" style="${emailBody}">
                <h1 style="color: #0f172a; font-size: 20px; font-weight: 700; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; letter-spacing: -0.5px;">Hello ${clientName},</h1>
                <p style="color: #475569; font-size: 15px; line-height: 24px; margin: 0 0 24px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                  You have a new invoice waiting from <strong>${agencyName}</strong>. You can review the details and pay securely online through your private portal.
                </p>
                
                <div class="personal-note-card" style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; padding: 24px; margin: 28px 0; text-align: left;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td style="padding-bottom: 16px;">
                        <span style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Invoice Number</span>
                        <p style="margin: 4px 0 0 0; font-weight: 600; font-family: monospace; font-size: 15px; color: #0f172a;">${invoiceNumber}</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="border-top: 1px solid #e2e8f0; padding-top: 16px;">
                        <span style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Total Amount Due</span>
                        <p style="margin: 6px 0 0 0; font-size: 26px; font-weight: 800; color: #5E6AD2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; letter-spacing: -0.5px;">$${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                      </td>
                    </tr>
                  </table>
                </div>
                
                <div style="text-align: center; margin-top: 32px;">
                  <a href="${portalUrl}" style="${btnStyle}">
                    View &amp; Pay Invoice &rarr;
                  </a>
                </div>
              </div>
              ${renderFooter(false)}
            </div>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export function renderInvoicePaidEmailHtml(
  ownerName: string,
  invoiceNumber: string,
  total: number,
): string {
  return `
    <!DOCTYPE html>
    <html>
    ${renderEmailHead(`Invoice ${invoiceNumber} Paid`)}
    <body style="${emailStyles}">
      <table class="email-body-table" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 40px 0;">
        <tr>
          <td align="center">
            <div class="email-container" style="${emailContainer}">
              ${renderHeader("Mershal", "Payment Notification")}
              <div class="email-body" style="${emailBody}">
                <h1 style="color: #0f172a; font-size: 20px; font-weight: 700; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; letter-spacing: -0.5px;">Payment received, ${ownerName}!</h1>
                <p style="color: #475569; font-size: 15px; line-height: 24px; margin: 0 0 24px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                  Your client has completed payment in full for invoice <strong>${invoiceNumber}</strong>.
                </p>
                
                <div class="personal-note-card" style="background-color: #f0fdf4; border-radius: 12px; border: 1px solid #bbf7d0; padding: 28px; margin: 28px 0; text-align: center;">
                  <span style="font-size: 11px; color: #15803d; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Total Amount Deposited</span>
                  <p style="margin: 8px 0 4px 0; font-size: 32px; font-weight: 800; color: #16a34a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; letter-spacing: -1px;">
                    $${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                  <p style="margin: 0; font-size: 13px; color: #166534; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 500;">
                    Invoice ${invoiceNumber}
                  </p>
                </div>
                
                <div style="text-align: center; margin-top: 32px;">
                  <a href="${process.env.VITE_APP_URL ?? "https://mershal.in"}/dashboard/invoices" style="${btnStyle}">
                    View Invoices &rarr;
                  </a>
                </div>
              </div>
              ${renderFooter(true)}
            </div>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export function renderOverdueReminderEmailHtml(
  clientName: string,
  invoiceNumber: string,
  daysOverdue: number,
): string {
  const isSubscription = invoiceNumber === "your subscription";
  const title = isSubscription ? "Mershal" : "Our Agency";
  
  return `
    <!DOCTYPE html>
    <html>
    ${renderEmailHead("Payment Reminder")}
    <body style="${emailStyles}">
      <table class="email-body-table" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 40px 0;">
        <tr>
          <td align="center">
            <div class="email-container" style="${emailContainer}">
              ${renderHeader(title, "Payment Reminder")}
              <div class="email-body" style="${emailBody}">
                <h1 style="color: #0f172a; font-size: 20px; font-weight: 700; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; letter-spacing: -0.5px;">Hello ${clientName},</h1>
                <p style="color: #475569; font-size: 15px; line-height: 24px; margin: 0 0 24px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                  ${isSubscription 
                    ? "This is a reminder that the payment for your Mershal platform subscription has failed or is overdue. Please update your billing info to keep your account active."
                    : `This is a reminder that invoice <strong>${invoiceNumber}</strong> is currently <strong>${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} overdue</strong>.`}
                </p>
                <p style="color: #475569; font-size: 15px; line-height: 24px; margin: 0 0 24px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                  ${isSubscription 
                    ? "To update your credit card or billing details, please visit the settings panel in your freelancer dashboard."
                    : "Please review the invoice and complete payment at your earliest convenience."}
                </p>
                
                <div class="personal-note-card" style="background-color: #fef2f2; border-radius: 12px; border: 1px solid #fca5a5; padding: 24px; margin: 28px 0; text-align: left;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td>
                        <span style="font-size: 11px; color: #991b1b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Status</span>
                        <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 700; color: #b91c1c; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                          Overdue
                        </p>
                      </td>
                    </tr>
                    ${daysOverdue > 0 ? `
                    <tr>
                      <td style="border-top: 1px solid #fecaca; padding-top: 12px; margin-top: 12px;">
                        <span style="font-size: 11px; color: #991b1b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Days Past Due</span>
                        <p style="margin: 4px 0 0 0; font-size: 15px; font-weight: 600; color: #7f1d1d; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                          ${daysOverdue} Day${daysOverdue !== 1 ? "s" : ""}
                        </p>
                      </td>
                    </tr>
                    ` : ""}
                  </table>
                </div>

                ${isSubscription ? `
                <div style="text-align: center; margin-top: 32px;">
                  <a href="${process.env.VITE_APP_URL ?? "https://mershal.in"}/dashboard/settings" style="${btnStyle}">
                    Update Payment Method &rarr;
                  </a>
                </div>
                ` : ""}
              </div>
              ${renderFooter(isSubscription)}
            </div>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export function renderPortalInviteEmailHtml(
  clientName: string,
  portalUrl: string,
  agencyName: string,
  portalPassword?: string,
): string {
  return `
    <!DOCTYPE html>
    <html>
    ${renderEmailHead("Client Portal Invite")}
    <body style="${emailStyles}">
      <table class="email-body-table" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 40px 0;">
        <tr>
          <td align="center">
            <div class="email-container" style="${emailContainer}">
              ${renderHeader(agencyName, "Private Client Space")}
              <div class="email-body" style="${emailBody}">
                <h1 style="color: #0f172a; font-size: 20px; font-weight: 700; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; letter-spacing: -0.5px;">Hello ${clientName},</h1>
                <p style="color: #475569; font-size: 15px; line-height: 24px; margin: 0 0 24px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                  <strong>${agencyName}</strong> has created a private, secure project portal for you. Inside your portal, you can:
                </p>
                
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 32px; border-collapse: collapse;">
                  ${[
                    "Monitor project progress and upcoming milestones",
                    "Review, download, and approve deliverables",
                    "Send secure instant messages to your agency contacts",
                    "View, print, and track your outstanding invoices",
                  ].map((feature) => `
                  <tr>
                    <td class="personal-note-card" style="padding: 12px 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; display: block;">
                      <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td width="28" valign="top" style="padding-top: 1px;">
                            <span style="color: #5E6AD2; font-weight: bold; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">✓</span>
                          </td>
                          <td valign="top">
                            <span style="font-size: 13.5px; color: #334155; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 18px; font-weight: 500;">${feature}</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr style="height: 8px;"><td></td></tr>
                  `).join("")}
                </table>
                
                ${portalPassword ? `
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 32px; border-collapse: collapse;">
                  <tr>
                    <td class="personal-note-card" style="padding: 16px 20px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; text-align: center; display: block;">
                      <p style="margin: 0 0 6px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Your Secure Access Password</p>
                      <p style="margin: 0; font-size: 18px; font-weight: 700; color: #5E6AD2; font-family: Courier, monospace; letter-spacing: 2px;">${portalPassword}</p>
                      <p style="margin: 6px 0 0; font-size: 11.5px; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5;">Use this unique password to securely access your portal.</p>
                    </td>
                  </tr>
                </table>
                ` : ""}

                <div style="text-align: center; margin-top: 32px;">
                  <a href="${portalUrl}" style="${btnStyle}">
                    Open Your Portal &rarr;
                  </a>
                </div>
              </div>
              ${renderFooter(false)}
            </div>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export function renderProposalEmailHtml(
  clientName: string,
  proposalTitle: string,
  proposalUrl: string,
): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    ${renderEmailHead("New Proposal")}
    <body style="${emailStyles}">
      <table class="email-body-table" style="width: 100%; background-color: #f8fafc; padding: 40px 0;" cellpadding="0" cellspacing="0">
        <tr><td align="center">
          <div class="email-container" style="${emailContainer}">
            ${renderHeader("Mershal", "Proposal Delivery")}
            <div class="email-body" style="${emailBody}">
              <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; letter-spacing: -0.5px;">You've received a proposal</h1>
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">Hi ${clientName},</p>
              <p style="margin: 0 0 24px 0; font-size: 15px; color: #64748b; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                A new proposal has been prepared for you: <strong style="color: #0f172a;">${proposalTitle}</strong>.
                Click below to review it and accept or decline.
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${proposalUrl}" style="${btnStyle}">View Proposal &rarr;</a>
              </div>
              <p style="margin: 24px 0 0 0; font-size: 13px; color: #94a3b8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; text-align: center;">
                If you have any questions, just reply to this email.
              </p>
            </div>
            ${renderFooter(false)}
          </div>
        </td></tr>
      </table>
    </body>
    </html>
  `;
}


/**
 * API sending wrappers.
 */

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  const html = renderWelcomeEmailHtml(name);
  await resend.emails.send({
    from: WELCOME_FROM,
    to,
    replyTo: DEFAULT_REPLY_TO,
    subject: "Welcome to Mershal 👋",
    html
  });
}

export async function sendInvoiceEmail(
  to: string,
  clientName: string,
  invoiceNumber: string,
  total: number,
  portalUrl: string,
  agencyName: string = "Our Agency",
  freelancerEmail: string = "",
): Promise<void> {
  const html = renderInvoiceEmailHtml(clientName, invoiceNumber, total, portalUrl, agencyName);
  const from = freelancerEmail
    ? `${agencyName} via Mershal <hello@mershal.in>`
    : PAYMENTS_FROM;
  const replyTo = freelancerEmail || DEFAULT_REPLY_TO;
  await resend.emails.send({
    from,
    to,
    replyTo,
    subject: `Invoice from ${agencyName} via Mershal`,
    html
  });
}

export async function sendInvoicePaidEmail(
  to: string,
  ownerName: string,
  invoiceNumber: string,
  total: number,
): Promise<void> {
  const html = renderInvoicePaidEmailHtml(ownerName, invoiceNumber, total);
  await resend.emails.send({
    from: PAYMENTS_FROM,
    to,
    replyTo: DEFAULT_REPLY_TO,
    subject: `✅ Invoice ${invoiceNumber} has been paid`,
    html
  });
}

export async function sendOverdueReminderEmail(
  to: string,
  clientName: string,
  invoiceNumber: string,
  daysOverdue: number,
): Promise<void> {
  const isSubscription = invoiceNumber === "your subscription";
  const html = renderOverdueReminderEmailHtml(clientName, invoiceNumber, daysOverdue);
  await resend.emails.send({
    from: PAYMENTS_FROM,
    to,
    replyTo: DEFAULT_REPLY_TO,
    subject: isSubscription 
      ? `Reminder: Your Mershal subscription payment is overdue`
      : `Reminder: Invoice ${invoiceNumber} is ${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} overdue`,
    html,
  });
}

export async function sendPortalInviteEmail(
  to: string,
  clientName: string,
  portalUrl: string,
  agencyName: string,
  portalPassword?: string,
  freelancerEmail: string = "",
): Promise<void> {
  const html = renderPortalInviteEmailHtml(clientName, portalUrl, agencyName, portalPassword);
  const from = freelancerEmail
    ? `${agencyName} via Mershal <hello@mershal.in>`
    : WELCOME_FROM;
  const replyTo = freelancerEmail || DEFAULT_REPLY_TO;
  await resend.emails.send({
    from,
    to,
    replyTo,
    subject: `${agencyName} has shared your project portal`,
    html
  });
}

export async function sendProposalEmail(
  to: string,
  clientName: string,
  proposalTitle: string,
  proposalUrl: string,
  workspaceName: string = "Mershal Workspace",
  freelancerEmail: string = "",
): Promise<void> {
  const html = renderProposalEmailHtml(clientName, proposalTitle, proposalUrl);
  const from = freelancerEmail
    ? `${workspaceName} via Mershal <hello@mershal.in>`
    : UPDATES_FROM;
  const replyTo = freelancerEmail || DEFAULT_REPLY_TO;
  await resend.emails.send({
    from,
    to,
    replyTo,
    subject: `Proposal for you: ${proposalTitle}`,
    html
  });
}

export async function sendClientWelcomeEmail(
  to: string,
  clientName: string,
  freelancerName: string,
  freelancerEmail: string,
  workspaceName: string,
  portalUrl: string,
  portalPassword?: string,
  personalNote?: string,
): Promise<void> {
  const html = renderClientWelcomeEmail({
    clientName,
    freelancerName,
    freelancerEmail,
    workspaceName,
    portalUrl,
    portalPassword,
    personalNote,
  });
  const from = `${workspaceName} via Mershal <hello@mershal.in>`;
  const replyTo = freelancerEmail || DEFAULT_REPLY_TO;
  await resend.emails.send({
    from,
    to,
    replyTo,
    subject: `You've been added to ${workspaceName}'s workspace on Mershal`,
    html,
  });
}

export function generateSecurePassword(clientName: string = "Client"): string {
  const sanitized = clientName
    .trim()
    .split(/\s+/)[0]
    .replace(/[^a-zA-Z0-9]/g, "");
  const namePart = sanitized || "Client";
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let randomPart = "";
  for (let i = 0; i < 4; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${namePart}-${randomPart}`;
}

export function renderProUpgradeEmailHtml(name: string): string {
  const appUrl = process.env.VITE_APP_URL ?? "https://mershal.in";
  return `
    <!DOCTYPE html>
    <html>
    ${renderEmailHead("Welcome to Mershal Pro")}
    <body style="${emailStyles}">
      <table class="email-body-table" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 40px 0;">
        <tr>
          <td align="center">
            <div class="email-container" style="${emailContainer}">
              ${renderHeader("Mershal", "Your Pro Membership is Active")}
              <div class="email-body" style="${emailBody}">
                <h1 style="color: #0f172a; font-size: 20px; font-weight: 700; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; letter-spacing: -0.5px;">Welcome to Mershal Pro, ${name}!</h1>
                <p style="color: #475569; font-size: 15px; line-height: 24px; margin: 0 0 24px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                  We are thrilled to welcome you to the Pro plan! Your account has been upgraded, and all feature limitations on your workspace have been removed.
                </p>
                
                <p style="color: #0f172a; font-weight: 700; font-size: 12px; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.05em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">What's unlocked on your workspace:</p>
                
                <ul style="color: #475569; font-size: 14px; line-height: 22px; margin: 0 0 28px 0; padding-left: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  <li style="margin-bottom: 8px;"><strong style="color: #0f172a;">Unlimited Projects & Clients:</strong> Grow your pipeline without worrying about cap limits.</li>
                  <li style="margin-bottom: 8px;"><strong style="color: #0f172a;">Mershal AI Assistant:</strong> Use AI to draft proposals, map out roadmaps, and generate copy instantly.</li>
                  <li style="margin-bottom: 8px;"><strong style="color: #0f172a;">Branded Client Portals:</strong> Give your clients a secure, branded dashboard to collaborate.</li>
                  <li style="margin-bottom: 8px;"><strong style="color: #0f172a;">Online Payments:</strong> Collect secure card payments from clients directly on invoices.</li>
                </ul>

                <div style="text-align: center; margin: 32px 0;">
                  <a href="${appUrl}/dashboard" style="${btnStyle}">
                    Go to Your Workspace &rarr;
                  </a>
                </div>
                
                <p style="color: #64748b; font-size: 13px; line-height: 18px; margin: 28px 0 0 0; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  If you have any questions or need priority support, just reply to this email!
                </p>
              </div>
              ${renderFooter(false)}
            </div>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export async function sendProUpgradeEmail(to: string, name: string): Promise<void> {
  const html = renderProUpgradeEmailHtml(name);
  await resend.emails.send({
    from: WELCOME_FROM,
    to,
    replyTo: DEFAULT_REPLY_TO,
    subject: "Your Mershal Pro membership is active! 🚀",
    html
  });
}

export function renderProCancelledEmailHtml(name: string): string {
  const appUrl = process.env.VITE_APP_URL ?? "https://mershal.in";
  return `
    <!DOCTYPE html>
    <html>
    \${renderEmailHead("Mershal Pro Subscription Cancelled")}
    <body style="\${emailStyles}">
      <table class="email-body-table" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 40px 0;">
        <tr>
          <td align="center">
            <div class="email-container" style="\${emailContainer}">
              \${renderHeader("Mershal", "Subscription Cancelled")}
              <div class="email-body" style="\${emailBody}">
                <h1 style="color: #0f172a; font-size: 20px; font-weight: 700; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; letter-spacing: -0.5px;">Hello \${name},</h1>
                <p style="color: #475569; font-size: 15px; line-height: 24px; margin: 0 0 24px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                  This email confirms that your Mershal Pro subscription has been cancelled. Your workspace has been moved to the Free plan.
                </p>
                <p style="color: #475569; font-size: 15px; line-height: 24px; margin: 0 0 24px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                  Your existing data is safe, but some features (like AI assistant, client portal access, and unlimited clients/projects/invoices) are now restricted according to the Free tier limits.
                </p>
                
                <div style="text-align: center; margin: 32px 0;">
                  <a href="\${appUrl}/dashboard/settings?tab=billing" style="\${btnStyle}">
                    Reactivate Mershal Pro &rarr;
                  </a>
                </div>
                
                <p style="color: #64748b; font-size: 13px; line-height: 18px; margin: 28px 0 0 0; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  We are sad to see you go! If you have any feedback or if there's anything we can do to make Mershal better for you, please reply directly to this email.
                </p>
              </div>
              \${renderFooter(true)}
            </div>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export async function sendProCancelledEmail(to: string, name: string): Promise<void> {
  const html = renderProCancelledEmailHtml(name);
  await resend.emails.send({
    from: WELCOME_FROM,
    to,
    replyTo: DEFAULT_REPLY_TO,
    subject: "Your Mershal Pro subscription has been cancelled 😔",
    html
  });
}

export function renderLimitReachedEmailHtml(name: string, feature: string, limitVal: number | boolean): string {
  const appUrl = process.env.VITE_APP_URL ?? "https://mershal.in";
  
  let explanation = "";
  let featureTitle = feature;
  
  if (feature.toLowerCase() === "clients") {
    explanation = `You have reached the Free plan limit of <strong>\${limitVal} client\${limitVal !== 1 ? "s" : ""}</strong>.`;
    featureTitle = "Clients";
  } else if (feature.toLowerCase() === "projects") {
    explanation = `You have reached the Free plan limit of <strong>\${limitVal} project\${limitVal !== 1 ? "s" : ""}</strong>.`;
    featureTitle = "Projects";
  } else if (feature.toLowerCase() === "invoices") {
    explanation = `You have reached the Free plan limit of <strong>\${limitVal} invoice\${limitVal !== 1 ? "s" : ""}</strong>.`;
    featureTitle = "Invoices";
  } else {
    explanation = `You attempted to use the <strong>\${feature}</strong>, which is a Pro-only feature on Mershal.`;
    featureTitle = feature;
  }

  return `
    <!DOCTYPE html>
    <html>
    \${renderEmailHead("Free Plan Limit Reached")}
    <body style="\${emailStyles}">
      <table class="email-body-table" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 40px 0;">
        <tr>
          <td align="center">
            <div class="email-container" style="\${emailContainer}">
              \${renderHeader("Mershal", "Workspace Alert")}
              <div class="email-body" style="\${emailBody}">
                <h1 style="color: #0f172a; font-size: 20px; font-weight: 700; margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; letter-spacing: -0.5px;">Hello \${name},</h1>
                <p style="color: #475569; font-size: 15px; line-height: 24px; margin: 0 0 24px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                  \${explanation} To continue growing your business and utilizing advanced workflows without interruptions, upgrade to Mershal Pro.
                </p>
                
                <p style="color: #0f172a; font-weight: 700; font-size: 12px; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.05em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">What you get with Mershal Pro ($19/mo):</p>
                
                <ul style="color: #475569; font-size: 14px; line-height: 22px; margin: 0 0 28px 0; padding-left: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  <li style="margin-bottom: 8px;"><strong style="color: #0f172a;">Unlimited Projects & Clients:</strong> Grow your pipeline without worrying about cap limits.</li>
                  <li style="margin-bottom: 8px;"><strong style="color: #0f172a;">Mershal AI Assistant:</strong> Use AI to draft proposals, map out roadmaps, and generate copy instantly.</li>
                  <li style="margin-bottom: 8px;"><strong style="color: #0f172a;">Branded Client Portals:</strong> Give your clients a secure, branded dashboard to collaborate.</li>
                  <li style="margin-bottom: 8px;"><strong style="color: #0f172a;">Online Payments:</strong> Collect secure card payments from clients directly on invoices.</li>
                </ul>

                <div style="text-align: center; margin: 32px 0;">
                  <a href="\${appUrl}/dashboard/settings?tab=billing" style="\${btnStyle}">
                    Upgrade to Mershal Pro &rarr;
                  </a>
                </div>
                
                <p style="color: #64748b; font-size: 13px; line-height: 18px; margin: 28px 0 0 0; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  Questions? Reply directly to this email to get in touch with our support team.
                </p>
              </div>
              \${renderFooter(true)}
            </div>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export async function sendLimitReachedEmail(to: string, name: string, feature: string, limitVal: number | boolean): Promise<void> {
  const html = renderLimitReachedEmailHtml(name, feature, limitVal);
  await resend.emails.send({
    from: WELCOME_FROM,
    to,
    replyTo: DEFAULT_REPLY_TO,
    subject: `Action Required: Free limit reached for \${feature} 🚀`,
    html
  });
}

