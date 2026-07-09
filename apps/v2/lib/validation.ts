import { z } from "zod"

// Payload for POST /api/tasks (docs/V2_API_SPEC.md §2). Photo is a URL in v2
// (uploaded separately), not base64 as in v1.
export const createTaskSchema = z.object({
  outlet: z.string().min(1, "Outlet wajib diisi"),
  area: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  task_title: z.string().min(1, "Judul tugas wajib diisi").max(500),
  task_description: z.string().max(5000).optional().default(""),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]).default("Medium"),
  pic_name: z.string().min(1, "Nama PIC wajib diisi").max(200),
  pic_wa: z
    .string()
    .min(6, "Nomor WhatsApp tidak valid")
    .max(20)
    .regex(/^[0-9+]+$/, "Nomor WhatsApp hanya boleh angka"),
  deadline: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Deadline tidak valid"),
  before_photo_url: z.string().url().optional(),
})

export type CreateTaskInput = z.infer<typeof createTaskSchema>

const FIELD_LABELS: Record<string, string> = {
  outlet: "Outlet",
  area: "Area",
  category: "Kategori",
  task_title: "Judul tugas",
  task_description: "Deskripsi",
  priority: "Prioritas",
  pic_name: "Nama PIC",
  pic_wa: "Nomor WhatsApp",
  deadline: "Deadline",
  before_photo_url: "URL foto",
}

// Flatten Zod issues into a single human-readable message (Indonesian).
export function firstIssueMessage(err: z.ZodError): string {
  const issue = err.issues[0]
  if (!issue) return "Data tidak valid"
  // Zod's generic "Required" isn't helpful on its own — prefix the field label.
  if (issue.message === "Required") {
    const field = FIELD_LABELS[String(issue.path[0])] ?? String(issue.path[0])
    return `${field} wajib diisi`
  }
  return issue.message
}
