import type { TaskStatus } from "@prisma/client"

// Dashboard buckets. A task's raw status maps to exactly one summary bucket;
// "late" is derived separately from is_late (a task can be late in any bucket).
export type Bucket = "open" | "submitted" | "done" | "revisi"

export function statusBucket(status: TaskStatus): Bucket {
  switch (status) {
    case "DONE":
    case "VERIFIED":
      return "done"
    case "SUBMITTED":
    case "RESUBMITTED":
    case "WAITING_VERIFICATION":
      return "submitted"
    case "REVISI":
    case "REVISION":
    case "REVISION_REQUESTED":
      return "revisi"
    default:
      // CREATED, SENT, WA_FAILED, OPEN, OPENED, LATE
      return "open"
  }
}

// Statuses grouped by the filter values the frontend sends (?status=OPEN|SUBMITTED|...).
export const STATUS_FILTER_GROUPS: Record<string, TaskStatus[]> = {
  OPEN: ["CREATED", "SENT", "WA_FAILED", "OPEN", "OPENED", "LATE"],
  SUBMITTED: ["SUBMITTED", "RESUBMITTED", "WAITING_VERIFICATION"],
  DONE: ["DONE", "VERIFIED"],
  REVISI: ["REVISI", "REVISION", "REVISION_REQUESTED"],
}
