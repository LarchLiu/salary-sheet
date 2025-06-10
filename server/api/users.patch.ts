import type { User } from '~/types'

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
      salary = ${user.salary ?? 4900}
    WHERE id = ${user.id};
    `
  return 'sucess'
})
