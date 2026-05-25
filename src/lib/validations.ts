import { z } from "zod";

// ─── Client ──────────────────────────────────────────────────────────────────

export const createClientSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email").max(200),
  company: z.string().max(100).default(""),
  phone: z.string().max(30).default(""),
  website: z.string().url("Invalid URL").max(200).or(z.literal("")).default(""),
  notes: z.string().max(2000).default(""),
  status: z.enum(["active", "inactive", "lead"]).default("active"),
  avatarUrl: z.string().url().or(z.literal("")).default(""),
});

export const updateClientSchema = createClientSchema.partial();

// ─── Project ─────────────────────────────────────────────────────────────────

export const createProjectSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(2000).default(""),
  status: z.enum(["planning", "in_progress", "review", "completed", "cancelled"]).default("planning"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  startDate: z.string().datetime().nullable().default(null),
  dueDate: z.string().datetime().nullable().default(null),
  budget: z.number().min(0).default(0),
});

export const updateProjectSchema = createProjectSchema.partial();

// ─── Task ─────────────────────────────────────────────────────────────────────

export const subtaskSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Subtask title is required").max(300),
  done: z.boolean().default(false),
});

export const createTaskSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  title: z.string().min(1, "Title is required").max(300),
  description: z.string().max(2000).default(""),
  status: z.enum(["todo", "in_progress", "review", "done"]).default("todo"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  dueDate: z.string().datetime().nullable().default(null),
  subtasks: z.array(subtaskSchema).default([]),
});

export const updateTaskSchema = createTaskSchema.partial();

export const reorderTasksSchema = z.object({
  tasks: z.array(
    z.object({
      id: z.string(),
      position: z.number().int().min(0),
      status: z.enum(["todo", "in_progress", "review", "done"]),
    }),
  ),
});

// ─── Invoice ─────────────────────────────────────────────────────────────────

export const invoiceItemSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().min(0),
  unitPrice: z.number().min(0),
  total: z.number().min(0),
});

export const createInvoiceSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  projectId: z.string().default(""),
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled", "pending_verification"]).default("draft"),
  issueDate: z.string().datetime().nullable().default(null),
  dueDate: z.string().datetime().nullable().default(null),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
  subtotal: z.number().min(0),
  taxRate: z.number().min(0).max(100).default(0),
  taxAmount: z.number().min(0).default(0),
  total: z.number().min(0),
  notes: z.string().max(2000).default(""),
  // ─── Recurring invoice fields ─────────────────────────────────────────────
  isRecurring: z.boolean().default(false),
  recurringInterval: z.enum(["weekly", "monthly", "quarterly"]).nullable().default(null),
  recurringNextDate: z.string().datetime().nullable().default(null),
  recurringEndDate: z.string().datetime().nullable().default(null),
  recurringParentId: z.string().nullable().default(null),
});

export const updateInvoiceSchema = createInvoiceSchema.partial();

// ─── Profile ─────────────────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  fullName: z.string().min(1).max(100).optional(),
  workspaceName: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().or(z.literal("")).optional(),
  mobileNumber: z.string().max(20).optional(),
  timezone: z.string().max(50).optional(),
  country: z.string().max(100).optional(),
  onboardingCompleted: z.boolean().optional(),
  onboardingDismissed: z.boolean().optional(),
  confettiShown: z.boolean().optional(),
  autoWelcomeEmail: z.boolean().optional(),
  stripePublishableKey: z.string().max(200).or(z.literal("")).optional(),
  stripeSecretKey: z.string().max(200).or(z.literal("")).optional(),
  razorpayKeyId: z.string().max(200).or(z.literal("")).optional(),
  razorpayKeySecret: z.string().max(200).or(z.literal("")).optional(),
  activePaymentGateway: z.enum(["stripe", "razorpay", "none"]).optional(),
});

// ─── AI Chat ─────────────────────────────────────────────────────────────────

export const chatMessageSchema = z.object({
  message: z.string().min(1, "Message is required").max(4000),
  conversationId: z.string().optional(),
});

// ─── Billing ─────────────────────────────────────────────────────────────────

export const createCheckoutSchema = z.object({
  priceId: z.string().min(1, "Price ID is required"),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

// ─── Portal ──────────────────────────────────────────────────────────────────

export const portalMessageSchema = z.object({
  content: z.string().min(1).max(2000),
  senderName: z.string().min(1).max(100),
});

export const portalPaySchema = z.object({
  invoiceId: z.string().min(1),
});

// ─── Proposals ───────────────────────────────────────────────────────────────

export const proposalLineItemSchema = z.object({
  description: z.string().min(1).max(500),
  quantity: z.number().min(0),
  unitPrice: z.number().min(0),
  total: z.number().min(0),
});

export const createProposalSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  title: z.string().min(1, "Title is required").max(200),
  intro: z.string().max(3000).default(""),
  scope: z.string().max(3000).default(""),
  timeline: z.string().max(1000).default(""),
  terms: z.string().max(3000).default(""),
  lineItems: z.array(proposalLineItemSchema).default([]),
  total: z.number().min(0).default(0),
  validUntil: z.string().datetime().nullable().default(null),
  status: z
    .enum(["draft", "sent", "viewed", "accepted", "declined"])
    .default("draft"),
});

export const updateProposalSchema = createProposalSchema.partial();

