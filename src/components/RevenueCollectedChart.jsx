import { useState } from 'react'

const BLUE = '#2D7AFF'
const DARK = '#4B5563'
const GREEN = '#059669'

function fmtFull(v) {
  if (!v && v !== 0) return '$0'
  return `$${Math.round(v).toLocaleString('en-US')}`
}

export function RevenueCollectedChart({ data, height = 170 }) {
  const [hovered, setHovered] = useState(null)
  if (!data?.length) return null

  const W = 520, H = height
  const pl = 10, pr = 14, pt = 16, pb = 24
  const iW = W - pl - pr, iH = H - pt - pb
  const n = data.length
  const barGap = iW / n
  const barW = barGap * 0.62

  const maxVal = Math.max(...data.map(d => Math.max(d.revenue || 0, d.cashCollected || 0)), 1)

  function cx(i) { return pl + i * barGap + barGap / 2 }
  function yV(v) { return pt + iH - ((v || 0) / maxVal) * iH }

  const linePts = data.map((d, i) => ({ x: cx(i), y: yV(d.cashCollected), val: d.cashCollected || 0 }))
  const ganPts = data.map((d, i) => ({ x: cx(i), y: yV(d.ganancia), val: d.ganancia || 0 }))

  function smoothPath(pts) {
    if (pts.length < 2) return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
    let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`
    for (let i = 1; i < pts.length; i++) {
      const cpx = (pts[i - 1].x + pts[i].x) / 2
      d += ` C${cpx.toFixed(1)},${pts[i - 1].y.toFixed(1)} ${cpx.toFixed(1)},${pts[i].y.toFixed(1)} ${pts[i].x.toFixed(1)},${pts[i].y.toFixed(1)}`
    }
    return d
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, justifyContent: 'flex-end', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(45,122,255,0.3)', border: '1px solid rgba(45,122,255,0.4)' }} />
          <span style={{ fontSize: 9, color: 'rgba(26,31,54,0.45)', fontWeight: 600 }}>Revenue</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 20, height: 2, background: DARK, borderRadius: 1 }} />
          <span style={{ fontSize: 9, color: 'rgba(26,31,54,0.45)', fontWeight: 600 }}>Cash Collected</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 20, height: 2, background: GREEN, borderRadius: 1 }} />
          <span style={{ fontSize: 9, color: 'rgba(26,31,54,0.45)', fontWeight: 600 }}>Ganancia</span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        preserveAspectRatio="xMidYMid meet"
        onMouseLeave={() => setHovered(null)}
      >
        <defs>
          <linearGradient id="rc-bar-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BLUE} stopOpacity="0.32" />
            <stop offset="100%" stopColor={BLUE} stopOpacity="0.07" />
          </linearGradient>
        </defs>

        {/* Baseline */}
        <line x1={pl} y1={pt + iH} x2={W - pr} y2={pt + iH} stroke="rgba(0,0,0,0.1)" strokeWidth="1" />

        {/* Bars — Revenue */}
        {data.map((d, i) => {
          const bH = ((d.revenue || 0) / maxVal) * iH
          const bX = cx(i) - barW / 2
          const bY = pt + iH - bH
          return (
            <rect key={i}
              x={bX} y={bY} width={barW} height={bH}
              fill={hovered === i ? 'rgba(45,122,255,0.42)' : 'url(#rc-bar-grad)'}
              rx={2}
              style={{ transition: 'fill 0.12s' }}
            />
          )
        })}

        {/* Smooth line — Cash Collected */}
        <path d={smoothPath(linePts)} fill="none" stroke={DARK} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />

        {/* Smooth line — Ganancia */}
        {ganPts.some(p => p.val > 0) && (
          <path d={smoothPath(ganPts)} fill="none" stroke={GREEN} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="4 3" />
        )}

        {/* Dots — Cash */}
        {linePts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={hovered === i ? 4.5 : 3}
            fill="#fff" stroke={DARK} strokeWidth="1.8"
            style={{ transition: 'r 0.1s' }}
          />
        ))}

        {/* Dots — Ganancia */}
        {ganPts.some(p => p.val > 0) && ganPts.map((p, i) => (
          <circle key={`g${i}`} cx={p.x} cy={p.y} r={hovered === i ? 4 : 2.5}
            fill="#fff" stroke={GREEN} strokeWidth="1.5"
            style={{ transition: 'r 0.1s' }}
          />
        ))}

        {/* X labels */}
        {data.map((d, i) => (
          <text key={i} x={cx(i)} y={H - 4} textAnchor="middle"
            fill={hovered === i ? 'rgba(26,31,54,0.75)' : 'rgba(26,31,54,0.38)'}
            fontSize="8" fontFamily="Montserrat, sans-serif" fontWeight={hovered === i ? '700' : '600'}
          >
            {d.label}
          </text>
        ))}

        {/* Invisible hit areas */}
        {data.map((_, i) => (
          <rect key={`hit-${i}`}
            x={cx(i) - barGap / 2} y={0}
            width={barGap} height={H}
            fill="transparent"
            style={{ cursor: 'crosshair' }}
            onMouseEnter={() => setHovered(i)}
          />
        ))}
      </svg>

      {/* Tooltip */}
      {hovered !== null && (() => {
        const d = data[hovered]
        const pctCobrado = d.revenue > 0 ? ((d.cashCollected || 0) / d.revenue * 100).toFixed(0) : 0
        return (
          <div style={{
            position: 'absolute', top: 28,
            left: `${(cx(hovered) / W) * 100}%`,
            transform: hovered >= n * 0.65 ? 'translateX(-110%)' : 'translateX(10px)',
            background: '#fff', border: '1px solid rgba(26,31,54,0.1)',
            borderRadius: 10, padding: '8px 12px',
            pointerEvents: 'none', zIndex: 10, whiteSpace: 'nowrap',
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            fontFamily: 'Montserrat, sans-serif',
          }}>
            <div style={{ fontSize: 10, color: 'rgba(26,31,54,0.45)', fontWeight: 700, marginBottom: 5 }}>{d.label}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 9, height: 9, borderRadius: 2, background: 'rgba(45,122,255,0.32)', border: '1px solid rgba(45,122,255,0.5)', flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'rgba(26,31,54,0.45)', fontWeight: 600 }}>Revenue</span>
                <span style={{ fontSize: 12, color: BLUE, fontWeight: 800, marginLeft: 4 }}>{fmtFull(d.revenue)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#fff', border: `2px solid ${DARK}`, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'rgba(26,31,54,0.45)', fontWeight: 600 }}>Cash</span>
                <span style={{ fontSize: 12, color: DARK, fontWeight: 800, marginLeft: 4 }}>{fmtFull(d.cashCollected)}</span>
                <span style={{ fontSize: 10, color: pctCobrado >= 90 ? GREEN : 'rgba(26,31,54,0.4)', fontWeight: 700, marginLeft: 2 }}>{pctCobrado}%</span>
              </div>
              {d.ganancia !== undefined && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#fff', border: `2px solid ${GREEN}`, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: 'rgba(26,31,54,0.45)', fontWeight: 600 }}>Ganancia</span>
                  <span style={{ fontSize: 12, color: GREEN, fontWeight: 800, marginLeft: 4 }}>{fmtFull(d.ganancia)}</span>
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
