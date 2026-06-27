import { db } from "../src/lib/db"
import { COLLEGES_SEED } from "../src/lib/colleges"

async function main() {
  console.log("Seeding colleges...")
  let count = 0
  for (const c of COLLEGES_SEED) {
    const existing = await db.college.findFirst({
      where: { name: c.name, state: c.state },
    })
    if (!existing) {
      await db.college.create({ data: c })
      count++
    }
  }
  console.log(`Seeded ${count} new colleges.`)
  const total = await db.college.count()
  console.log(`Total colleges in DB: ${total}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
