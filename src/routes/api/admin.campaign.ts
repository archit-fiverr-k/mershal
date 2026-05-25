import { createFileRoute } from "@tanstack/react-router";
import { Resend } from "resend";
import { UPDATES_FROM } from "../../lib/email";

const resend = new Resend(process.env.RESEND_API_KEY ?? "");

function parseTextToHtml(text: string): string {
  return text
    .split(/\n\n+/)
    .map(p => {
      let formatted = p.trim();
      // Bold syntax: **bold** -> <strong>bold</strong>
      formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Link syntax: [text](url) -> <a href="$2" style="color: #5E6AD2; font-weight: 600; text-decoration: underline;">$1</a>
      formatted = formatted.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" style="color: #5E6AD2; font-weight: 600; text-decoration: underline;">$1</a>');
      // Single line break -> <br />
      formatted = formatted.replace(/\n/g, '<br />');
      return `<p style="margin: 0 0 16px 0; line-height: 24px; color: #475569;">${formatted}</p>`;
    })
    .join("\n");
}

function generateCampaignHtml(title: string, contentHtml: string, ctaText?: string, ctaUrl?: string) {
  const btnHtml = ctaText && ctaUrl ? `
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center" style="padding: 24px 0 12px 0;">
          <a href="${ctaUrl}" style="background-color: #5E6AD2; color: #ffffff !important; display: inline-block; font-size: 15px; font-weight: 600; text-decoration: none; padding: 13px 32px; border-radius: 8px; box-shadow: 0 4px 12px rgba(94, 106, 210, 0.2);">
            ${ctaText}
          </a>
        </td>
      </tr>
    </table>
  ` : "";

  return `
    <!DOCTYPE html>
    <html>
    <body style="background-color: #f6f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; -webkit-font-smoothing: antialiased;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f6f9fc; padding: 40px 0;">
        <tr>
          <td align="center">
            <div style="background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.025); width: 100%; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #0f111a; padding: 32px; text-align: center; border-bottom: 3px solid #5E6AD2;">
                <span style="font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">Mer<span style="color: #5E6AD2;">shal</span></span>
                <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.1em;">Official Announcement</p>
              </div>
              <div style="padding: 40px 48px; background-color: #ffffff;">
                <h1 style="color: #0f172a; font-size: 22px; font-weight: 700; margin: 0 0 20px 0; letter-spacing: -0.01em;">${title}</h1>
                <div style="color: #475569; font-size: 15px; line-height: 26px;">
                  ${contentHtml}
                </div>
                ${btnHtml}
              </div>
              <div style="background-color: #f8fafc; padding: 32px 48px; border-top: 1px solid #f1f5f9; text-align: center;">
                <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b;">You received this because you are a registered user of Mershal.</p>
                <p style="margin: 0; font-size: 11px; color: #94a3b8;">&copy; 2026 Mershal OS &middot; mershal.in</p>
              </div>
            </div>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export const Route = createFileRoute("/api/admin/campaign")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { adminDb } = await import("../../lib/firebase/admin");
        const { verifyAuth, unauthorizedResponse, errorResponse, jsonResponse } =
          await import("../../lib/firebase/middleware");
        try {
          const decoded = await verifyAuth(request);
          
          // Verify caller is admin
          const callerSnap = await adminDb.doc(`users/${decoded.uid}`).get();
          if (!callerSnap.exists) return unauthorizedResponse("Caller profile not found");
          const callerData = callerSnap.data();
          const isAdmin = decoded.email === "hello@mershal.in" || callerData?.isAdmin === true;
          if (!isAdmin) return unauthorizedResponse("Access denied");

          // Fetch campaign logs
          const snapshot = await adminDb.collection("campaign_logs").orderBy("sentAt", "desc").get();
          const logs = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          return jsonResponse({ logs });
        } catch (err) {
          if (err instanceof Error && err.name === "AuthError") return unauthorizedResponse();
          console.error("[GET /api/admin/campaign]", err);
          return errorResponse("Internal server error");
        }
      },
      POST: async ({ request }) => {
        const { adminDb } = await import("../../lib/firebase/admin");
        const { verifyAuth, unauthorizedResponse, errorResponse, jsonResponse } =
          await import("../../lib/firebase/middleware");
        try {
          const decoded = await verifyAuth(request);
          
          // Verify caller is admin
          const callerSnap = await adminDb.doc(`users/${decoded.uid}`).get();
          if (!callerSnap.exists) return unauthorizedResponse("Caller profile not found");
          const callerData = callerSnap.data();
          const isAdmin = decoded.email === "hello@mershal.in" || callerData?.isAdmin === true;
          if (!isAdmin) return unauthorizedResponse("Access denied");

          const body = await request.json() as {
            recipientGroup: "all" | "pro" | "free" | "test";
            subject: string;
            headerTitle: string;
            bodyMarkdown: string;
            ctaText?: string;
            ctaUrl?: string;
          };

          if (!body.subject || !body.headerTitle || !body.bodyMarkdown) {
            return errorResponse("Missing email content parameters", 400);
          }

          const contentHtml = parseTextToHtml(body.bodyMarkdown);
          const emailHtml = generateCampaignHtml(body.headerTitle, contentHtml, body.ctaText, body.ctaUrl);

          if (body.recipientGroup === "test") {
            // Send single test email to the caller
            await resend.emails.send({
              from: UPDATES_FROM,
              to: decoded.email as string,
              subject: `[TEST] ${body.subject}`,
              html: emailHtml,
            });

            // Log the campaign in Firestore
            await adminDb.collection("campaign_logs").add({
              subject: body.subject,
              recipientGroup: "test",
              recipientCount: 1,
              sentAt: new Date().toISOString(),
              sentBy: decoded.email,
              headerTitle: body.headerTitle,
              bodyMarkdown: body.bodyMarkdown,
              openRateMock: 100,
              clickRateMock: 100,
            });

            return jsonResponse({ success: true, count: 1 });
          }

          // Fetch target users based on group
          let query: any = adminDb.collection("users");
          if (body.recipientGroup === "pro") {
            query = query.where("plan", "==", "pro");
          } else if (body.recipientGroup === "free") {
            query = query.where("plan", "==", "free");
          }

          const snapshot = await query.get();
          const users = snapshot.docs.map((doc: any) => doc.data());
          const emails = users.map((u: any) => u.email).filter(Boolean);

          if (emails.length === 0) {
            return jsonResponse({ success: true, count: 0 });
          }

          // Send in batches of 10 to avoid hitting rapid rate limits in Resend
          const batchSize = 10;
          for (let i = 0; i < emails.length; i += batchSize) {
            const batch = emails.slice(i, i + batchSize);
            await Promise.all(
              batch.map((email: string) =>
                resend.emails.send({
                  from: UPDATES_FROM,
                  to: email,
                  subject: body.subject,
                  html: emailHtml,
                }).catch(err => {
                  console.error(`Failed to send campaign email to ${email}:`, err);
                })
              )
            );
          }

          // Log the campaign in Firestore
          await adminDb.collection("campaign_logs").add({
            subject: body.subject,
            recipientGroup: body.recipientGroup,
            recipientCount: emails.length,
            sentAt: new Date().toISOString(),
            sentBy: decoded.email,
            headerTitle: body.headerTitle,
            bodyMarkdown: body.bodyMarkdown,
            openRateMock: Math.floor(Math.random() * (85 - 45 + 1)) + 45, // mock 45%-85%
            clickRateMock: Math.floor(Math.random() * (35 - 12 + 1)) + 12, // mock 12%-35%
          });

          return jsonResponse({ success: true, count: emails.length });
        } catch (err) {
          if (err instanceof Error && err.name === "AuthError") return unauthorizedResponse();
          console.error("[POST /api/admin/campaign]", err);
          return errorResponse("Internal server error");
        }
      },
    },
  },
});
