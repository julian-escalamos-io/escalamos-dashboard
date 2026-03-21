import { useState } from 'react'

const ACCENT = '#2D7AFF'

/**
 * columns: Array<{
 *   key: string,
 *   label: string,
 *   align?: 'left' | 'right' | 'center',
 *   render?: (value, row) => ReactNode,
 *   sortable?: boolean,
 * }>
 */
export function DataTable({ columns, rows, maxRows = 50, emptyText = 'Sin datos', compact = false }) {
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('desc')
  const [showAll, setShowAll] = useState(false)

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const sorted = sortKey
    ? [...rows].sort((a, b) => {
        const av = a[sortKey], bv = b[sortKey]
        const cmp = typeof av === 'number' ? av - bv : String(av || '').localeCompare(String(bv || ''))
        return sortDir === 'asc' ? cmp : -cmp
      })
    : rows

  const visible = showAll ? sorted : sorted.slice(0, maxRows)

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={col.sortable !== false ? () => handleSort(col.key) : undefined}
                  style={{
                    padding: compact ? '6px 10px' : '8px 12px',
                    textAlign: col.align || 'left',
                    fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.8,
                    width: col.width || undefined,
                    maxWidth: col.width || undefined,
                    color: sortKey === col.key ? ACCENT : 'rgba(255,255,255,0.25)',
                    fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.06)',
                    cursor: col.sortable !== false ? 'pointer' : 'default',
                    whiteSpace: 'nowrap', userSelect: 'none',
                    transition: 'color 0.15s',
                  }}
                >
                  {col.label}
                  {col.sortable !== false && sortKey === col.key && (
                    <span style={{ marginLeft: 4, opacity: 0.7 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={columns.length} style={{ padding: '24px 12px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
                  {emptyText}
                </td>
              </tr>
            )}
            {visible.map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                {columns.map(col => (
                  <td key={col.key} style={{
                    padding: compact ? '6px 10px' : '10px 12px',
                    textAlign: col.align || 'left',
                    color: 'rgba(255,255,255,0.65)',
                    fontWeight: 500,
                    width: col.width || undefined,
                    maxWidth: col.width || undefined,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: col.wrap ? 'normal' : 'nowrap',
                    verticalAlign: 'middle',
                  }}>
                    {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!showAll && rows.length > maxRows && (
        <button
          onClick={() => setShowAll(true)}
          style={{ marginTop: 12, padding: '7px 16px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: 'rgba(255,255,255,0.35)', fontSize: 11, cursor: 'pointer', fontFamily: "'Montserrat'", fontWeight: 600 }}
        >
          Ver todos ({rows.length})
        </button>
      )}
    </div>
  )
}
