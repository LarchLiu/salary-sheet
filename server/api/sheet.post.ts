import type { BorderStyle } from 'exceljs'
import type { SheetInfo, User } from '~/types'
import ExcelJS from 'exceljs'
import { v4 as uuidv4 } from 'uuid'

export default defineEventHandler(async (event) => {
  const body = await readBody<SheetInfo>(event)

  if (!body || !body.users || body.users.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No user data provided for sheet generation' })
  }

  const { users, salaryDate } = body
  const db = useDatabase() // Get database instance

  const sheetDate = Date.now()

  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('工资表')

  // Set up columns (keys and widths)
  worksheet.columns = [
    { key: 'index', width: 10 },
    { key: 'name', width: 15 },
    { key: 'job', width: 15 },
    { key: 'address', width: 30 },
    { key: 'bankcard', width: 25 },
    { key: 'phone', width: 15 },
    { key: 'identity', width: 25 },
    { key: 'dailyWage', width: 15 },
    { key: 'attendanceDays', width: 15 },
    { key: 'attendanceSalary', width: 15 },
    { key: 'signature', width: 15 },
  ]

  // First row: Merged cells for "工资表"
  worksheet.mergeCells('A1:K1')
  worksheet.getCell('A1').value = '工资表'
  worksheet.getCell('A1').font = { bold: true, size: 24 }
  worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' }

  // Second row: 发放单位 and 工资属期
  worksheet.mergeCells('A2:E2')
  worksheet.getCell('A2').value = '发放单位：内蒙古中畅建设有限公司'
  worksheet.getCell('A2').font = { bold: true, size: 12 }
  worksheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'left' }

  worksheet.mergeCells('F2:K2')
  worksheet.getCell('F2').value = `工资属期: ${salaryDate}`
  worksheet.getCell('F2').font = { bold: true, size: 12 }
  worksheet.getCell('F2').alignment = { vertical: 'middle', horizontal: 'left' }

  // Third row: Column headers
  const headerRow = worksheet.addRow([
    '序号',
    '姓名',
    '工种',
    '开户行名称',
    '银行卡号码',
    '电话号码',
    '身份证号码',
    '日工资',
    '出勤天数',
    '出勤工资',
    '签章',
  ])
  headerRow.font = { bold: true, size: 12 }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }

  // Add data rows starting from row 4
  let totalSalary = 0
  users.forEach(async (user: User, index: number) => {
    let dailyWage: number
    let attendanceDays: number

    if (user.salary === 4900) {
      dailyWage = 350
      attendanceDays = 14
    }
    else {
      do {
        dailyWage = Math.floor(Math.random() * (26 - 15 + 1)) * 10 + 150
        attendanceDays = Number.parseFloat((user.salary / dailyWage).toFixed(1))
      } while (attendanceDays > 28)
    }
    const attendanceSalary = user.salary
    totalSalary += attendanceSalary

    worksheet.addRow({
      index: index + 1, // 序号
      name: user.name,
      job: user.job,
      address: user.address,
      bankcard: user.bankcard,
      phone: user.phone,
      identity: user.identity,
      dailyWage,
      attendanceDays,
      attendanceSalary,
      signature: '', // 签章
    })

    // Update user information in the 'user' table
    await db.sql`
      UPDATE user
      SET name = ${user.name}, phone = ${user.phone}, bankcard = ${user.bankcard}, address = ${user.address}, identity = ${user.identity}, salary = ${user.salary}
      WHERE id = ${user.id};
    `

    await db.sql`
        INSERT INTO salary (id, sheet_date, salary_date, identity, name, phone, bankcard, address, salary, daily_wage, attendance_days, job)
        VALUES (${uuidv4()}, ${sheetDate}, ${salaryDate}, ${user.identity}, ${user.name}, ${user.phone}, ${user.bankcard}, ${user.address}, ${user.salary}, ${dailyWage}, ${attendanceDays}, ${user.job});
      `
  })

  // Add total row
  const totalRow = worksheet.addRow({
    index: '合计',
    job: '',
    address: '',
    bankcard: '',
    phone: '',
    identity: '',
    dailyWage: '',
    attendanceDays: '',
    attendanceSalary: totalSalary,
    signature: '',
  })
  worksheet.mergeCells(totalRow.getCell('A').address, totalRow.getCell('B').address)
  totalRow.font = { bold: true, size: 12 }
  totalRow.alignment = { vertical: 'middle', horizontal: 'center' }

  // Add signature row
  const signatureRow = worksheet.addRow({})
  signatureRow.height = 30 // Give it some height for better appearance

  worksheet.mergeCells(signatureRow.getCell('A').address, signatureRow.getCell('B').address)
  signatureRow.getCell('A').value = '制表人:'
  signatureRow.getCell('A').font = { bold: true, size: 12 }
  signatureRow.getCell('A').alignment = { vertical: 'middle', horizontal: 'left' }

  worksheet.mergeCells(signatureRow.getCell('E').address, signatureRow.getCell('F').address)
  signatureRow.getCell('E').value = '单位负责人:'
  signatureRow.getCell('E').font = { bold: true, size: 12 }
  signatureRow.getCell('E').alignment = { vertical: 'middle', horizontal: 'left' }

  worksheet.mergeCells(signatureRow.getCell('G').address, signatureRow.getCell('H').address)
  signatureRow.getCell('G').value = '单位签章：'
  signatureRow.getCell('G').font = { bold: true, size: 12 }
  signatureRow.getCell('G').alignment = { vertical: 'middle', horizontal: 'left' }

  // Define border style
  const borderStyle: Partial<ExcelJS.Borders> = {
    top: { style: 'thin' as BorderStyle },
    left: { style: 'thin' as BorderStyle },
    bottom: { style: 'thin' as BorderStyle },
    right: { style: 'thin' as BorderStyle },
  }

  // Apply borders to data rows
  for (let i = 0; i < signatureRow.number; i++) {
    const row = worksheet.getRow(i)
    row.eachCell((cell) => {
      cell.border = borderStyle
    })
  }

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer()

  return buffer
})
