export const clients = [
  { id: "c1", name: "Aria Chen", company: "Northwind Studio", email: "aria@northwind.co", projects: 3, revenue: 24800, initials: "AC" },
  { id: "c2", name: "Marcus Holt", company: "Holt & Co", email: "marcus@holt.co", projects: 2, revenue: 18200, initials: "MH" },
  { id: "c3", name: "Priya Shah", company: "Lumen Labs", email: "priya@lumen.io", projects: 4, revenue: 41200, initials: "PS" },
  { id: "c4", name: "Diego Alvarez", company: "Field Notes", email: "diego@fieldnotes.app", projects: 1, revenue: 6400, initials: "DA" },
  { id: "c5", name: "Sana Iqbal", company: "Halcyon", email: "sana@halcyon.design", projects: 2, revenue: 14900, initials: "SI" },
];

export type ProjectStatus = "Planning" | "In Progress" | "Review" | "Completed";

export const projects: {
  id: string; name: string; client: string; due: string; progress: number; status: ProjectStatus; team: string[];
}[] = [
  { id: "p1", name: "Brand identity refresh", client: "Northwind Studio", due: "Jun 12", progress: 35, status: "In Progress", team: ["AC", "JR"] },
  { id: "p2", name: "E-commerce redesign", client: "Lumen Labs", due: "Jun 22", progress: 72, status: "In Progress", team: ["PS", "JR", "MK"] },
  { id: "p3", name: "Mobile app v2", client: "Holt & Co", due: "Jul 02", progress: 18, status: "Planning", team: ["MH"] },
  { id: "p4", name: "Marketing site", client: "Field Notes", due: "Jun 08", progress: 92, status: "Review", team: ["DA", "AC"] },
  { id: "p5", name: "Investor deck", client: "Halcyon", due: "May 30", progress: 100, status: "Completed", team: ["SI"] },
  { id: "p6", name: "Onboarding flow", client: "Lumen Labs", due: "Jul 14", progress: 8, status: "Planning", team: ["PS", "MK"] },
];

export const invoices = [
  { id: "INV-1042", client: "Northwind Studio", amount: 4800, status: "Paid", date: "May 14" },
  { id: "INV-1043", client: "Lumen Labs", amount: 12400, status: "Pending", date: "May 18" },
  { id: "INV-1044", client: "Holt & Co", amount: 3200, status: "Overdue", date: "Apr 28" },
  { id: "INV-1045", client: "Field Notes", amount: 2150, status: "Paid", date: "May 02" },
  { id: "INV-1046", client: "Halcyon", amount: 6900, status: "Pending", date: "May 20" },
  { id: "INV-1047", client: "Northwind Studio", amount: 1800, status: "Paid", date: "May 06" },
  { id: "INV-1048", client: "Lumen Labs", amount: 9400, status: "Overdue", date: "Apr 22" },
] as const;

export const aiConversations = [
  { id: "a1", title: "Q3 retainer proposal", preview: "Draft a proposal for Lumen Labs..." },
  { id: "a2", title: "Weekly summary", preview: "Summarize this week's tasks..." },
  { id: "a3", title: "New invoice — Holt", preview: "Create invoice for Marcus..." },
  { id: "a4", title: "Project plan: app v2", preview: "Outline milestones for the mobile..." },
];

export const sampleChat = [
  { role: "user" as const, content: "Generate a 4-week project plan for a brand identity refresh." },
  { role: "assistant" as const, content: "Here's a 4-week plan:\n\n• Week 1 — Discovery & moodboards\n• Week 2 — Logo + mark exploration\n• Week 3 — Typography, color, guidelines\n• Week 4 — Applications, handoff & launch kit\n\nWant me to turn this into project tasks?" },
];
