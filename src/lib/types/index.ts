import type { Timestamp } from "firebase-admin/firestore";

// ─── User ────────────────────────────────────────────────────────────────────

export type Plan = "free" | "pro";

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  avatarUrl: string;
  workspaceName: string;
  mobileNumber: string;
  timezone?: string;
  country?: string;
  onboardingCompleted: boolean;
  plan: Plan;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  subscriptionStatus: string;
  stripePublishableKey?: string;
  stripeSecretKey?: string;
  razorpayKeyId?: string;
  razorpayKeySecret?: string;
  activePaymentGateway?: "stripe" | "razorpay" | "none";
  isAdmin?: boolean;
  autoWelcomeEmail?: boolean;
  referredBy?: string;
  referralCodeUsed?: string;
  referralCode?: string;
  referralCreditsGranted?: number;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  twoFactorEnabled?: boolean;
}

// ─── Client ──────────────────────────────────────────────────────────────────

export type ClientStatus = "active" | "inactive" | "lead";

export interface Client {
  id: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  website: string;
  notes: string;
  status: ClientStatus;
  avatarUrl: string;
  portalToken?: string;
  portalPassword?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

// ─── Project ─────────────────────────────────────────────────────────────────

export type ProjectStatus = "planning" | "in_progress" | "review" | "completed" | "cancelled";
export type Priority = "low" | "medium" | "high";

export interface Project {
  id: string;
  clientId: string;
  name: string;
  description: string;
  status: ProjectStatus;
  priority: Priority;
  startDate: Timestamp | null;
  dueDate: Timestamp | null;
  budget: number;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

// ─── Task ─────────────────────────────────────────────────────────────────────

export type TaskStatus = "todo" | "in_progress" | "review" | "done";

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: Timestamp | null;
  position: number;
  subtasks?: Subtask[];
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

// ─── Invoice ─────────────────────────────────────────────────────────────────

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled" | "pending_verification";

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  clientId: string;
  projectId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDate: Timestamp | null;
  dueDate: Timestamp | null;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes: string;
  stripePaymentIntentId: string;
  paidAt: Timestamp | null;
  paymentProof?: { name: string; size: string; date: string };
  paymentProofSubmittedAt?: Timestamp | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

// ─── AI ──────────────────────────────────────────────────────────────────────

export type MessageRole = "user" | "assistant";

export interface Conversation {
  id: string;
  title: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: Timestamp | null;
}

// ─── Portal Token ─────────────────────────────────────────────────────────────

export interface PortalToken {
  clientId: string;
  userId: string;
  expiresAt: Timestamp;
  createdAt: Timestamp;
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export interface RevenuePoint {
  month: string;
  revenue: number;
}

export interface DashboardStats {
  activeProjects: number;
  monthRevenue: number;
  pendingTasks: number;
  overdueInvoices: number;
  lastWeekClients?: number;
  lastWeekProjects?: number;
  lastWeekRevenue?: number;
  recentProjects: Project[];
  recentClients: Client[];
  revenueChart: RevenuePoint[];
}
