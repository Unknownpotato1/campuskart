import { seedCollegesIfEmpty, listColleges } from "../src/lib/firestore"

async function main() {
  console.log("Seeding colleges into Firestore...")
  const added = await seedCollegesIfEmpty()
  if (added > 0) {
    console.log(`✓ Seeded ${added} colleges into Firestore.`)
  } else {
    console.log("Colleges collection already populated — skipping.")
  }
  const total = (await listColleges()).length
  console.log(`Total colleges in Firestore: ${total}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    // Allow the process to exit; firebase-admin keeps connections open.
    process.exit(0)
  })
