import type { User } from '~/types'
import OpenAI from 'openai'
import { v4 as uuidv4 } from 'uuid'

const prompt = `帮我识别图片上的中国人员信息，姓名，身份证号(18位)，电话(13位)，工资，银行卡号(19位)，开户行地址。

返回json格式：
interface Info {
name:string
identity?: string
phone?:string,
salary: number
bankcard?: string
address?: string
}

return Info[]
仅返回 json 数据，不要有任何其他解释性文字。`

export default defineEventHandler(async (event) => {
  const runtimeConfig = useRuntimeConfig()
  const openai = new OpenAI({
    baseURL: runtimeConfig.aiApiBaseUrl,
    apiKey: runtimeConfig.aiApiKey,
  })
  const db = useDatabase()

  const parts = await readMultipartFormData(event)

  if (!parts || parts.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No form data provided' })
  }

  const allUsers: User[] = []
  const errorMessages: string[] = []

  for (const part of parts) {
    if (part.name === 'image' && part.filename) {
      const fileBuffer = part.data
      const fileType = part.type

      let openaiResponse = null
      try {
        const base64Image = fileBuffer.toString('base64')

        const response = await openai.chat.completions.create({
          model: runtimeConfig.aiModel,
          temperature: 0.1,
          messages: [
            {
              role: 'system',
              content: prompt,
            },
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${fileType};base64,${base64Image}`,
                  },
                },
              ],
            },
          ],
        })
        openaiResponse = response.choices[0].message.content || '[]'
      }
      catch (error: any) {
        console.error('Error calling OpenAI API:', error)
        throw createError({ statusCode: 400, message: error.message || error.statusMessage })
      }

      const users = JSON.parse(openaiResponse.replace(/^(\n)?```json\n/, '').replace(/```(\n)?$/, '')) as User[]

      try {
        for (let i = 0; i < users.length; i++) {
          const user = users[i]

          const existingUser = await db.sql`
              SELECT * FROM user WHERE identity = ${user.identity} OR name = ${user.name}
            `

          if (!existingUser.rows || existingUser.rows.length === 0) {
            if (user.identity && user.name && user.address && user.bankcard && user.phone) {
              const newUserId = uuidv4()
              const result = await db.sql`
                  INSERT INTO user (id, identity, name, phone, bankcard, address, salary)
                  VALUES (${newUserId}, ${user.identity.toString()}, ${user.name}, ${user.phone.toString()}, ${user.bankcard.toString()}, ${user.address}, ${user.salary || 4900})
                  RETURNING id;
                `
              if (!result.rows || result.rows.length === 0 || !result.rows[0].id) {
                errorMessages.push('Failed to retrieve new user ID after insertion.')
                continue
              }
              allUsers.push({
                id: newUserId,
                identity: user.identity.toString(),
                name: user.name,
                phone: user.phone.toString(),
                bankcard: user.bankcard.toString(),
                address: user.address,
                salary: user.salary || 4900,
              })
            }
            else {
              errorMessages.push(`识别人员信息不完整, 身份证: ${user.identity || '无'}, 名字: ${user.name || '无'}, 电话: ${user.phone || '无'}, 银行卡: ${user.bankcard || '无'}, 开户行: ${user.address || '无'}, 工资: ${user.salary || '无'}`)
            }
          }
          else {
            // If multiple records exist, keep only one and delete the others
            if (existingUser.rows.length > 1) {
              const userToKeep = existingUser.rows[0]
              if (!userToKeep.id) {
                errorMessages.push('Existing user record missing ID.')
                continue
              }
              for (let i = 1; i < existingUser.rows.length; i++) {
                const userToDelete = existingUser.rows[i]
                if (userToDelete.id) { // Ensure id exists before deleting
                  await db.sql`DELETE FROM user WHERE id = ${userToDelete.id}`
                }
              }
              // Update the kept user with the new data
              if (user.identity && user.name && user.address && user.bankcard && user.phone) {
                await db.sql`
                    UPDATE user
                    SET
                      identity = ${user.identity.toString()},
                      name = ${user.name},
                      phone = ${user.phone.toString()},
                      bankcard = ${user.bankcard.toString()},
                      address = ${user.address},
                      salary = ${user.salary ?? userToKeep.salary ?? 4900}
                    WHERE id = ${userToKeep.id};
                  `
                allUsers.push({
                  id: userToKeep.id.toString(),
                  identity: user.identity.toString(),
                  name: user.name,
                  phone: user.phone.toString(),
                  bankcard: user.bankcard.toString(),
                  address: user.address,
                  salary: user.salary ?? userToKeep.salary ?? 4900,
                })
              }
              else {
                errorMessages.push(`识别人员信息不完整, 身份证: ${user.identity || '无'}, 名字: ${user.name || '无'}, 电话: ${user.phone || '无'}, 银行卡: ${user.bankcard || '无'}, 开户行: ${user.address || '无'}, 工资: ${user.salary || '无'}`)
              }
            }
            else {
              // Only one existing record, update it
              const existingUserData = existingUser.rows[0]
              if (!existingUserData.id) {
                errorMessages.push('Existing user record missing ID.')
                continue
              }
              if (user.identity && user.name && user.address && user.bankcard && user.phone) {
                await db.sql`
                    UPDATE user
                    SET
                      identity = ${user.identity.toString()},
                      name = ${user.name},
                      phone = ${user.phone.toString()},
                      bankcard = ${user.bankcard.toString()},
                      address = ${user.address},
                      salary = ${user.salary ?? existingUserData.salary ?? 4900}
                    WHERE id = ${existingUserData.id};
                  `
                allUsers.push({
                  id: existingUserData.id.toString(),
                  identity: user.identity.toString(),
                  name: user.name,
                  phone: user.phone.toString(),
                  bankcard: user.bankcard.toString(),
                  address: user.address,
                  salary: user.salary ?? existingUserData.salary ?? 4900,
                })
              }
              else {
                errorMessages.push(`识别人员信息不完整, 身份证: ${user.identity || '无'}, 名字: ${user.name || '无'}, 电话: ${user.phone || '无'}, 银行卡: ${user.bankcard || '无'}, 开户行: ${user.address || '无'}, 工资: ${user.salary || '无'}`)
              }
            }
          }
        }
      }
      catch (dbError) {
        console.error('Error inserting into database:', dbError)
      }
    }
  }

  for (let i = 0; i < allUsers.length; i++) {
    const user = allUsers[i] as User
    const job = user.salary >= 4900 ? '模板工' : '普工'
    user.job = job
  }

  return { users: allUsers, errorMessages }
})
