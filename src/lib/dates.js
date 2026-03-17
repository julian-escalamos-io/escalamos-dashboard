import { startOfMonth, endOfMonth, subMonths, startOfYear, subDays, format } from 'date-fns'

export const SHEETS_EPOCH = new Date(Date.UTC(1899, 11, 30))

export function normalizeDate(val) {
  if (val === null || val === undefined || val === '') return ''
  const n = parseFloat(val)
  if (!isNaN(n) && n > 43831 && n < 55000) {
    const ms = SHEETS_EPOCH.getTime() + n * 86400000
    return new Date(ms).toISOString().slice(0, 10)
  }
  const s = String(val).trim()
  return s.length >= 10 ? s.slice(0, 10) : s
}

export function monthStr(date) {
  return format(date, 'yyyy-MM')
}

export const PRESETS = [
  {
    key: 'mtd',
    label: 'Este mes',
    getRange: () => {
      const now = new Date()
      return { start: startOfMonth(now), end: now }
    },
  },
  {
    key: '1m',
    label: 'Último mes',
    getRange: () => {
      const prev = subMonths(new Date(), 1)
      return { start: startOfMonth(prev), end: endOfMonth(prev) }
    },
  },
  {
    key: '3m',
    label: '3 meses',
    getRange: () => ({
      start: startOfMonth(subMonths(new Date(), 2)),
      end: new Date(),
    }),
  },
  {
    key: 'ytd',
    label: 'Año actual',
    getRange: () => ({ start: startOfYear(new Date()), end: new Date() }),
  },
  {
    key: '12m',
    label: '12 meses',
    getRange: () => ({
      start: startOfMonth(subMonths(new Date(), 11)),
      end: new Date(),
    }),
  },
  {
    key: 'all',
    label: 'Todo el historial',
    getRange: () => ({ start: new Date(2025, 0, 1), end: new Date() }),
  },
]
