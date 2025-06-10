export default defineEventHandler(async (event) => {
  try {
    const { ids } = await readBody(event)

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request: No user IDs provided for deletion.',
      })
    }

    const db = useDatabase()

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i]
      const res = await db.sql`
        DELETE FROM user 
        WHERE id = ${id};
        `
      console.log(id, res)
    }

    return { message: '删除成功.' }
  }
  catch (error: any) {
    console.error('Error deleting users:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal Server Error',
    })
  }
})
