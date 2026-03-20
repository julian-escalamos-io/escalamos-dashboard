import { useState } from 'react'

export function MiniChart({ data, dataKey, color, height = 170, prefix = '' }) {
  const [hovered, setHovered] = useState(null) // index of hovered point

  if (!data || data.length === 0) return null
  const filtered = data.filter(x => x[dataKey] > 0)
  if (filtered.length === 0) return null

  const W = 400, H = height
  const pl = 50, pr = 12, pt = 14, pb = 28
  const iW = W - pl - pr, iH = H - pt - pb

  const vals = filtered.map(x => x[dataKey])
  const max = Math.max(...vals)
  const range = max || 1

  const yTicks = [0, 0.33, 0.67, 1].map(t => ({
    y: pt + iH - t * iH,
    val: t * range,
  }))

  const pts = filtered.map((x, i) => ({
    x: pl + (filtered.length === 1 ? iW / 2 : (i / (filtered.length - 1)) * iW),
    y: pt + iH - (x[dataKey] / range) * iH,
    val: x[dataKey],
    label: x.label,
  }))

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${pt + iH} L${pts[0].x.toFixed(1)},${pt + iH} Z`
  const gradId = `g-${dataKey}-${color.replace(/[^a-z0-9]/gi, '')}`

  function fmtY(v) {
    if (v === 0) return prefix === '$' ? '$0' : '0'
    if (prefix === '$') return v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${Math.round(v)}`
    return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`
  }

  function fmtTooltip(v) {
    if (prefix === '$') return `$${Math.round(v).toLocaleString('en-US')}`
    return `${Math.round(v * 10) / 10}${prefix === '' ? '' : prefix}`
  }

  const showLabel = (i) => filtered.length <= 8 || i % 2 === 0
  const hp = hovered !== null ? pts[hovered] : null

  return (
    <div style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        preserveAspectRatio="xMidYMid meet"
        onMouseLeave={() => setHovered(null)}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.03" />
          </linearGradient>
        </defs>

        {/* Y grid + labels */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={pl} y1={t.y} x2={W - pr} y2={t.y}
              stroke={i === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)'}
              strokeWidth="0.8" />
            <text x={pl - 5} y={t.y + 2.5} textAnchor="end"
              fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="Montserrat, sans-serif" fontWeight="600">
              {fmtY(t.val)}
            </text>
          </g>
        ))}

        {/* Hover vertical line */}
        {hp && (
          <line x1={hp.x} y1={pt} x2={hp.x} y2={pt + iH}
            stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3 3" />
        )}

        {/* Area + Line */}
        <path d={areaPath} fill={`url(#${gradId})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {/* Dots + X labels */}
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={hovered === i ? 4.5 : 3} fill={color}
              style={{ transition: 'r 0.1s' }} />
            {hovered === i && (
              <circle cx={p.x} cy={p.y} r="8" fill={color} fillOpacity="0.18" />
            )}
            {showLabel(i) && (
              <text x={p.x} y={H - 5} textAnchor="middle"
                fill={hovered === i ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)'}
                fontSize="8.5" fontFamily="Montserrat, sans-serif" fontWeight={hovered === i ? '700' : '600'}>
                {p.label}
              </text>
            )}
            {/* Invisible hit area per point */}
            <rect
              x={p.x - (iW / Math.max(pts.length - 1, 1)) / 2}
              y={pt}
              width={iW / Math.max(pts.length - 1, 1)}
              height={iH}
              fill="transparent"
              style={{ cursor: 'crosshair' }}
              onMouseEnter={() => setHovered(i)}
            />
          </g>
        ))}
      </svg>

      {/* Tooltip */}
      {hp && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: `calc(${((hp.x - pl) / iW) * 100}% + ${pl / W * 100 - 2}%)`,
          transform: hp.x > W * 0.65 ? 'translateX(-100%)' : 'translateX(8px)',
          background: '#1a2236',
          border: `1px solid ${color}44`,
          borderRadius: 8,
          padding: '6px 10px',
          pointerEvents: 'none',
          zIndex: 10,
          whiteSpace: 'nowrap',
        }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', fontWeight: 600, marginBottom: 2 }}>{hp.label}</div>
          <div style={{ fontSize: 14, color, fontWeight: 800 }}>{fmtTooltip(hp.val)}</div>
        </div>
      )}
    </div>
  )
}
