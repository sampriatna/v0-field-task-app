import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

// Seed master data derived from v1 hardcoded enums (lib/types.ts).
const OUTLETS = [
  { code: "KBU", name: "Kopi Buri Umah" },
  { code: "KISAMEN", name: "Kisamen" },
  { code: "SAMTARO", name: "Samtaro Express" },
]

const AREAS = ["Dapur", "Bar", "Floor", "Gudang", "Toilet", "Outdoor", "Maintenance", "Kebon", "Kasir"]

const CATEGORIES = ["Cleaning", "Maintenance", "Stock", "Kitchen", "Bar", "Floor", "Waste", "General"]

async function main() {
  console.log("Seeding outlets...")
  for (const outlet of OUTLETS) {
    await db.outlet.upsert({
      where: { code: outlet.code },
      create: outlet,
      update: { name: outlet.name },
    })
  }

  console.log("Seeding categories...")
  for (const name of CATEGORIES) {
    await db.category.upsert({
      where: { name },
      create: { name },
      update: {},
    })
  }

  // In v1 areas are global enums; seed them per-outlet so each outlet has its own set.
  console.log("Seeding areas per outlet...")
  const outlets = await db.outlet.findMany()
  for (const outlet of outlets) {
    for (const name of AREAS) {
      await db.area.upsert({
        where: { outletId_name: { outletId: outlet.id, name } },
        create: { outletId: outlet.id, name },
        update: {},
      })
    }
  }

  console.log("Seed complete.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
