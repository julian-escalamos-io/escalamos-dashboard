import { useState, useMemo } from 'react'
import { Delta } from '../components/KPI.jsx'
import { MiniChart } from '../components/MiniChart.jsx'
import { RevenueCollectedChart } from '../components/RevenueCollectedChart.jsx'
import { DataTable } from '../components/DataTable.jsx'
import { computeOverviewKPIs, computeModelBreakdown, computeChurn } from '../lib/maestro.js'

const ACCENT = '#2D7AFF'
const DANGER = '#E03E3E'
const GREEN = '#059669'

function fmt(v) { return v > 0 ? `$${Math.round(v).toLocaleString('en-US')}` : '—' }
function fmtPct(v, decimals = 1) { return (v !== null && v !== undefined && v !== 0) ? `${(v * 100).toFixed(decimals)}%` : '—' }
function fmtDelta(v) { if (!v) return null; const pct = (v * 100).toFixed(1); return `${v > 0 ? '+' : ''}${pct}%` }

const Divider = ({ title }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '28px 0 16px' }}>
    <div style={{ width: 3, height: 14, background: ACCENT, borderRadius: 2 }} />
    <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2.5, color: 'rgba(26,31,54,0.5)', fontWeight: 700 }}>{title}</span>
    <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.08)' }} />
  </div>
)

// ─── Métrica norte grande ──────────────────────────────────────────────────────
function NorthCard({ label, children, highlight, accent, style = {} }) {
  return (
    <div style={{
      borderRadius: 16, padding: '20px 22px',
      background: highlight
        ? `linear-gradient(135deg, #1e3fa3 0%, ${ACCENT} 100%)`
        : '#FFFFFF',
      border: highlight ? `1px solid rgba(45,122,255,0.3)` : '1px solid rgba(0,0,0,0.07)',
      boxShadow: highlight ? '0 4px 20px rgba(45,122,255,0.22)' : '0 2px 8px rgba(0,0,0,0.05)',
      display: 'flex', flexDirection: 'column', gap: 6,
      position: 'relative', overflow: 'hidden',
      ...style,
    }}>
      {highlight && <div style={{ position: 'absolute', top: -24, right: -24, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />}
      <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2.5, fontWeight: 700, color: highlight ? 'rgba(255,255,255,0.65)' : 'rgba(26,31,54,0.45)' }}>{label}</span>
      {children}
    </div>
  )
}

function InsightsBlock({ erCurrent, serviciosKPIs }) {
  const [loading, setLoading] = useState(false)
  const [insights, setInsights] = useState(null)
  const [error, setError] = useState(null)

  async function generate() {
    setLoading(true); setError(null)
    try {
      const resp = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: 'overview', data: { er: erCurrent, servicios: serviciosKPIs }, period: erCurrent?.monthLabel }),
      })
      if (!resp.ok) throw new Error(`Error ${resp.status}`)
      setInsights(await resp.json())
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 14, padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: insights ? 16 : 0 }}>
        <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.5)', fontWeight: 700 }}>Análisis ejecutivo</span>
        {!insights && <button onClick={generate} disabled={loading} style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${ACCENT}`, background: 'rgba(45,122,255,0.1)', color: ACCENT, fontSize: 11, fontWeight: 700, fontFamily: 'Montserrat', cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? '✦ Analizando...' : '✦ Generar análisis'}
        </button>}
        {insights && <button onClick={() => setInsights(null)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.07)', background: 'transparent', color: 'rgba(26,31,54,0.5)', fontSize: 10, cursor: 'pointer', fontFamily: 'Montserrat' }}>↺ regenerar</button>}
      </div>
      {error && <p style={{ color: DANGER, fontSize: 12, marginTop: 12 }}>Error: {error}</p>}
      {!insights && !loading && <p style={{ fontSize: 13, color: 'rgba(26,31,54,0.5)', marginTop: 12, fontWeight: 500 }}>Claude analiza el estado de la agencia: margen, churn, concentración de revenue, oportunidades.</p>}
      {insights && (
        <>
          <p style={{ fontSize: 14, color: 'rgba(26,31,54,0.75)', lineHeight: 1.7, margin: '0 0 16px', fontWeight: 500 }}>{insights.conclusion}</p>
          <div style={{ background: 'rgba(45,122,255,0.05)', border: '1px solid rgba(45,122,255,0.12)', borderRadius: 10, padding: '14px 18px', marginBottom: 16 }}>
            <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: ACCENT, fontWeight: 700, display: 'block', marginBottom: 6 }}>Cuello de botella</span>
            <p style={{ fontSize: 13, color: 'rgba(26,31,54,0.65)', lineHeight: 1.6, margin: 0, fontWeight: 500 }}>{insights.bottleneck}</p>
          </div>
          {(insights.actions || []).map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: ACCENT, minWidth: 20 }}>{i + 1}.</span>
              <span style={{ fontSize: 13, color: 'rgba(26,31,54,0.7)', lineHeight: 1.6, fontWeight: 500 }}>{a}</span>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

export function OverviewModule({ servicios, er, modelFilter, selectedERMonth, cac, allCohorts = [] }) {
  const erRows = er || []
  const serviciosData = servicios || []

  const currentER = useMemo(() => {
    if (!erRows.length) return null
    if (selectedERMonth) return erRows.find(r => r.monthKey === selectedERMonth) || erRows[erRows.length - 1]
    return erRows[erRows.length - 1]
  }, [erRows, selectedERMonth])

  const prevER = useMemo(() => {
    if (!currentER || !erRows.length) return null
    const idx = erRows.findIndex(r => r.monthKey === currentER.monthKey)
    return idx > 0 ? erRows[idx - 1] : null
  }, [erRows, currentER])

  const serviciosKPIs = useMemo(() => computeOverviewKPIs(serviciosData, modelFilter), [serviciosData, modelFilter])
  const churn = useMemo(() => currentER ? computeChurn(serviciosData, currentER.monthKey, modelFilter) : 0, [serviciosData, currentER, modelFilter])
  const modelBreakdown = useMemo(() => computeModelBreakdown(serviciosData), [serviciosData])

  // Charts — siempre últimos 12 meses, independiente del filtro de modelo
  const last12 = erRows.slice(-12)
  const revenueCollectedChart = useMemo(() =>
    last12.map(r => {
      const parts = r.monthLabel.split(' ')
      return { label: parts.length >= 2 ? `${parts[0]} ${parts[1]}` : r.monthLabel, revenue: r.revenue, cashCollected: r.cashCollected }
    }),
    [erRows]
  )
  const totalRevenue12 = useMemo(() => last12.reduce((s, r) => s + (r.revenue || 0), 0), [erRows])
  const totalCash12 = useMemo(() => last12.reduce((s, r) => s + (r.cashCollected || 0), 0), [erRows])
  const pctCobrado = totalRevenue12 > 0 ? totalCash12 / totalRevenue12 : 0
  const gananciasChart = useMemo(() => erRows.slice(-12).map(r => ({ label: r.monthLabel, ganancia: r.ganancia })), [erRows])

  // CAC/LTV ratio
  const ltv = serviciosKPIs.ltvPromedio
  const cacLtvRatio = cac && ltv ? (ltv / cac).toFixed(1) : null

  if (!erRows.length && !serviciosData.length) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(26,31,54,0.38)', fontSize: 14 }}>Sin datos del Registro Maestro.</div>
  }

  return (
    <>
      {/* ── MÉTRICAS NORTE ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>

        {/* 1. MRR Total */}
        <NorthCard label="MRR Total" highlight>
          <span style={{ fontSize: 38, fontWeight: 900, color: '#fff', letterSpacing: -1.5, lineHeight: 1 }}>
            {fmt(serviciosKPIs.mrr)}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{serviciosKPIs.clientesActivos} clientes · {serviciosKPIs.serviciosActivos} servicios</span>
          </div>
        </NorthCard>

        {/* 2. Growth */}
        <NorthCard label="Crecimiento">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 2 }}>
            <div>
              <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(26,31,54,0.38)', fontWeight: 700, display: 'block', marginBottom: 2 }}>vs mes anterior</span>
              <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5, color: currentER?.pctMensual > 0 ? GREEN : currentER?.pctMensual < 0 ? DANGER : 'rgba(26,31,54,0.5)' }}>
                {currentER?.pctMensual ? fmtDelta(currentER.pctMensual) : '—'}
              </span>
            </div>
            <div style={{ height: 1, background: 'rgba(0,0,0,0.06)' }} />
            <div>
              <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(26,31,54,0.38)', fontWeight: 700, display: 'block', marginBottom: 2 }}>vs año anterior</span>
              <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.3, color: currentER?.pctAnual > 0 ? GREEN : currentER?.pctAnual < 0 ? DANGER : 'rgba(26,31,54,0.5)' }}>
                {currentER?.pctAnual ? fmtDelta(currentER.pctAnual) : '—'}
              </span>
            </div>
          </div>
        </NorthCard>

        {/* 3. Ganancia Neta */}
        <NorthCard label="Ganancia Neta">
          <span style={{ fontSize: 28, fontWeight: 800, color: currentER?.ganancia > 0 ? GREEN : DANGER, letterSpacing: -0.5, lineHeight: 1.1 }}>
            {fmt(currentER?.ganancia)}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: currentER?.margenNeto > 0.25 ? ACCENT : currentER?.margenNeto > 0.1 ? 'rgba(26,31,54,0.6)' : DANGER }}>
              {fmtPct(currentER?.margenNeto)}
            </span>
            <span style={{ fontSize: 10, color: 'rgba(26,31,54,0.35)', fontWeight: 600 }}>margen</span>
          </div>
          {prevER && <Delta current={currentER?.ganancia} previous={prevER?.ganancia} />}
        </NorthCard>

        {/* 4. CAC vs LTV */}
        <NorthCard label="CAC vs LTV">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div>
                <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(26,31,54,0.38)', fontWeight: 700, display: 'block' }}>CAC</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: 'rgba(26,31,54,0.75)', letterSpacing: -0.3 }}>{cac ? fmt(cac) : '—'}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(26,31,54,0.38)', fontWeight: 700, display: 'block' }}>LTV</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: 'rgba(26,31,54,0.75)', letterSpacing: -0.3 }}>{fmt(ltv)}</span>
              </div>
            </div>
            {cacLtvRatio && (
              <div style={{ background: parseFloat(cacLtvRatio) >= 3 ? 'rgba(5,150,105,0.08)' : 'rgba(224,62,62,0.07)', borderRadius: 8, padding: '5px 10px', textAlign: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: parseFloat(cacLtvRatio) >= 3 ? GREEN : DANGER }}>
                  {cacLtvRatio}x LTV/CAC
                </span>
                <span style={{ fontSize: 9, color: 'rgba(26,31,54,0.4)', marginLeft: 5, fontWeight: 600 }}>{parseFloat(cacLtvRatio) >= 3 ? '✓ saludable' : '⚠ bajo'}</span>
              </div>
            )}
          </div>
        </NorthCard>

        {/* 5. Clientes y AOV */}
        <NorthCard label="Clientes y AOV">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 2 }}>
            <div>
              <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(26,31,54,0.38)', fontWeight: 700, display: 'block' }}>Clientes activos</span>
              <span style={{ fontSize: 28, fontWeight: 900, color: ACCENT, letterSpacing: -0.5 }}>{serviciosKPIs.clientesActivos || '—'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div>
                <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(26,31,54,0.38)', fontWeight: 700, display: 'block' }}>AOV</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: 'rgba(26,31,54,0.7)' }}>{fmt(serviciosKPIs.aov)}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(26,31,54,0.38)', fontWeight: 700, display: 'block' }}>Churn</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: churn > 2 ? DANGER : 'rgba(26,31,54,0.7)' }}>{churn}</span>
              </div>
            </div>
          </div>
        </NorthCard>
      </div>

      {/* ── EVOLUCIÓN 12 MESES ─────────────────────────────────────────────── */}
      {erRows.length > 1 && (
        <>
          <Divider title="Evolución Revenue & Cash Collected" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 12, marginBottom: 14, alignItems: 'stretch' }}>
            {/* Chart */}
            <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 14, padding: '14px 18px' }}>
              <RevenueCollectedChart data={revenueCollectedChart} height={170} />
            </div>
            {/* Cards resumen 12m */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 12, padding: '14px 18px', flex: 1 }}>
                <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.4)', fontWeight: 700, display: 'block', marginBottom: 6 }}>Revenue 12m</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: ACCENT, letterSpacing: -0.5 }}>{fmt(totalRevenue12)}</span>
              </div>
              <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 12, padding: '14px 18px', flex: 1 }}>
                <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.4)', fontWeight: 700, display: 'block', marginBottom: 6 }}>Cash Collected 12m</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: '#4B5563', letterSpacing: -0.5 }}>{fmt(totalCash12)}</span>
              </div>
              <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 12, padding: '14px 18px', flex: 1 }}>
                <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.4)', fontWeight: 700, display: 'block', marginBottom: 6 }}>% Cobrado</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: pctCobrado >= 0.9 ? GREEN : pctCobrado >= 0.7 ? '#F59E0B' : DANGER, letterSpacing: -0.5 }}>
                  {pctCobrado ? `${(pctCobrado * 100).toFixed(1)}%` : '—'}
                </span>
              </div>
            </div>
          </div>
          <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 14, padding: 20, marginBottom: 10 }}>
            <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.5)', fontWeight: 700, marginBottom: 8, display: 'block' }}>Ganancia Neta</span>
            <MiniChart data={gananciasChart} dataKey="ganancia" color={GREEN} prefix="$" />
          </div>
        </>
      )}

      {/* ── DESGLOSE POR MODELO ────────────────────────────────────────────── */}
      <Divider title="Desglose por modelo" />
      <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 14, padding: 20, marginBottom: 10 }}>
        <DataTable
          rows={modelBreakdown.filter(m => m.clientesActivos > 0 && (modelFilter === 'todos' || m.model === modelFilter))}
          columns={[
            { key: 'model', label: 'Modelo' },
            { key: 'clientesActivos', label: 'Clientes', align: 'right' },
            { key: 'mrr', label: 'MRR', align: 'right', render: v => fmt(v) },
            { key: 'aov', label: 'AOV', align: 'right', render: v => fmt(v) },
            { key: 'ltvPromedio', label: 'LTV promedio', align: 'right', render: v => fmt(v) },
          ]}
          emptyText="Sin clientes activos"
        />
      </div>

      {/* ── ANÁLISIS ──────────────────────────────────────────────────────── */}
      <Divider title="Análisis ejecutivo" />
      <InsightsBlock erCurrent={currentER} serviciosKPIs={serviciosKPIs} />
    </>
  )
}
