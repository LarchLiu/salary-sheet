import type { User } from '~/types'
import { maxSalary } from '../utils/constants'

export default defineEventHandler(async () => {
  const db = useDatabase()
  const rawUsers = await db.sql`SELECT * FROM user`

  if (rawUsers.rows) {
    for (let i = 0; i < rawUsers.rows.length; i++) {
      const user = rawUsers.rows[i] as unknown as User
      const job = user.salary >= maxSalary ? '模板工' : '普工'
      user.job = job
    }
  }

  return (rawUsers.rows || []) as unknown as User[]
})
