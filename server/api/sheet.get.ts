import type { Salary } from '~/types'

export default defineEventHandler(async () => {
  const db = useDatabase()

  // Find the maximum sheet_date
  const latestSheetResult = await db.sql`
    SELECT MAX(sheet_date) as max_sheet_date FROM salary
  `
  const maxSheetDate = latestSheetResult.rows?.[0]?.max_sheet_date as number | undefined

  if (maxSheetDate === undefined) {
    return [] // No salary sheets found
  }

  // Fetch all records for the latest sheet_date
  const lastSalarySheet = await db.sql`
    SELECT * FROM salary WHERE sheet_date = ${maxSheetDate}
  `

  // The salary table stores all fields of User, including 'job'.
  // Explicitly map the rows to User[] to satisfy TypeScript.

  return (lastSalarySheet.rows || []) as unknown as Salary[]
})
