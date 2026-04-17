import { useState } from 'react'
import { KPI, Delta } from '../components/KPI.jsx'
import { MiniChart } from '../components/MiniChart.jsx'
import { MetricModal } from '../components/MetricModal.jsx'
import { AdsTab } from '../components/tabs/AdsTab.jsx'
import { GoogleAdsTab } from '../components/tabs/GoogleAdsTab.jsx'
import { InstagramTab } from '../components/tabs/InstagramTab.jsx'
import { SeoTab } from '../components/tabs/SeoTab.jsx'
import { UxTab } from '../components/tabs/UxTab.jsx'
import { monthLabel } from '../lib/formatters.js'

const ACCENT = '#2D7AFF'
const DANGER = '#E03E3E'
const DONUT_COLORS = ['#2D7AFF', '#059669', '#FBBF24', '#A78BFA', '#FB923C', '#22D3EE', '#F472B6', '#E03E3E']

const CHANNELS = [
  { key: 'todos',  label: 'Todos' },
  { key: 'meta',   label: 'Meta Ads' },
  { key: 'gads',   label: 'Google Ads' },
  { key: 'social', label: 'Social Media' },
  { key: 'seoref', label: 'SEO / Referido' },
]

function fmt(val) {
  if (!val || val === 0) return '—'
  return `$${Math.round(val).toLocaleString('en-US')}`
}

const Divider = ({ title }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '32px 0 18px' }}>
    <div style={{ width: 3, height: 14, background: ACCENT, borderRadius: 2, flexShrink: 0 }} />
    <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2.5, color: 'rgba(26,31,54,0.55)', fontWeight: 700 }}>{title}</span>
    <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.1)' }} />
  </div>
)

function SourcesDonut({ sourceCounts, centerLabel = 'leads' }) {
  const total = Object.values(sourceCounts).reduce((s, v) => s + v, 0)
  if (total === 0) return <span style={{ fontSize: 13, color: 'rgba(26,31,54,0.5)' }}>Sin datos</span>

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
        <text x={cx} y={cy - 5} textAnchor="middle" fill="rgba(26,31,54,0.9)" fontSize="15" fontWeight="700" fontFamily="Montserrat, sans-serif">{fTotal}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="rgba(26,31,54,0.38)" fontSize="8" fontFamily="Montserrat, sans-serif">{centerLabel}</text>
      </svg>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'rgba(26,31,54,0.75)', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.src}</span>
            <span style={{ fontSize: 13, color: '#1a1f36', fontWeight: 700 }}>{s.ct}</span>
            <span style={{ fontSize: 10, color: 'rgba(26,31,54,0.45)', width: 34, textAlign: 'right' }}>{s.pct.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Funnel({ cohort, prevCohort }) {
  const prev = prevCohort
  const STAGES = [
    { label: 'Lead nuevo',      key: 'Lead nuevo',        color: 'rgba(45,122,255,0.35)' },
    { label: 'En conversación', key: 'En conversación',   color: 'rgba(45,122,255,0.5)' },
    { label: 'Potencial',       key: 'Cliente potencial', color: 'rgba(45,122,255,0.65)' },
    { label: 'Negociando',      key: 'Negociando',        color: 'rgba(45,122,255,0.82)' },
    { label: 'Ganado',          key: 'Ganado',            color: ACCENT },
  ]

  const top = cohort.leadsCount || 1
  const STAGE_HEIGHT = 36
  const MIN_WIDTH = 4

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {STAGES.map(({ label, key, color }, i, arr) => {
        const val = cohort.funnelCount[key] || 0
        const pct = (val / top) * 100
        const barWidth = Math.max(pct, val > 0 ? MIN_WIDTH : 0)

        const prevVal = prev ? (prev.funnelCount[key] || 0) : null
        const prevTop = prev ? (prev.leadsCount || 1) : null
        const prevPct = prevTop ? (prevVal / prevTop) * 100 : null

        const nextVal = i < arr.length - 1 ? (cohort.funnelCount[arr[i + 1].key] || 0) : null
        const convToNext = val > 0 && nextVal !== null ? Math.round((nextVal / val) * 100) : null

        return (
          <div key={key}>
            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 110px', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, color: 'rgba(26,31,54,0.65)', textAlign: 'right', fontWeight: 500 }}>{label}</span>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{
                  width: `${barWidth}%`,
                  height: STAGE_HEIGHT,
                  background: color,
                  borderRadius: 4,
                  transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
                }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(26,31,54,0.8)' }}>{val}</span>
                <span style={{ fontSize: 10, color: 'rgba(26,31,54,0.45)' }}>{pct.toFixed(0)}%</span>
                {prevPct !== null && prevPct > 0 && <Delta current={pct} previous={prevPct} />}
              </div>
            </div>
            {convToNext !== null && (
              <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 110px', alignItems: 'center', gap: 10, height: 16 }}>
                <span />
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <span style={{ fontSize: 9, color: 'rgba(26,31,54,0.4)', fontWeight: 600 }}>↓ {convToNext}% pasan</span>
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

function ChannelSummaryTable({ ads, gads, instagram, seo, ux, cohort }) {
  const rows = []
  const src = cohort?.sourceCounts || {}
  const salesSrc = cohort?.salesSourceCounts || {}

  if (ads && ads.length > 0) {
    const spent = ads.reduce((s, a) => s + (a.spend || 0), 0)
    const leads = ads.reduce((s, a) => s + (a.registrations || 0) + (a.convos || 0), 0)
    const cpl = leads > 0 ? spent / leads : 0
    const ventas = salesSrc['Meta Ads'] || 0
    rows.push({ canal: 'Meta Ads', inversion: spent, leads, cpl, ventas })
  }

  if (gads && gads.spend > 0) {
    const leads = gads.conversions || 0
    const cpl = leads > 0 ? gads.spend / leads : 0
    const ventas = salesSrc['Google Ads'] || 0
    rows.push({ canal: 'Google Ads', inversion: gads.spend, leads, cpl, ventas })
  }

  if (instagram) {
    const leads = src['Instagram / Social Media'] || 0
    const ventas = salesSrc['Instagram / Social Media'] || 0
    rows.push({ canal: 'Social Media', inversion: 0, leads, cpl: 0, ventas })
  }

  if (seo || ux) {
    const leads = (src['Google'] || 0) + (src['Referido'] || 0)
    const ventas = (salesSrc['Google'] || 0) + (salesSrc['Referido'] || 0)
    rows.push({ canal: 'SEO / Referido', inversion: 0, leads, cpl: 0, ventas })
  }

  if (!rows.length) return <span style={{ fontSize: 13, color: 'rgba(26,31,54,0.38)' }}>Sin datos por canal</span>

  const cols = '1.5fr 1fr 0.8fr 1fr 0.8fr'

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 14, overflow: 'hidden', maxWidth: 720 }}>
      <div style={{ display: 'grid', gridTemplateColumns: cols, padding: '10px 18px', borderBottom: '1px solid rgba(0,0,0,0.07)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(26,31,54,0.38)', fontWeight: 700 }}>
        <span>Canal</span>
        <span style={{ textAlign: 'right' }}>Inversión</span>
        <span style={{ textAlign: 'right' }}>Leads</span>
        <span style={{ textAlign: 'right' }}>CPL</span>
        <span style={{ textAlign: 'right' }}>Ventas</span>
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: cols, padding: '13px 18px', borderBottom: i < rows.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'rgba(26,31,54,0.8)', fontWeight: 600 }}>{r.canal}</span>
          <span style={{ fontSize: 13, color: 'rgba(26,31,54,0.6)', textAlign: 'right' }}>{r.inversion > 0 ? fmt(r.inversion) : '—'}</span>
          <span style={{ fontSize: 13, color: 'rgba(26,31,54,0.6)', textAlign: 'right' }}>{r.leads > 0 ? r.leads : '—'}</span>
          <span style={{ fontSize: 13, color: 'rgba(26,31,54,0.6)', textAlign: 'right' }}>{r.cpl > 0 ? fmt(r.cpl) : '—'}</span>
          <span style={{ fontSize: 13, color: 'rgba(26,31,54,0.6)', textAlign: 'right', fontWeight: 600 }}>{r.ventas > 0 ? r.ventas : '—'}</span>
        </div>
      ))}
    </div>
  )
}

export function MarketingModule({ cohort, prevCohort, allCohorts, ads, gads, instagram, igContent, seo, ux }) {
  const [channel, setChannel] = useState('todos')
  const [openMetric, setOpenMetric] = useState(null)

  if (!cohort) return (
    <div style={{ color: 'rgba(26,31,54,0.55)', padding: 40, textAlign: 'center', fontSize: 14 }}>Sin datos disponibles.</div>
  )

  const prev = prevCohort
  const gasto = cohort.gasto
  const mer = cohort.mer
  const cac = cohort.cac
  const aov = cohort.cohortAov
  const gp = cohort.grossProfit
  const payback = cohort.payback
  const cpl = cohort.cpl
  const convRate = cohort.leadsCount > 0 ? (cohort.closuresCount / cohort.leadsCount) * 100 : 0

  const pGasto = prev?.gasto
  const pMer = prev?.mer
  const pCac = prev?.cac
  const pAov = prev?.cohortAov
  const pGp = prev?.grossProfit
  const pPay = prev?.payback
  const pCpl = prev?.cpl
  const pConv = prev && prev.leadsCount > 0 ? (prev.closuresCount / prev.leadsCount) * 100 : null

  const cohortDisplayLabel = cohort.isAggregate ? cohort.periodLabel : monthLabel(cohort.month)
  const monthName = cohort.isAggregate ? 'Período' : monthLabel(cohort.month).split(' ')[0]

  // Últimos 12 meses cerrados (excluye el mes actual incompleto)
  const evolution12 = (() => {
    const now = new Date()
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    return (allCohorts || []).filter(c => c.month !== currentKey).slice(-12)
  })()

  return (
    <>
      {/* ── SECCIÓN 1: Cohortes y KPIs ── */}
      <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.55)', fontWeight: 700 }}>
          {cohort.isAggregate ? 'Período' : 'Cohorte'} {cohortDisplayLabel}
        </span>
        <span style={{ fontSize: 10, padding: '3px 12px', borderRadius: 20, background: cohort.isOpen ? 'rgba(0,0,0,0.04)' : 'rgba(45,122,255,0.1)', color: cohort.isOpen ? 'rgba(26,31,54,0.75)' : ACCENT, fontWeight: 700 }}>
          {cohort.isOpen ? `abierta · ${cohort.activeCount} activos` : 'completa'}
        </span>
      </div>

      {/* ROW 1: Ingresos | Inversión | MER */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr 1fr', gap: 10, marginBottom: 10, maxWidth: 860 }}>
        <KPI
          label="Ingresos nuevos clientes"
          value={cohort.revenue > 0 ? fmt(cohort.revenue) : '—'}
          accent={ACCENT} highlight fontWeight={600}
          onClick={() => setOpenMetric('revenue')}
          delta={prev && prev.revenue > 0 ? <Delta current={cohort.revenue} previous={prev.revenue} /> : null}
        />
        <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 14, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.8, color: 'rgba(26,31,54,0.6)', fontWeight: 600 }}>Inversión total</span>
            {pGasto ? <Delta current={gasto} previous={pGasto} inverse /> : null}
          </div>
          <span style={{ fontSize: 24, fontWeight: 600 }}>{fmt(gasto)}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, background: 'rgba(0,0,0,0.03)', borderRadius: 8, padding: '10px 12px' }}>
              <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(26,31,54,0.55)', fontWeight: 600, display: 'block', marginBottom: 2 }}>Publicidad</span>
              <span style={{ fontSize: 16, fontWeight: 600 }}>{fmt(cohort.gastoAds)}</span>
            </div>
            <div style={{ flex: 1, background: 'rgba(0,0,0,0.03)', borderRadius: 8, padding: '10px 12px' }}>
              <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(26,31,54,0.55)', fontWeight: 600, display: 'block', marginBottom: 2 }}>Equipo</span>
              <span style={{ fontSize: 16, fontWeight: 600 }}>{fmt(cohort.gastoEquipo)}</span>
            </div>
          </div>
        </div>
        <KPI
          label="MER"
          value={mer > 0 ? `${mer.toFixed(1)}x` : '—'}
          subtitle="revenue / inversión"
          accent={mer > 3 ? ACCENT : mer > 0 ? DANGER : undefined}
          fontWeight={600}
          onClick={() => setOpenMetric('mer')}
          delta={pMer ? <Delta current={mer} previous={pMer} /> : null}
        />
      </div>

      {/* ROW 2: AOV | CAC | GP | Payback */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 10, maxWidth: 860 }}>
        <KPI label="AOV" value={aov > 0 ? fmt(aov) : '—'} subtitle="ingresos nuevos / clientes nuevos" ring onClick={() => setOpenMetric('aov')} delta={pAov ? <Delta current={aov} previous={pAov} /> : null} />
        <KPI label="CAC" value={cac > 0 ? fmt(cac) : '—'} subtitle="inversión total / clientes nuevos" accent={cac > 0 && cac < 150 ? ACCENT : undefined} ring onClick={() => setOpenMetric('cac')} delta={pCac ? <Delta current={cac} previous={pCac} inverse /> : null} />
        <KPI label="30D Gross Profit" value={gp > 0 ? fmt(gp) : '—'} subtitle="AOV × margen bruto" onClick={() => setOpenMetric('grossProfit')} delta={pGp ? <Delta current={gp} previous={pGp} /> : null} />
        <KPI label="Payback" value={payback > 0 ? `${payback.toFixed(0)} días` : '—'} subtitle="CAC / GP mensual × 30d" accent={payback > 0 && payback < 30 ? ACCENT : undefined} onClick={() => setOpenMetric('payback')} delta={pPay ? <Delta current={payback} previous={pPay} inverse /> : null} />
      </div>

      {/* Clients table */}
      <div style={{ padding: '16px 0', marginBottom: 10, maxWidth: 600 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: ACCENT }}>{cohort.clients.length}</span>
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.58)', fontWeight: 700 }}>Clientes cerrados — {monthName}</span>
        </div>
        {cohort.clients.length > 0 ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0 24px', padding: '0 0 8px', borderBottom: '1px solid rgba(0,0,0,0.06)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(26,31,54,0.2)', fontWeight: 700 }}>
              <span>Cliente</span><span>Monto</span><span>Ciclo</span>
            </div>
            {cohort.clients.map((cl, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0 24px', padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.05)', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'rgba(26,31,54,0.7)', fontWeight: 500 }}>{cl.name}</span>
                <span style={{ fontSize: 13, color: ACCENT, fontWeight: 600 }}>{fmt(cl.value)}</span>
                <span style={{ fontSize: 12, color: 'rgba(26,31,54,0.58)', minWidth: 32 }}>{cl.days > 0 ? `${cl.days}d` : '—'}</span>
              </div>
            ))}
          </div>
        ) : (
          <span style={{ fontSize: 13, color: 'rgba(26,31,54,0.55)' }}>Sin cierres en este período</span>
        )}
      </div>

      {/* ── SECCIÓN 2: Pipeline y fuentes ── */}
      <Divider title="Pipeline y fuentes" />

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

      <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 14, padding: 24, marginBottom: 16, maxWidth: 980 }}>
        <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.5)', fontWeight: 700, marginBottom: 20, display: 'block' }}>
          Funnel — {monthName}
        </span>
        <Funnel cohort={cohort} prevCohort={prevCohort} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 10, maxWidth: 980 }}>
        <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 14, padding: 24 }}>
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.5)', fontWeight: 700, marginBottom: 20, display: 'block' }}>Leads por fuente</span>
          <SourcesDonut sourceCounts={cohort.sourceCounts} />
        </div>
        <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 14, padding: 24 }}>
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.5)', fontWeight: 700, marginBottom: 20, display: 'block' }}>Ventas por fuente</span>
          <SourcesDonut sourceCounts={cohort.salesSourceCounts || {}} centerLabel="ventas" />
        </div>
      </div>

      {/* ── SECCIÓN 3: Evolución ── */}
      {evolution12.length > 1 && (
        <>
          <Divider title="Evolución 12 meses" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 10, maxWidth: 860 }}>
            <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 14, padding: '14px 18px' }}>
              <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.5)', fontWeight: 700, marginBottom: 6, display: 'block' }}>Ingresos nuevos clientes</span>
              <MiniChart
                data={evolution12.map(c => ({ label: monthLabel(c.month).slice(0, 3), revenue: c.revenue }))}
                dataKey="revenue" color={ACCENT} prefix="$" height={110}
              />
            </div>
            <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 14, padding: '14px 18px' }}>
              <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.5)', fontWeight: 700, marginBottom: 6, display: 'block' }}>CAC</span>
              <MiniChart
                data={evolution12.map(c => ({ label: monthLabel(c.month).slice(0, 3), cac: c.cac }))}
                dataKey="cac" color={DANGER} prefix="$" height={110}
              />
            </div>
          </div>
        </>
      )}

      {/* ── SECCIÓN 4: Detalle por canal ── */}
      <Divider title="Detalle por canal" />

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
        {CHANNELS.map(({ key, label }) => (
          <button key={key} onClick={() => setChannel(key)} style={{
            padding: '9px 20px', borderRadius: 9,
            background: channel === key ? 'rgba(45,122,255,0.1)' : 'rgba(0,0,0,0.03)',
            border: channel === key ? '1px solid rgba(45,122,255,0.35)' : '1px solid rgba(0,0,0,0.07)',
            color: channel === key ? ACCENT : 'rgba(26,31,54,0.5)',
            fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Montserrat'",
            transition: 'all 0.15s',
          }}>{label}</button>
        ))}
      </div>

      {channel === 'todos' && <ChannelSummaryTable ads={ads} gads={gads} instagram={instagram} seo={seo} ux={ux} cohort={cohort} />}
      {channel === 'meta' && <AdsTab ads={ads} />}
      {channel === 'gads' && <GoogleAdsTab data={gads} />}
      {channel === 'social' && <InstagramTab data={instagram} content={igContent} />}
      {channel === 'seoref' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <SeoTab data={seo} />
          <UxTab data={ux} />
        </div>
      )}

      {openMetric && (
        <MetricModal metricKey={openMetric} cohort={cohort} prevCohort={prevCohort} allCohorts={allCohorts} onClose={() => setOpenMetric(null)} />
      )}
    </>
  )
}
