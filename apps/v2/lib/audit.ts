import type { Prisma, PrismaClient } from "@prisma/client"
import { db } from "@/lib/db"

interface AuditInput {
  entityType: string
  entityId: string
  action: string
  actorType?: string
  actorId?: string | null
  actorName?: string | null
  newValue?: Prisma.InputJsonValue
  oldValue?: Prisma.InputJsonValue
  metadata?: Prisma.InputJsonValue
}

// Write an audit log entry. Accepts a transaction client so it can share the
// caller's transaction; audit failures never block the primary operation.
export async function writeAudit(
  input: AuditInput,
  client: PrismaClient | Prisma.TransactionClient = db,
): Promise<void> {
  try {
    await client.auditLog.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        actorType: input.actorType ?? "system",
        actorId: input.actorId ?? null,
        actorName: input.actorName ?? null,
        newValue: input.newValue,
        oldValue: input.oldValue,
        metadata: input.metadata,
      },
    })
  } catch (err) {
    console.error("writeAudit failed:", err)
  }
}
