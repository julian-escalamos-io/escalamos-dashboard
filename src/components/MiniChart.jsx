export function MiniChart({ data, dataKey, color, height = 130, prefix = '' }) {
  if (!data || data.length === 0) return null
  const vals = data.map(x => x[dataKey]).filter(v => v > 0)
  if (vals.length === 0) return null
  const max = Math.max(...vals), min = Math.min(...vals), range = max - min || 1
  const w = 100, h = height, pt = 18, pb = 26, pl = 0, pr = 0
  const pw = w - pl - pr, ph = h - pt - pb
  const filtered = data.filter(x => x[dataKey] > 0)
  const pts = filtered.map((x, i) => ({
    x: pl + (i / Math.max(filtered.length - 1, 1)) * pw,
    y: pt + ph - ((x[dataKey] - min) / range) * ph,
    val: x[dataKey], label: x.label,
  }))
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const areaD = pathD + ` L${pts[pts.length - 1].x},${pt + ph} L${pts[0].x},${pt + ph} Z`
  const gradId = `g-${dataKey}-${color.replace('#', '')}`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="0.5" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="0.8" fill={color} />
          {i % 2 === 0 && (
            <text x={p.x} y={h - 4} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="2.6" fontFamily="Montserrat">{p.label}</text>
          )}
          {i === pts.length - 1 && (
            <text x={p.x} y={p.y - 4} textAnchor="end" fill="rgba(255,255,255,0.5)" fontSize="3" fontFamily="Montserrat" fontWeight="700">{prefix}{p.val.toLocaleString()}</text>
          )}
        </g>
      ))}
    </svg>
  )
}
