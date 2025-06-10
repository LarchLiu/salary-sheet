import type { User } from '~/types'
import { maxSalary } from '../utils/constants'

export default defineEventHandler(async (event) => {
  const user = await readBody<User>(event)
  const db = useDatabase()

  await db.sql`
    UPDATE user
    SET
      identity = ${user.identity.toString()},
      name = ${user.name},
      phone = ${user.phone.toString()},
      bankcard = ${user.bankcard.toString()},
      address = ${user.address},
      salary = ${user.salary || maxSalary}
    WHERE id = ${user.id};
    `
  return 'sucess'
})
