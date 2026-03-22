import { useState, useMemo } from 'react'
import { KPI, Delta } from '../components/KPI.jsx'
import { MiniChart } from '../components/MiniChart.jsx'
import { DataTable } from '../components/DataTable.jsx'
import { computeOverviewKPIs, computeModelBreakdown, computeChurn } from '../lib/maestro.js'

const ACCENT = '#2D7AFF'
const DANGER = '#E03E3E'
const GREEN = '#059669'

function fmt(v) { return v > 0 ? `$${Math.round(v).toLocaleString('en-US')}` : '—' }
function fmtPct(v) { return v ? `${(v * 100).toFixed(1)}%` : '—' }

const Divider = ({ title }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '28px 0 16px' }}>
    <div style={{ width: 3, height: 14, background: ACCENT, borderRadius: 2 }} />
    <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2.5, color: 'rgba(26,31,54,0.5)', fontWeight: 700 }}>{title}</span>
    <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.08)' }} />
  </div>
)

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
        body: JSON.stringify({
          module: 'overview',
          data: { er: erCurrent, servicios: serviciosKPIs },
          period: erCurrent?.monthLabel,
        }),
      })
      if (!resp.ok) throw new Error(`Error ${resp.status}`)
      const data = await resp.json()
      setInsights(data)
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

export function OverviewModule({ servicios, er, modelFilter, selectedERMonth }) {
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
  const prevServiciosKPIs = useMemo(() => computeOverviewKPIs(serviciosData, modelFilter), [serviciosData, modelFilter])
  const churn = useMemo(() => currentER ? computeChurn(serviciosData, currentER.monthKey, modelFilter) : 0, [serviciosData, currentER, modelFilter])
  const modelBreakdown = useMemo(() => computeModelBreakdown(serviciosData), [serviciosData])

  if (!erRows.length && !serviciosData.length) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(26,31,54,0.38)', fontSize: 14 }}>Sin datos del Registro Maestro. Configurá la variable REGISTRO_MAESTRO_SPREADSHEET_ID.</div>
  }

  const chartData12 = erRows.slice(-12)

  return (
    <>
      {/* ROW 1: P&L del mes (de E.R — aggregate) */}
      {currentER && (
        <>
          <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.5)', fontWeight: 700 }}>
              {currentER.monthLabel}
            </span>
            {currentER.proyectada > 0 && (
              <span style={{ fontSize: 10, padding: '2px 10px', borderRadius: 20, background: 'rgba(0,0,0,0.03)', color: 'rgba(26,31,54,0.5)', fontWeight: 600 }}>
                Proyectada {fmt(currentER.proyectada)} · {currentER.acierto || '—'}
              </span>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 10, maxWidth: 920 }}>
            <KPI label="MRR" value={fmt(serviciosKPIs.mrr)} accent={ACCENT} highlight fontWeight={600}
              subtitle="servicios activos" />
            <KPI label="Cash Collected" value={fmt(currentER.cashCollected)}
              delta={prevER ? <Delta current={currentER.cashCollected} previous={prevER.cashCollected} /> : null} />
            <KPI label="Ganancia" value={fmt(currentER.ganancia)} accent={currentER.ganancia > 0 ? GREEN : DANGER}
              delta={prevER ? <Delta current={currentER.ganancia} previous={prevER.ganancia} /> : null} />
            <KPI label="Margen neto" value={fmtPct(currentER.margenNeto)} subtitle="ganancia / revenue"
              accent={currentER.margenNeto > 0.3 ? ACCENT : currentER.margenNeto > 0.15 ? undefined : DANGER}
              delta={prevER ? <Delta current={currentER.margenNeto} previous={prevER.margenNeto} /> : null} />
          </div>
        </>
      )}

      {/* ROW 2: Servicios KPIs (filterable by model) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 10, maxWidth: 920 }}>
        <KPI label="Revenue del mes" value={fmt(currentER?.revenue)}
          delta={prevER ? <Delta current={currentER.revenue} previous={prevER.revenue} /> : null} />
        <KPI label="Clientes activos" value={serviciosKPIs.clientesActivos || '—'} ring />
        <KPI label="AOV" value={fmt(serviciosKPIs.aov)} subtitle="MRR / cliente" />
        <KPI label="LTV promedio" value={fmt(serviciosKPIs.ltvPromedio)} />
      </div>

      {/* ROW 3 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 10, maxWidth: 920 }}>
        <KPI label="Permanencia promedio" value={serviciosKPIs.permanencia > 0 ? `${serviciosKPIs.permanencia.toFixed(1)} meses` : '—'} />
        <KPI label="Churn este mes" value={churn > 0 ? churn : '0'} accent={churn > 2 ? DANGER : undefined} />
        <KPI label="Servicios activos" value={serviciosKPIs.serviciosActivos || '—'} />
        <KPI label="Serv. / cliente" value={serviciosKPIs.clientesActivos > 0 ? (serviciosKPIs.serviciosActivos / serviciosKPIs.clientesActivos).toFixed(1) : '—'} />
      </div>

      {/* Charts 2×2 */}
      {chartData12.length > 1 && (
        <>
          <Divider title="Evolución 12 meses" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 10 }}>
            {[
              { label: 'Facturación mensual', key: 'revenue', color: ACCENT, prefix: '$' },
              { label: 'Ganancia', key: 'ganancia', color: GREEN, prefix: '$' },
              { label: 'Cash Collected', key: 'cashCollected', color: '#A78BFA', prefix: '$' },
              { label: 'Margen neto %', key: 'margenNeto', color: '#FBBF24', prefix: '%' },
            ].map(({ label, key, color, prefix }) => (
              <div key={key} style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 14, padding: 20 }}>
                <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.5)', fontWeight: 700, marginBottom: 8, display: 'block' }}>{label}</span>
                <MiniChart
                  data={chartData12.map(r => ({
                    label: `${String(r.month).padStart(2, '0')}/${String(r.year).slice(-2)}`,
                    [key]: key === 'margenNeto' ? (r[key] || 0) * 100 : (r[key] || 0),
                  }))}
                  dataKey={key} color={color} prefix={key === 'margenNeto' ? '' : '$'}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Desglose por modelo */}
      <Divider title="Desglose por modelo" />
      <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 14, padding: 20, maxWidth: 720, marginBottom: 10 }}>
        <DataTable
          rows={modelBreakdown.filter(m => m.clientesActivos > 0)}
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

      {/* Análisis */}
      <Divider title="Análisis ejecutivo" />
      <InsightsBlock erCurrent={currentER} serviciosKPIs={serviciosKPIs} />
    </>
  )
}
