import { createFileRoute } from "@tanstack/react-router";
import { adminDb } from "../../lib/firebase/admin";
import {
  verifyAuth,
  unauthorizedResponse,
  errorResponse,
  jsonResponse,
} from "../../lib/firebase/middleware";

// ─── System prompts per context ───────────────────────────────────────────────

const SYSTEM_PROMPTS: Record<string, string> = {
  invoice_notes:
    "You are a professional invoice writer. Write a brief, professional payment note for an invoice. 2-3 sentences max. Polite, clear, include payment terms reminder. Return only the note text.",

  project_description:
    "You are an agency project manager. Write a clear, professional project description based on the project name/context provided. 3-4 sentences. Include scope and deliverables hint. Return only the description text.",

  task_title:
    "You are a productivity expert. Improve this task title to be more specific and actionable. Return only the improved title, nothing else. Under 10 words.",

  task_description:
    "You are a project manager. Write a clear task description with acceptance criteria. 2-3 sentences. Describe what 'done' looks like. Return only the description.",

  client_notes:
    "You are a CRM assistant. Summarize or expand these client notes into a clean, professional client brief. Key points only. 3-4 sentences. Return only the note text.",

  proposal_intro:
    "You are a freelance proposal writer. Write a compelling project proposal introduction paragraph. Professional, confident, client-focused. 3-4 sentences. Return only the intro text.",

  proposal_scope:
    "You are an agency scope writer. Write a clear scope of work section based on the context. Include what is and is not included. 3-5 sentences. Return only the scope text.",

  proposal_timeline:
    "You are a project planner. Write a brief project timeline description with key phases. 2-3 sentences. Return only the timeline text.",

  proposal_terms:
    "You are a freelance contract writer. Write standard freelance proposal payment terms. Include deposit, final payment, revision policy. 3-5 sentences. Professional tone. Return only the terms text.",
};

const DAILY_LIMIT = 50;

export const Route = createFileRoute("/api/ai/inline")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const decoded = await verifyAuth(request);
          const uid = decoded.uid;

          // ── Check plan ────────────────────────────────────────────────────
          const userSnap = await adminDb.doc(`users/${uid}`).get();
          const userData = userSnap.data();
          if (!userData || userData.plan !== "pro") {
            return errorResponse("AI inline features require a Pro plan", 403);
          }

          // ── Rate limit check ──────────────────────────────────────────────
          const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
          const usageField = `aiInlineUsage.${today.replace(/-/g, "_")}`;
          const currentUsage: number = userData?.aiInlineUsage?.[today.replace(/-/g, "_")] ?? 0;
          if (currentUsage >= DAILY_LIMIT) {
            return errorResponse(`Daily AI limit (${DAILY_LIMIT} calls) reached. Resets tomorrow.`, 429);
          }

          // ── Parse body ────────────────────────────────────────────────────
          const body = await request.json();
          const { context, currentValue } = body as { context: string; currentValue: string };

          const systemPrompt = SYSTEM_PROMPTS[context];
          if (!systemPrompt) {
            return errorResponse("Unknown AI context", 400);
          }

          // ── Call OpenAI ───────────────────────────────────────────────────
          const { OpenAI } = await import("openai");
          const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: currentValue
                  ? `Context/existing value: "${currentValue}"\n\nGenerate improved content.`
                  : "Generate content for this field.",
              },
            ],
            max_tokens: 300,
            temperature: 0.7,
          });

          const text = completion.choices[0]?.message?.content?.trim() ?? "";

          // ── Increment usage counter ───────────────────────────────────────
          const { FieldValue } = await import("firebase-admin/firestore");
          await adminDb.doc(`users/${uid}`).update({
            [usageField]: FieldValue.increment(1),
          });

          return jsonResponse({ text });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError")
            return unauthorizedResponse();
          console.error("[POST /api/ai/inline]", err);
          return errorResponse("Internal server error");
        }
      },
    },
  },
});
