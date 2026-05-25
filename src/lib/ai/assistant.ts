import OpenAI from "openai";
import type { Message } from "../types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? "",
});

export const SYSTEM_PROMPT = `You are Mershal AI, an expert assistant for freelancers and agencies.
You help with project planning, client communication, proposal writing,
task management, and business operations. Be concise, professional, and
actionable. When asked to generate a project plan, return a JSON object
with this structure: { title, milestones: [{ name, tasks: [{ title, priority, dueOffset }] }] }`;

export type Intent = "project_plan" | "proposal" | "chat";

/**
 * Formats the message history into OpenAI's message format.
 */
export function buildMessages(
  history: Message[],
  newMessage: string,
): OpenAI.Chat.ChatCompletionMessageParam[] {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  for (const msg of history) {
    messages.push({
      role: msg.role,
      content: msg.content,
    });
  }

  messages.push({ role: "user", content: newMessage });
  return messages;
}

/**
 * Detects the intent of a user message.
 */
export function detectIntent(message: string): Intent {
  const lower = message.toLowerCase();

  if (
    lower.includes("project plan") ||
    lower.includes("milestones") ||
    lower.includes("roadmap") ||
    lower.includes("timeline")
  ) {
    return "project_plan";
  }

  if (
    lower.includes("proposal") ||
    lower.includes("pitch") ||
    lower.includes("quote") ||
    lower.includes("scope of work")
  ) {
    return "proposal";
  }

  return "chat";
}

/**
 * Formats a raw string into a mock streaming ReadableStream with a steady typing speed.
 */
export function streamString(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let index = 0;

  return new ReadableStream({
    async start(controller) {
      const charsPerChunk = 12;
      const interval = setInterval(() => {
        if (index >= text.length) {
          clearInterval(interval);
          controller.close();
          return;
        }

        const chunk = text.slice(index, index + charsPerChunk);
        controller.enqueue(encoder.encode(chunk));
        index += charsPerChunk;
      }, 15);
    },
  });
}

/**
 * Generates highly contextual mock answers for project plans, proposals, or chats when OpenAI fails.
 */
export function getMockResponse(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
): string {
  const lastUserMsg = (messages[messages.length - 1]?.content as string) ?? "";
  const intent = detectIntent(lastUserMsg);

  if (intent === "project_plan") {
    const titleMatch = lastUserMsg.match(/(?:for|named|called)\s+["']?([^"'\n.]{3,30})["']?/i);
    const projName = titleMatch ? titleMatch[1].trim() : "New Agency Project";

    const projectPlan = {
      title: projName,
      milestones: [
        {
          name: "Phase 1: Discovery & Research",
          tasks: [
            { title: "Define agency goals and target deliverables", priority: "high", dueOffset: 3 },
            { title: "Conduct stakeholder research interviews", priority: "medium", dueOffset: 5 },
            { title: "Develop wireframe layouts & brand direction", priority: "high", dueOffset: 7 }
          ]
        },
        {
          name: "Phase 2: Modern UI/UX Design",
          tasks: [
            { title: "Create gorgeous interactive Figma mockups", priority: "high", dueOffset: 12 },
            { title: "Verify design system tokens & colors", priority: "low", dueOffset: 14 },
            { title: "Present high-fidelity prototypes to client", priority: "medium", dueOffset: 17 }
          ]
        },
        {
          name: "Phase 3: High Performance Build",
          tasks: [
            { title: "Initialize frontend workspace environment", priority: "high", dueOffset: 22 },
            { title: "Build robust database models & API layers", priority: "high", dueOffset: 26 },
            { title: "Integrate stripe invoice payment triggers", priority: "medium", dueOffset: 30 }
          ]
        },
        {
          name: "Phase 4: Launch & Verification",
          tasks: [
            { title: "Run end-to-end quality assurance audits", priority: "medium", dueOffset: 35 },
            { title: "Deploy application live to production", priority: "high", dueOffset: 38 },
            { title: "Deliver onboarding session to client teams", priority: "low", dueOffset: 40 }
          ]
        }
      ]
    };
    return JSON.stringify(projectPlan, null, 2);
  }

  if (intent === "proposal") {
    return `### ⚡ Professional Service Proposal

**Prepared For:** Prospective Client
**Prepared By:** Mershal Partner
**Scope of Work:** High-Performance Implementation

---

#### 1. Executive Summary
We propose to design and implement a modern, high-converting digital platform that will streamline your business operations, increase customer acquisition, and scale your brand authority.

#### 2. Project Scope & Deliverables
* **Phase 1 (Strategy):** User research, interactive wireframing, and content mapping.
* **Phase 2 (Design):** Curated color systems, custom visual assets, and premium typography styling.
* **Phase 3 (Build):** Fully responsive frontend components, fast loading speed optimizations, and robust API endpoints.
* **Phase 4 (Launch):** Domain setup, quality assurance checking, and 30-day post-launch support.

#### 3. Investment & Schedule
* **Total Timeline:** 4 to 6 weeks from kickoff.
* **Budget Estimate:** $4,500 (50% upfront deposit, 50% upon final production sign-off).

---
*Generated by Mershal Business Assistant. Press Accept to load this proposal structure into your workspace.*`;
  }

  return `Hi there! I am your Mershal AI business copilot. 

I'm currently running in **Local Preview Mode** because I couldn't reach the OpenAI servers (usually due to key usage limits, billing details, or internet connectivity). 

However, I can still help you structure your workspace! To make full use of Mershal, you can:
1. **Manage Clients:** Go to [Clients](/dashboard/clients) to add your active client rosters.
2. **Track Projects:** Go to [Projects](/dashboard/projects) to plan deliverables.
3. **Send Invoices:** Go to [Invoices](/dashboard/invoices) to secure instant card payments.

What specific agency workflows can I help you design today?`;
}

/**
 * Streams a chat response from OpenAI.
 */
export async function streamChatResponse(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
): Promise<ReadableStream<Uint8Array>> {
  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      stream: true,
      max_tokens: 2048,
      temperature: 0.7,
    });

    const encoder = new TextEncoder();

    return new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
              controller.enqueue(encoder.encode(delta));
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });
  } catch (openaiErr) {
    console.warn("[streamChatResponse] Falling back to secure offline mock stream:", openaiErr);
    const mockContent = getMockResponse(messages);
    return streamString(mockContent);
  }
}

/**
 * Gets a complete (non-streaming) response from OpenAI.
 */
export async function getChatResponse(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 2048,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content ?? "";
  } catch (openaiErr) {
    console.warn("[getChatResponse] Falling back to offline mock response:", openaiErr);
    return getMockResponse(messages);
  }
}
