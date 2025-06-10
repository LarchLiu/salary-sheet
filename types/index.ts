export interface ImageInfo {
  file: any
  url: string
  name: string
}

export interface User {
  id: string
  identity: string
  name: string
  phone: string
  bankcard: string
  address: string
  salary: number
  job?: string
}

export interface Salary extends User {
  sheet_date: number
  salary_date: string
  daily_wage: number
  attendance_days: number
}

export interface UsersRes {
  errorMessages: string[]
  users: User[]
}

export interface SheetInfo {
  sheetDate: number
  salaryDate: string
  users: User[]
}
