import { createFileRoute } from "@tanstack/react-router";
import { adminDb } from "../../lib/firebase/admin";
import {
  verifyAuth,
  unauthorizedResponse,
  errorResponse,
} from "../../lib/firebase/middleware";
import { checkLimit, getLimitResponse } from "../../lib/limits";
import { chatMessageSchema } from "../../lib/validations";
import { buildMessages, streamChatResponse, detectIntent } from "../../lib/ai/assistant";
import { FieldValue } from "firebase-admin/firestore";
import type { Message } from "../../lib/types";

export const Route = createFileRoute("/api/ai/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const decoded = await verifyAuth(request);
          const limitCheck = await checkLimit(decoded.uid, "ai");
          if (!limitCheck.allowed) {
            return getLimitResponse("AI assistant");
          }
          const body = await request.json();
          const parsed = chatMessageSchema.safeParse(body);
          if (!parsed.success) {
            return errorResponse(parsed.error.message, 400);
          }

          const { message, conversationId } = parsed.data;

          // Get or create conversation
          let convId = conversationId;
          if (!convId) {
            const convRef = await adminDb
              .collection(`users/${decoded.uid}/conversations`)
              .add({
                title: message.slice(0, 60),
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
              });
            convId = convRef.id;
          } else {
            // Update conversation timestamp
            await adminDb
              .doc(`users/${decoded.uid}/conversations/${convId}`)
              .update({ updatedAt: FieldValue.serverTimestamp() });
          }

          // Fetch last 20 messages for context
          const historySnap = await adminDb
            .collection(`users/${decoded.uid}/conversations/${convId}/messages`)
            .orderBy("createdAt", "desc")
            .limit(20)
            .get();

          const history: Message[] = historySnap.docs
            .reverse()
            .map((d) => ({ id: d.id, ...d.data() } as Message));

          // Save user message
          await adminDb
            .collection(`users/${decoded.uid}/conversations/${convId}/messages`)
            .add({
              role: "user",
              content: message,
              createdAt: FieldValue.serverTimestamp(),
            });

          // Build messages for OpenAI
          const messages = buildMessages(history, message);
          const intent = detectIntent(message);

          // Stream response
          const stream = await streamChatResponse(messages);

          // Collect full response to save to Firestore
          const [streamForClient, streamForSave] = stream.tee();

          // Save assistant response asynchronously
          (async () => {
            const reader = streamForSave.getReader();
            const decoder = new TextDecoder();
            let fullResponse = "";
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              fullResponse += decoder.decode(value, { stream: true });
            }
            await adminDb
              .collection(`users/${decoded.uid}/conversations/${convId}/messages`)
              .add({
                role: "assistant",
                content: fullResponse,
                createdAt: FieldValue.serverTimestamp(),
              });
          })().catch(console.error);

          return new Response(streamForClient, {
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "X-Conversation-Id": convId,
              "X-Intent": intent,
              "Transfer-Encoding": "chunked",
            },
          });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AuthError") {
            return unauthorizedResponse();
          }
          console.error("[POST /api/ai/chat]", err);
          return errorResponse("Internal server error");
        }
      },
    },
  },
});
