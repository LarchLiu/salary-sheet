export default defineNitroPlugin(async (_nitroApp) => {
  const db = useDatabase()

  // Create user table if it doesn't exist
  await db.sql`
    CREATE TABLE IF NOT EXISTS user (
      "id" TEXT PRIMARY KEY,
      "identity" TEXT,
      "name" TEXT,
      "phone" TEXT,
      "bankcard" TEXT,
      "address" TEXT,
      "salary" INTEGER
    )
  `

  // Create salary table if it doesn't exist
  await db.sql`
    CREATE TABLE IF NOT EXISTS salary (
      "id" TEXT PRIMARY KEY,
      "sheet_date" INTEGER,
      "salary_date" TEXT,
      "identity" TEXT,
      "name" TEXT,
      "phone" TEXT,
      "bankcard" TEXT,
      "address" TEXT,
      "salary" INTEGER,
      "daily_wage" INTEGER,
      "attendance_days" REAL,
      "job" TEXT
    )
  `
  console.warn('Database tables checked/created.')
})
