/**
 * StatusBadge — maps all status strings to psychology-driven badge variants
 *
 * Color is processed 60,000x faster than text.
 * Status is recognized before the word is even read.
 * Sentence case (not UPPERCASE) — uppercase in dense UIs creates anxiety.
 * Muted backgrounds don't compete with surrounding content.
 */
import { Badge } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";
import type { badgeVariants } from "@/components/ui/badge";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

// Maps every possible status string → badge variant + display label
const STATUS_MAP: Record<string, { variant: BadgeVariant; label: string }> = {
  // Project statuses
  planning:    { variant: "planning",    label: "Planning" },
  in_progress: { variant: "in-progress", label: "In progress" },
  review:      { variant: "review",      label: "Review" },
  completed:   { variant: "completed",   label: "Completed" },
  cancelled:   { variant: "cancelled",   label: "Cancelled" },

  // Legacy display strings (from dummy data)
  Planning:    { variant: "planning",    label: "Planning" },
  "In Progress":{ variant: "in-progress",label: "In progress" },
  Review:      { variant: "review",      label: "Review" },
  Completed:   { variant: "completed",   label: "Completed" },

  // Invoice statuses
  draft:       { variant: "draft",       label: "Draft" },
  sent:        { variant: "pending",     label: "Sent" },
  paid:        { variant: "paid",        label: "Paid" },
  overdue:     { variant: "overdue",     label: "Overdue" },
  pending_verification: { variant: "review", label: "Verification" },

  // Legacy invoice display strings
  Paid:        { variant: "paid",        label: "Paid" },
  Pending:     { variant: "pending",     label: "Pending" },
  Overdue:     { variant: "overdue",     label: "Overdue" },

  // Client statuses
  active:      { variant: "active",      label: "Active" },
  inactive:    { variant: "inactive",    label: "Inactive" },
  lead:        { variant: "lead",        label: "Lead" },

  // Task statuses
  todo:        { variant: "planning",    label: "To do" },
  done:        { variant: "completed",   label: "Done" },

  // Priority levels
  high:        { variant: "high",        label: "High" },
  medium:      { variant: "medium",      label: "Medium" },
  low:         { variant: "low",         label: "Low" },
  High:        { variant: "high",        label: "High" },
  Medium:      { variant: "medium",      label: "Medium" },
  Low:         { variant: "low",         label: "Low" },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_MAP[status] ?? { variant: "outline" as BadgeVariant, label: status };
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
