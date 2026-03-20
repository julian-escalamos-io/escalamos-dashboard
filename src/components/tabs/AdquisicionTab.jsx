import { useState } from 'react'
import { KPI, Delta } from '../KPI.jsx'
import { MiniChart } from '../MiniChart.jsx'
import { MetricModal } from '../MetricModal.jsx'
import { AdsTab } from './AdsTab.jsx'
import { InstagramTab } from './InstagramTab.jsx'
import { SeoTab } from './SeoTab.jsx'
import { UxTab } from './UxTab.jsx'
import { monthLabel } from '../../lib/formatters.js'

const ACCENT = '#2D7AFF'
const DANGER = '#FF6B6B'
const GREEN = '#34D399'
const DONUT_COLORS = ['#2D7AFF', '#34D399', '#FBBF24', '#A78BFA', '#FB923C', '#22D3EE', '#F472B6', '#FF6B6B']

const CHANNELS = [
  { key: 'todos',     label: 'Todos' },
  { key: 'meta',      label: 'Meta Ads' },
  { key: 'gads',      label: 'Google Ads' },
  { key: 'instagram', label: 'Instagram Org.' },
  { key: 'seo',       label: 'SEO' },
  { key: 'ux',        label: 'Web / UX' },
]

function fmt(val) {
  if (!val || val === 0) return '—'
  return `$${Math.round(val).toLocaleString('en-US')}`
}

const Divider = ({ title }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '32px 0 18px' }}>
    <div style={{ width: 3, height: 14, background: ACCENT, borderRadius: 2, flexShrink: 0 }} />
    <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2.5, color: 'rgba(255,255,255,0.55)', fontWeight: 700 }}>{title}</span>
    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
  </div>
)

function SourcesDonut({ sourceCounts }) {
  const total = Object.values(sourceCounts).reduce((s, v) => s + v, 0)
  if (total === 0) return <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Sin datos</span>

  const entries = Object.entries(sourceCounts)
    .map(([src, ct]) => ({ src, ct, pct: (ct / total) * 100 }))
    .filter(d => d.pct >= 2)
    .sort((a, b) => b.ct - a.ct)

  if (!entries.length) return null
  const fTotal = entries.reduce((s, e) => s + e.ct, 0)

  const cx = 60, cy = 60, R = 52, r = 30
  let angle = -Math.PI / 2

  const slices = entries.map((e, i) => {
    const sa = (e.ct / fTotal) * 2 * Math.PI
    const start = angle
    const end = angle + sa
    angle = end
    const large = sa > Math.PI ? 1 : 0
    const x1 = cx + R * Math.cos(start), y1 = cy + R * Math.sin(start)
    const x2 = cx + R * Math.cos(end),   y2 = cy + R * Math.sin(end)
    const x3 = cx + r * Math.cos(end),   y3 = cy + r * Math.sin(end)
    const x4 = cx + r * Math.cos(start), y4 = cy + r * Math.sin(start)
    const d = `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L ${x3.toFixed(2)} ${y3.toFixed(2)} A ${r} ${r} 0 ${large} 0 ${x4.toFixed(2)} ${y4.toFixed(2)} Z`
    return { ...e, d, color: DONUT_COLORS[i % DONUT_COLORS.length] }
  })

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
      <svg width={120} height={120} style={{ flexShrink: 0, overflow: 'visible' }}>
        {slices.map((s, i) => <path key={i} d={s.d} fill={s.color} fillOpacity={0.88} />)}
        <text x={cx} y={cy - 5} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="15" fontWeight="700" fontFamily="Montserrat, sans-serif">{fTotal}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="8" fontFamily="Montserrat, sans-serif">leads</text>
      </svg>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.src}</span>
            <span style={{ fontSize: 13, color: '#fff', fontWeight: 700 }}>{s.ct}</span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', width: 34, textAlign: 'right' }}>{s.pct.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AtraccionTodos({ cohort, prevCohort, allCohorts, ux }) {
  const prev = prevCohort
  return (
    <>
      {/* Aggregate KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16, maxWidth: 860 }}>
        <KPI label="Leads totales" value={cohort.leadsCount}
          delta={prev ? <Delta current={cohort.leadsCount} previous={prev.leadsCount} /> : null} />
        <KPI label="CPL promedio" value={cohort.cpl > 0 ? fmt(cohort.cpl) : '—'}
          delta={prev?.cpl ? <Delta current={cohort.cpl} previous={prev.cpl} inverse /> : null} />
        <KPI label="Inversión total" value={fmt(cohort.gasto)}
          delta={prev?.gasto ? <Delta current={cohort.gasto} previous={prev.gasto} inverse /> : null} />
        <KPI label="Sesiones web" value={ux?.sessions > 0 ? ux.sessions.toLocaleString() : '—'} />
      </div>

      {/* Leads por fuente + Evolución */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 16, marginBottom: 10 }}>
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, padding: 24 }}>
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.5)', fontWeight: 700, marginBottom: 20, display: 'block' }}>Leads por fuente</span>
          <SourcesDonut sourceCounts={cohort.sourceCounts} />
        </div>
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, padding: 24 }}>
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.5)', fontWeight: 700, marginBottom: 8, display: 'block' }}>Evolución de leads por mes</span>
          <MiniChart
            data={allCohorts.filter(c => c.leadsCount > 0).map(c => ({ label: monthLabel(c.month).slice(0, 3), leads: c.leadsCount }))}
            dataKey="leads" color={ACCENT}
          />
        </div>
      </div>
    </>
  )
}

function Funnel({ cohort, prevCohort }) {
  const prev = prevCohort
  const STAGES = [
    { label: 'Lead nuevo',      key: 'Lead nuevo',        color: 'rgba(45,122,255,0.3)' },
    { label: 'En conversación', key: 'En conversación',   color: 'rgba(45,122,255,0.45)' },
    { label: 'Potencial',       key: 'Cliente potencial', color: 'rgba(45,122,255,0.6)' },
    { label: 'Negociando',      key: 'Negociando',        color: 'rgba(45,122,255,0.78)' },
    { label: 'Ganado',          key: 'Ganado',            color: ACCENT },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {STAGES.map(({ label, key, color }, i, arr) => {
        const val = cohort.funnelCount[key] || 0
        const top = cohort.leadsCount || 1
        const pct = Math.max((val / top) * 100, 4)
        const prevVal = prev ? (prev.funnelCount[key] || 0) : null
        const prevTop = prev ? (prev.leadsCount || 1) : null
        const prevPct = prevTop ? (prevVal / prevTop) * 100 : null
        // Conversion rate to next stage
        const nextVal = i < arr.length - 1 ? (cohort.funnelCount[arr[i + 1].key] || 0) : null
        const convToNext = val > 0 && nextVal !== null ? Math.round((nextVal / val) * 100) : null

        return (
          <div key={key}>
            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 100px', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', textAlign: 'right', fontWeight: 500 }}>{label}</span>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{
                  width: `${pct}%`, height: 32, background: color, minWidth: 24,
                  borderRadius: i === 0 ? '5px 5px 2px 2px' : i === arr.length - 1 ? '2px 2px 5px 5px' : 2,
                }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>{val}</span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{pct.toFixed(0)}%</span>
                {prevPct !== null && prevPct > 0 && <Delta current={pct} previous={prevPct} />}
              </div>
            </div>
            {/* Conversion rate arrow between stages */}
            {convToNext !== null && (
              <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 100px', alignItems: 'center', gap: 10, margin: '1px 0' }}>
                <span />
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', fontWeight: 600 }}>↓ {convToNext}% pasan</span>
                </div>
                <span />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function InsightsBlock({ cohort, channel }) {
  const [loading, setLoading] = useState(false)
  const [insights, setInsights] = useState(null)
  const [error, setError] = useState(null)

  const channelLabel = CHANNELS.find(c => c.key === channel)?.label || 'Adquisición'

  async function generate() {
    setLoading(true); setError(null)
    try {
      const resp = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cohorts: [cohort], period: monthLabel(cohort.month), focus: channelLabel }),
      })
      if (!resp.ok) throw new Error(`Error ${resp.status}`)
      const data = await resp.json()
      setInsights(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: insights ? 16 : 0 }}>
        <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>
          Análisis — {channelLabel}
        </span>
        {!insights && (
          <button onClick={generate} disabled={loading} style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${ACCENT}`, background: loading ? 'rgba(45,122,255,0.1)' : 'rgba(45,122,255,0.15)', color: ACCENT, fontSize: 11, fontWeight: 700, fontFamily: 'Montserrat', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            {loading ? '✦ Analizando...' : `✦ Generar análisis`}
          </button>
        )}
        {insights && (
          <button onClick={() => setInsights(null)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.07)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: 10, cursor: 'pointer', fontFamily: 'Montserrat' }}>↺ regenerar</button>
        )}
      </div>
      {error && <p style={{ color: DANGER, fontSize: 12, marginTop: 12 }}>Error: {error}</p>}
      {!insights && !loading && (
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 12, fontWeight: 500 }}>Genera un análisis enfocado en {channelLabel.toLowerCase()} para el período seleccionado.</p>
      )}
      {insights && (
        <>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, margin: '0 0 16px', fontWeight: 500 }}>{insights.conclusion}</p>
          <div style={{ background: 'rgba(45,122,255,0.05)', border: '1px solid rgba(45,122,255,0.12)', borderRadius: 10, padding: '14px 18px', marginBottom: 16 }}>
            <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: ACCENT, fontWeight: 700, display: 'block', marginBottom: 6 }}>Cuello de botella</span>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: 0, fontWeight: 500 }}>{insights.bottleneck}</p>
          </div>
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.5)', fontWeight: 700, display: 'block', marginBottom: 10 }}>Acciones priorizadas (80/20)</span>
          {(insights.actions || []).map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: ACCENT, minWidth: 20 }}>{i + 1}.</span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, fontWeight: 500 }}>{a}</span>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

export function AdquisicionTab({ ads, instagram, seo, ux, cohort, prevCohort, allCohorts }) {
  const [channel, setChannel] = useState('todos')
  const [openMetric, setOpenMetric] = useState(null)

  if (!cohort) return (
    <div style={{ color: 'rgba(255,255,255,0.5)', padding: 40, textAlign: 'center', fontSize: 14 }}>Sin datos disponibles.</div>
  )

  const prev = prevCohort
  const cpl = cohort.cpl
  const convRate = cohort.leadsCount > 0 ? (cohort.closuresCount / cohort.leadsCount) * 100 : 0
  const pCpl = prev?.cpl
  const pConv = prev && prev.leadsCount > 0 ? (prev.closuresCount / prev.leadsCount) * 100 : null

  return (
    <>
      {/* Channel filter */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, flexWrap: 'wrap' }}>
        {CHANNELS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setChannel(key)}
            style={{
              padding: '9px 20px', borderRadius: 9,
              background: channel === key ? 'rgba(45,122,255,0.15)' : 'rgba(255,255,255,0.03)',
              border: channel === key ? '1px solid rgba(45,122,255,0.35)' : '1px solid rgba(255,255,255,0.07)',
              color: channel === key ? ACCENT : 'rgba(255,255,255,0.4)',
              fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Montserrat'",
              transition: 'all 0.15s',
            }}
          >{label}</button>
        ))}
      </div>

      {/* ── ATRACCIÓN ── */}
      <Divider title="Atracción" />

      {channel === 'todos' && cohort && (
        <AtraccionTodos cohort={cohort} prevCohort={prevCohort} allCohorts={allCohorts} ux={ux} />
      )}
      {channel === 'meta' && <AdsTab ads={ads} />}
      {channel === 'gads' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14 }}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: 28, display: 'block', marginBottom: 10, opacity: 0.15 }}>⏳</span>
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.25)', fontWeight: 600 }}>Pendiente activación — token en proceso</span>
          </div>
        </div>
      )}
      {channel === 'instagram' && <InstagramTab data={instagram} />}
      {channel === 'seo' && <SeoTab data={seo} />}
      {channel === 'ux' && <UxTab data={ux} />}

      {/* ── CONVERSIÓN ── */}
      <Divider title="Conversión" />

      {/* Pipeline KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16, maxWidth: 860 }}>
        <KPI label="Leads" value={cohort.leadsCount}
          onClick={() => setOpenMetric('leads')}
          delta={prev ? <Delta current={cohort.leadsCount} previous={prev.leadsCount} /> : null} />
        <KPI label="CPL" value={cpl > 0 ? fmt(cpl) : '—'}
          accent={cpl > 0 && cpl < 5 ? ACCENT : undefined}
          onClick={() => setOpenMetric('cpl')}
          delta={pCpl ? <Delta current={cpl} previous={pCpl} inverse /> : null} />
        <KPI label="Tasa conversión" value={convRate > 0 ? `${convRate.toFixed(1)}%` : '—'}
          subtitle={`${cohort.closuresCount}/${cohort.leadsCount}`}
          accent={convRate > 10 ? ACCENT : undefined}
          onClick={() => setOpenMetric('convRate')}
          delta={pConv && pConv > 0 ? <Delta current={convRate} previous={pConv} /> : null} />
        <KPI label="Ciclo ventas" value={cohort.cicloVentas > 0 ? `${cohort.cicloVentas} días` : '—'}
          onClick={() => setOpenMetric('cicloVentas')}
          delta={prev && prev.cicloVentas > 0 ? <Delta current={cohort.cicloVentas} previous={prev.cicloVentas} inverse /> : null} />
      </div>

      {/* Funnel + Sources */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 10 }}>
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, padding: 24 }}>
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.5)', fontWeight: 700, marginBottom: 20, display: 'block' }}>
            Funnel — {monthLabel(cohort.month).split(' ')[0]}
          </span>
          <Funnel cohort={cohort} prevCohort={prevCohort} />
        </div>
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, padding: 24 }}>
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.5)', fontWeight: 700, marginBottom: 20, display: 'block' }}>Leads por fuente</span>
          <SourcesDonut sourceCounts={cohort.sourceCounts} />
        </div>
      </div>

      {/* Análisis por canal */}
      <Divider title={`Análisis — ${CHANNELS.find(c => c.key === channel)?.label}`} />
      <InsightsBlock cohort={cohort} channel={channel} />

      {openMetric && (
        <MetricModal metricKey={openMetric} cohort={cohort} prevCohort={prevCohort} allCohorts={allCohorts} onClose={() => setOpenMetric(null)} />
      )}
    </>
  )
}
