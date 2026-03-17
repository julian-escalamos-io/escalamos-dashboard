const MESES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export function money(val) {
  if (!val && val !== 0) return '—'
  if (val === 0) return '$0'
  return val >= 10000
    ? `$${Math.round(val).toLocaleString('es-AR')}`
    : `$${Number(val).toFixed(2)}`
}

export function monthLabel(mStr) {
  if (!mStr) return ''
  const [y, m] = mStr.split('-')
  return `${MESES_ES[parseInt(m) - 1]} ${y}`
}

export function formatDateRange(start, end) {
  const fmt = (d) =>
    `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
  return `${fmt(start)} → ${fmt(end)}`
}

export function deltaColor(pct, inverse = false) {
  const good = inverse ? pct < 0 : pct > 0
  return good ? '#34D399' : '#FF6B6B'
}
