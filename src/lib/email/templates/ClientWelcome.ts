/**
 * ClientWelcome email template
 *
 * Beautiful HTML-based welcome email using inline styles (no JSX/React Email).
 * Matches Mershal brand design. Used by sendClientWelcomeEmail().
 */

export interface ClientWelcomeEmailProps {
  clientName: string;
  freelancerName: string;
  freelancerEmail: string;
  workspaceName: string;
  portalUrl: string;
  portalPassword?: string;
  personalNote?: string;
}

export function renderClientWelcomeEmail({
  clientName,
  freelancerName,
  freelancerEmail,
  workspaceName,
  portalUrl,
  portalPassword,
  personalNote,
}: ClientWelcomeEmailProps): string {
  const initials = freelancerName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const noteText = personalNote?.trim() 
    ? personalNote.trim() 
    : `Looking forward to working with you. Feel free to message me directly through your portal if you have any questions.`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>You've been added to ${workspaceName}'s workspace</title>
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
        padding: 28px 20px 20px !important;
      }
      .email-body {
        padding: 0 20px 20px 20px !important;
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
      .email-footer {
        padding: 20px 20px !important;
      }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;-webkit-font-smoothing:antialiased;">

  <table width="100%" cellpadding="0" cellspacing="0" class="email-body-table" style="background:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <!-- Expanded width: 620px -->
        <table width="620" cellpadding="0" cellspacing="0" class="email-container" style="max-width:620px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 24px rgba(0,0,0,0.03);">

          <!-- ═══ HEADER ═══ -->
          <tr>
            <td class="email-header" style="padding: 44px 44px 28px; text-align: left;">
              <table border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 16px; border-collapse: collapse;">
                <tr>
                  <td style="background-color: #f1f5f9; border-radius: 8px; width: 38px; height: 38px; text-align: center; vertical-align: middle; border: 1px solid #e2e8f0;">
                    <span style="color: #475569; font-size: 13.5px; font-weight: 700; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 38px; display: inline-block;">${initials}</span>
                  </td>
                  <td style="padding-left: 12px; vertical-align: middle;">
                    <span style="color: #0f172a; font-size: 16px; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; letter-spacing: -0.2px;">${workspaceName}</span>
                  </td>
                  <td style="padding-left: 10px; vertical-align: middle;">
                    <span style="color: #94a3b8; font-size: 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-weight: 700; background-color: #f8fafc; padding: 3px 8px; border-radius: 4px; border: 1px solid #e2e8f0; letter-spacing: 0.05em; text-transform: uppercase;">via Mer<span style="color: #5E6AD2;">shal</span></span>
                  </td>
                </tr>
              </table>
              <p style="color: #64748b; margin: 0; font-size: 12px; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; letter-spacing: 0.07em; text-transform: uppercase;">Client Onboarding</p>
            </td>
          </tr>

          <!-- ═══ HERO ═══ -->
          <tr>
            <td class="email-body" style="padding: 0 44px 28px; background: #ffffff;">
              <h1 style="margin: 0 0 16px; font-size: 21px; font-weight: 700; color: #0f172a; letter-spacing: -0.5px; line-height: 1.35; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                Hi ${clientName}, 👋
              </h1>
              <p style="margin: 0; font-size: 15.5px; color: #475569; line-height: 1.65; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <strong style="color: #0f172a;">${freelancerName}</strong> from <strong style="color: #0f172a;">${workspaceName}</strong> has added you to their client workspace on Mershal.
              </p>
              <p style="margin: 16px 0 0; font-size: 15.5px; color: #475569; line-height: 1.65; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                You now have a <strong style="color: #0f172a;">private portal</strong> where you can track project progress, view and approve deliverables, upload files, and message ${freelancerName} directly — all in one place.
              </p>
            </td>
          </tr>

          <!-- ═══ FEATURE GRID (TWO COLUMN) ═══ -->
          <tr>
            <td class="email-body" style="padding: 0 44px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #ffffff; border-collapse: collapse;">
                <tr>
                  <td>
                    <p style="margin: 0 0 16px; font-size: 12px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Your portal includes:</p>
                    
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
                      <tr>
                        <!-- Col 1 -->
                        <td width="48%" valign="top" class="responsive-cell">
                          <table border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                              <td style="padding: 14px 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                  <tr>
                                    <td width="24" valign="top" style="padding-top: 1px;">
                                      <span style="color: #5E6AD2; font-weight: bold; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">✓</span>
                                    </td>
                                    <td valign="top">
                                      <span style="font-size: 13.5px; color: #334155; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 18px; font-weight: 500;">Project progress tracking</span>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                            <tr style="height: 12px;"><td></td></tr>
                            <tr>
                              <td style="padding: 14px 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                  <tr>
                                    <td width="24" valign="top" style="padding-top: 1px;">
                                      <span style="color: #5E6AD2; font-weight: bold; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">✓</span>
                                    </td>
                                    <td valign="top">
                                      <span style="font-size: 13.5px; color: #334155; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 18px; font-weight: 500;">File sharing &amp; uploads</span>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <!-- Gap -->
                        <td width="4%" class="responsive-gap"></td>
                        <!-- Col 2 -->
                        <td width="48%" valign="top" class="responsive-cell">
                          <table border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                              <td style="padding: 14px 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                  <tr>
                                    <td width="24" valign="top" style="padding-top: 1px;">
                                      <span style="color: #5E6AD2; font-weight: bold; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">✓</span>
                                    </td>
                                    <td valign="top">
                                      <span style="font-size: 13.5px; color: #334155; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 18px; font-weight: 500;">Invoice history &amp; payments</span>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                            <tr style="height: 12px;"><td></td></tr>
                            <tr>
                              <td style="padding: 14px 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                  <tr>
                                    <td width="24" valign="top" style="padding-top: 1px;">
                                      <span style="color: #5E6AD2; font-weight: bold; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">✓</span>
                                    </td>
                                    <td valign="top">
                                      <span style="font-size: 13.5px; color: #334155; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 18px; font-weight: 500;">Direct portal messaging</span>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ═══ CREDENTIALS ═══ -->
          ${portalPassword ? `
          <tr>
            <td class="email-body" style="padding: 0 44px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #ffffff; border-collapse: collapse;">
                <tr>
                  <td style="padding: 18px 24px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; text-align: center; display: block;">
                    <p style="margin: 0 0 6px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Your Secure Access Password</p>
                    <p style="margin: 0; font-size: 18px; font-weight: 700; color: #5E6AD2; font-family: Courier, monospace; letter-spacing: 2px;">${portalPassword}</p>
                    <p style="margin: 6px 0 0; font-size: 11.5px; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5;">Use this unique password to securely access your portal.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ""}

          <!-- ═══ CTA BUTTON ═══ -->
          <tr>
            <td class="email-body" style="padding: 8px 44px 36px; text-align: center;">
              <a href="${portalUrl}"
                 style="background-color: #5E6AD2; color: #ffffff !important; display: inline-block; font-size: 14.5px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 14px rgba(94, 106, 210, 0.18); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                Open your portal &rarr;
              </a>
            </td>
          </tr>

          <!-- ═══ PERSONAL NOTE ═══ -->
          <tr>
            <td class="email-body" style="padding: 0 44px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0" class="personal-note-card" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; border-collapse: collapse;">
                <tr>
                  <td>
                    <p style="margin: 0 0 8px; font-size: 11.5px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      A note from ${freelancerName}
                    </p>
                    <p style="margin: 0 0 20px; font-size: 14.5px; color: #334155; line-height: 1.6; font-style: italic; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; white-space: pre-wrap;">"${noteText}"</p>
                    <table cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                      <tr>
                        <td>
                          <div style="width: 36px; height: 36px; border-radius: 50%; background: #5E6AD2; text-align: center; line-height: 36px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                            <span style="color: #ffffff; font-size: 13px; font-weight: 700;">${initials}</span>
                          </div>
                        </td>
                        <td style="padding-left: 12px; vertical-align: middle;">
                          <p style="margin: 0; font-size: 13.5px; font-weight: 600; color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${freelancerName}</p>
                          <a href="mailto:${freelancerEmail}" style="font-size: 12.5px; color: #5E6AD2; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 500;">${freelancerEmail}</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ═══ FOOTER ═══ -->
          <tr>
            <td class="email-footer" style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 44px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 18px;">
                This secure link is private. Please do not share it.
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                Powered by <a href="https://mershal.in" style="color: #5E6AD2; text-decoration: none; font-weight: 600;">Mershal OS</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}
