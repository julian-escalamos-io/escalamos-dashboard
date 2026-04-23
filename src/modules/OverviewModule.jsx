import { useMemo } from 'react'
import { Delta } from '../components/KPI.jsx'
import { Sparkline } from '../components/Sparkline.jsx'
import { RevenueCollectedChart } from '../components/RevenueCollectedChart.jsx'
import { DataTable } from '../components/DataTable.jsx'
import { computeOverviewKPIs, computeChurn, computeModelBreakdown } from '../lib/maestro.js'

const ACCENT = '#2D7AFF'
const DANGER = '#E03E3E'
const GREEN = '#059669'
const AMBER = '#F59E0B'

function fmt(v) { return v > 0 ? `$${Math.round(v).toLocaleString('en-US')}` : v < 0 ? `-$${Math.round(Math.abs(v)).toLocaleString('en-US')}` : '—' }
function fmtPct(v, decimals = 1) { return (v !== null && v !== undefined && v !== 0) ? `${(v * 100).toFixed(decimals)}%` : '—' }
function fmtDelta(v) { if (!v) return null; const pct = (v * 100).toFixed(1); return `${v > 0 ? '+' : ''}${pct}%` }

const MESES_LABEL = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
function mkLabel(mk) {
  const [y, m] = (mk || '').split('-')
  if (!y || !m) return mk || ''
  return `${MESES_LABEL[parseInt(m) - 1]} ${y.slice(2)}`
}

const Divider = ({ title }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '28px 0 16px' }}>
    <div style={{ width: 3, height: 14, background: ACCENT, borderRadius: 2 }} />
    <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2.5, color: 'rgba(26,31,54,0.5)', fontWeight: 700 }}>{title}</span>
    <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.08)' }} />
  </div>
)

// ─── Métrica norte grande ──────────────────────────────────────────────────────
function NorthCard({ label, children, highlight, style = {} }) {
  return (
    <div style={{
      borderRadius: 16, padding: '22px 24px',
      background: highlight ? `linear-gradient(135deg, #1e3fa3 0%, ${ACCENT} 100%)` : '#FFFFFF',
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

// Card de salud con semáforo
function HealthCard({ label, value, sub, color }) {
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 14, padding: '16px 18px' }}>
      <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.4)', fontWeight: 700, display: 'block', marginBottom: 6 }}>{label}</span>
      <span style={{ fontSize: 24, fontWeight: 900, color, letterSpacing: -0.5, lineHeight: 1 }}>{value}</span>
      {sub && <span style={{ fontSize: 10, color: 'rgba(26,31,54,0.4)', fontWeight: 600, display: 'block', marginTop: 4 }}>{sub}</span>}
    </div>
  )
}

// Chip estadístico para "Pulso por frente"
function StatChip({ label, value, color }) {
  return (
    <div>
      <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(26,31,54,0.42)', fontWeight: 700, display: 'block', marginBottom: 2 }}>{label}</span>
      <span style={{ fontSize: 16, fontWeight: 800, color: color || 'rgba(26,31,54,0.78)' }}>{value}</span>
    </div>
  )
}

// Mini chart de barras dobles para Nuevos vs Bajas
function NuevosBajasBars({ data }) {
  if (!data || data.length === 0) return null
  const maxV = Math.max(...data.map(d => Math.max(d.nuevos, d.bajas)), 1)
  const W = 300, H = 70, pt = 4, pb = 14, pl = 0, pr = 0
  const iW = W - pl - pr, iH = H - pt - pb
  const slot = iW / data.length
  const barW = Math.max(2, (slot * 0.4))
  const gap = slot * 0.1

  return (
    <div style={{ width: '100%' }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: 70, display: 'block' }}>
        <line x1={pl} y1={pt + iH} x2={W - pr} y2={pt + iH} stroke="rgba(0,0,0,0.1)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
        {data.map((d, i) => {
          const cx = pl + slot * i + slot / 2
          const hN = (d.nuevos / maxV) * iH
          const hB = (d.bajas / maxV) * iH
          return (
            <g key={i}>
              <rect x={cx - barW - gap / 2} y={pt + iH - hN} width={barW} height={hN} fill={GREEN} rx={1} />
              <rect x={cx + gap / 2} y={pt + iH - hB} width={barW} height={hB} fill={DANGER} rx={1} />
            </g>
          )
        })}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2, fontSize: 10, color: 'rgba(26,31,54,0.4)', fontWeight: 600 }}>
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  )
}

const ModelBadge = ({ tipo }) => {
  const colors = { Boutique: '#A78BFA', Agencia: '#2D7AFF', Soft: '#34D399', Financiera: '#FBBF24', Consultoría: '#F97316' }
  const color = colors[tipo] || 'rgba(26,31,54,0.3)'
  return <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, background: `${color}18`, color, fontWeight: 700 }}>{tipo || '—'}</span>
}

const MODELOS_CORE = ['boutique', 'agencia', 'consultoría', 'consultoria']

export function OverviewModule({ servicios, er, erUnificado = [], egresos = [], modelFilter, selectedERMonth, dateRange, selectedCohort, prevCohort, allCohorts = [] }) {
  const erRows = er || []
  const serviciosData = servicios || []

  // Overview ignora el filtro de fechas — siempre vista actual (último mes con datos)
  const currentMonthKey = useMemo(() => {
    return erRows.length ? erRows[erRows.length - 1].monthKey : null
  }, [erRows])

  const currentER = useMemo(() => {
    if (!erRows.length) return null
    return erRows.find(r => r.monthKey === currentMonthKey) || erRows[erRows.length - 1]
  }, [erRows, currentMonthKey])

  const prevER = useMemo(() => {
    if (!currentER || !erRows.length) return null
    const idx = erRows.findIndex(r => r.monthKey === currentER.monthKey)
    return idx > 0 ? erRows[idx - 1] : null
  }, [erRows, currentER])

  // KPIs proyectados desde Servicios
  const serviciosKPIs = useMemo(() => computeOverviewKPIs(serviciosData, modelFilter), [serviciosData, modelFilter])
  const churn = useMemo(() => currentER ? computeChurn(serviciosData, currentER.monthKey, modelFilter) : 0, [serviciosData, currentER, modelFilter])
  const modelBreakdown = useMemo(() => computeModelBreakdown(serviciosData), [serviciosData])

  // ── Costos proyectados desde egresos (como Finanzas) ─────────────────────
  // MRR por modelo para calcular share (ponderación de costos indirectos)
  const mrrByUnit = useMemo(() => {
    const active = serviciosData.filter(s => s.estado?.toLowerCase() === 'activo')
    const result = { Boutique: 0, Agencia: 0, Soft: 0, Financiera: 0, 'Consultoría': 0, total: 0 }
    for (const s of active) {
      if (result[s.tipo] !== undefined) result[s.tipo] += s.monto
      result.total += s.monto
    }
    return result
  }, [serviciosData])

  const isUnit = modelFilter && modelFilter !== 'todos'
  const share = isUnit && mrrByUnit.total > 0 ? (mrrByUnit[modelFilter] || 0) / mrrByUnit.total : 1

  const costosDelMes = useMemo(() => {
    const egresoMes = (e) => Math.abs(e.montoPorMes || e.monto || 0)
    // Directos: del modelo (o de unidades específicas si filter=todos)
    const directos = isUnit
      ? (egresos || []).filter(e => e.modelo?.toLowerCase() === modelFilter.toLowerCase())
      : (egresos || []).filter(e => e.modelo?.toLowerCase() !== 'todos')
    const totalDirectos = directos.reduce((s, e) => s + egresoMes(e), 0)
    // Indirectos: gastos generales (modelo='todos'), ponderados por share
    const indirectos = (egresos || []).filter(e => e.modelo?.toLowerCase() === 'todos')
    const totalIndirectos = indirectos.reduce((s, e) => s + egresoMes(e) * share, 0)
    return totalDirectos + totalIndirectos
  }, [egresos, isUnit, modelFilter, share])

  // MRR Proyectado y Ganancia Proyectada
  const mrrProyectado = serviciosKPIs.mrr || 0
  const gananciaProyectada = mrrProyectado - costosDelMes
  const margenProyectado = mrrProyectado > 0 ? gananciaProyectada / mrrProyectado : 0

  // Crecimiento MoM y YoY
  const mrrPrev = prevER ? (prevER.revenue || 0) : 0
  const mrrYearAgo = useMemo(() => {
    if (!currentMonthKey) return 0
    const [y, m] = currentMonthKey.split('-')
    const yearAgoKey = `${parseInt(y) - 1}-${m}`
    const r = erRows.find(r => r.monthKey === yearAgoKey)
    return r ? r.revenue : 0
  }, [erRows, currentMonthKey])

  const crecimientoMoM = mrrPrev > 0 ? (mrrProyectado - mrrPrev) / mrrPrev : 0
  const crecimientoYoY = mrrYearAgo > 0 ? (mrrProyectado - mrrYearAgo) / mrrYearAgo : 0

  // ── Charts: últimos 12 meses (para evolución) ──────────────────────────────
  const last12 = erRows.slice(-12)
  const chartData = useMemo(() =>
    last12.map(r => ({
      label: mkLabel(r.monthKey),
      revenue: r.revenue || 0,
      cashCollected: r.cashCollected || 0,
      ganancia: r.ganancia || 0,
    })),
    [erRows]
  )
  const totalRevenue12 = useMemo(() => last12.reduce((s, r) => s + (r.revenue || 0), 0), [erRows])
  const totalCash12 = useMemo(() => last12.reduce((s, r) => s + (r.cashCollected || 0), 0), [erRows])
  const totalGanancia12 = useMemo(() => last12.reduce((s, r) => s + (r.ganancia || 0), 0), [erRows])
  const pctCobrado12 = totalRevenue12 > 0 ? totalCash12 / totalRevenue12 : 0
  const margen12 = totalRevenue12 > 0 ? totalGanancia12 / totalRevenue12 : 0

  // ── Datos para chart Nuevos vs Bajas (12m) ─────────────────────────────────
  const nuevosVsBajasData = useMemo(() => {
    const months = [...new Set(erUnificado.filter(r => !r.isAcumulado && !r.isTotal).map(r => r.monthKey))].sort()
    return months.slice(-12).map(mk => {
      const rows = erUnificado.filter(r => r.monthKey === mk && !r.isAcumulado && !r.isTotal)
      const coreRows = modelFilter === 'todos'
        ? rows.filter(r => MODELOS_CORE.includes(r.modelo.toLowerCase()))
        : rows.filter(r => r.modelo.toLowerCase() === modelFilter.toLowerCase())
      const nuevos = coreRows.reduce((s, r) => s + (r.clientesNuevos || 0), 0)
      const bajas = coreRows.reduce((s, r) => s + Math.abs(r.clientesBajas || 0), 0)
      return { label: mkLabel(mk), nuevos, bajas }
    })
  }, [erUnificado, modelFilter])

  // ── Salud del modelo ──────────────────────────────────────────────────────
  const cac = selectedCohort?.cac || 0
  // LTGP = LTR promedio × margen bruto promedio
  const margenBrutoMes = currentER && currentER.revenue > 0 ? (currentER.gananciaBruta || 0) / currentER.revenue : 0.5
  const ltgp = serviciosKPIs.ltvPromedio * margenBrutoMes

  const ltvCacRatio = cac > 0 && ltgp > 0 ? ltgp / cac : 0
  const payback = cac > 0 && ltgp > 0 && serviciosKPIs.permanencia > 0 ? cac / (ltgp / serviciosKPIs.permanencia) : 0

  // NRR ponderado del mes (de filas por modelo del ER)
  const nrrWavg = useMemo(() => {
    const monthRows = erUnificado.filter(r => r.monthKey === currentMonthKey && !r.isAcumulado && !r.isTotal)
    const coreRows = modelFilter === 'todos'
      ? monthRows.filter(r => MODELOS_CORE.includes(r.modelo.toLowerCase()))
      : monthRows.filter(r => r.modelo.toLowerCase() === modelFilter.toLowerCase())
    const totalCli = coreRows.reduce((s, r) => s + (r.clientesActivos || 0), 0)
    if (totalCli === 0) return 0
    const wsum = coreRows.reduce((s, r) => s + (r.nrr || 0) * (r.clientesActivos || 0), 0)
    const avg = wsum / totalCli
    return avg <= 2 ? avg * 100 : avg // decimal o entero
  }, [erUnificado, currentMonthKey, modelFilter])

  const ltvCacColor = ltvCacRatio >= 3 ? GREEN : ltvCacRatio >= 2 ? AMBER : ltvCacRatio > 0 ? DANGER : 'rgba(26,31,54,0.3)'
  const paybackColor = payback === 0 ? 'rgba(26,31,54,0.3)' : payback <= 6 ? GREEN : payback <= 12 ? AMBER : DANGER
  const margenBrutoColor = margenBrutoMes >= 0.5 ? GREEN : margenBrutoMes >= 0.3 ? AMBER : DANGER
  const nrrColor = nrrWavg >= 100 ? GREEN : nrrWavg >= 90 ? AMBER : nrrWavg > 0 ? DANGER : 'rgba(26,31,54,0.3)'

  // ── Pulso por frente: Adquisición ──────────────────────────────────────────
  const cohort = selectedCohort
  const tasaConversion = cohort && cohort.leadsCount > 0 ? (cohort.closuresCount / cohort.leadsCount) : 0

  // Sparkline de leads y churn — últimos 12 meses de allCohorts y erUnificado
  const leadsSparkData = useMemo(() => {
    return (allCohorts || []).slice(-12).map(c => ({
      label: mkLabel(c.month),
      v: c.leadsCount || 0,
    }))
  }, [allCohorts])

  const churnSparkData = useMemo(() => {
    const months = [...new Set(erUnificado.filter(r => !r.isAcumulado && !r.isTotal).map(r => r.monthKey))].sort()
    return months.slice(-12).map(mk => {
      const rows = erUnificado.filter(r => r.monthKey === mk && !r.isAcumulado && !r.isTotal)
      const coreRows = modelFilter === 'todos'
        ? rows.filter(r => MODELOS_CORE.includes(r.modelo.toLowerCase()))
        : rows.filter(r => r.modelo.toLowerCase() === modelFilter.toLowerCase())
      const totalCli = coreRows.reduce((s, r) => s + (r.clientesActivos || 0), 0)
      const wavg = totalCli > 0 ? coreRows.reduce((s, r) => s + (r.pctChurn || 0) * (r.clientesActivos || 0), 0) / totalCli : 0
      return { label: mkLabel(mk), v: +(wavg * 100).toFixed(1) }
    })
  }, [erUnificado, modelFilter])

  // ── Pulso por frente: Retención ────────────────────────────────────────────
  // Métricas del mes desde el ER
  const monthFulfillment = useMemo(() => {
    const rows = erUnificado.filter(r => r.monthKey === currentMonthKey && !r.isAcumulado && !r.isTotal)
    const coreRows = modelFilter === 'todos'
      ? rows.filter(r => MODELOS_CORE.includes(r.modelo.toLowerCase()))
      : rows.filter(r => r.modelo.toLowerCase() === modelFilter.toLowerCase())
    const sum = (f) => coreRows.reduce((s, r) => s + (r[f] || 0), 0)
    const totalCli = sum('clientesActivos')
    const wavg = (f) => totalCli > 0 ? coreRows.reduce((s, r) => s + (r[f] || 0) * (r.clientesActivos || 0), 0) / totalCli : 0
    return {
      lifeSpan: wavg('erLifeSpan'),
      pctChurn: wavg('pctChurn'),
      mrrNeto: sum('mrrNeto'),
      clientesBajas: sum('clientesBajas'),
    }
  }, [erUnificado, currentMonthKey, modelFilter])

  // ── Desglose por modelo ───────────────────────────────────────────────────
  const modelos = useMemo(() => {
    if (!modelBreakdown.length) return []
    const findErRow = (mk, modelName) => {
      if (!mk) return null
      return erUnificado.find(r =>
        r.monthKey === mk && !r.isAcumulado && !r.isTotal &&
        (r.modelo || '').toLowerCase().trim() === modelName.toLowerCase().trim()
      )
    }
    return modelBreakdown
      .filter(m => m.clientesActivos > 0 && (modelFilter === 'todos' || m.model === modelFilter))
      .map(m => {
        const erMes = findErRow(currentMonthKey, m.model)
        const erMesPrev = findErRow(prevER?.monthKey, m.model)
        const ganancia = erMes?.gananciaNeta ?? erMes?.ganancia ?? 0
        const revenue = erMes?.revenue || 0
        const margen = revenue > 0 ? ganancia / revenue : 0
        const mrrActualER = revenue
        const mrrPrevER = erMesPrev?.revenue || 0
        const crecMoM = mrrPrevER > 0 ? (mrrActualER - mrrPrevER) / mrrPrevER : 0
        const margenBrutoModel = revenue > 0 && erMes?.gananciaBruta ? erMes.gananciaBruta / revenue : margenBrutoMes
        const ltgpModel = m.ltvPromedio * margenBrutoModel
        return {
          model: m.model,
          clientes: m.clientesActivos,
          mrr: m.mrr,
          aov: m.aov,
          ltgp: ltgpModel,
          ganancia,
          margen,
          crecMoM,
        }
      })
      .sort((a, b) => b.mrr - a.mrr)
  }, [modelBreakdown, modelFilter, erUnificado, currentMonthKey, prevER, margenBrutoMes])

  if (!erRows.length && !serviciosData.length) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(26,31,54,0.38)', fontSize: 14 }}>Sin datos disponibles.</div>
  }

  return (
    <>
      {/* ═══ 1. PULSO DEL NEGOCIO ═══════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 12, marginBottom: 24 }}>
        {/* MRR Proyectado + Crecimiento */}
        <NorthCard label="MRR Proyectado" highlight>
          <span style={{ fontSize: 38, fontWeight: 900, color: '#fff', letterSpacing: -1.5, lineHeight: 1 }}>
            {fmt(mrrProyectado)}
          </span>
          <div style={{ display: 'flex', gap: 12, marginTop: 6, alignItems: 'center' }}>
            {crecimientoMoM !== 0 && (
              <span style={{ fontSize: 11, fontWeight: 800, color: crecimientoMoM > 0 ? '#86EFAC' : '#FCA5A5', background: 'rgba(255,255,255,0.1)', padding: '3px 8px', borderRadius: 6 }}>
                MoM {fmtDelta(crecimientoMoM)}
              </span>
            )}
            {crecimientoYoY !== 0 && (
              <span style={{ fontSize: 11, fontWeight: 800, color: crecimientoYoY > 0 ? '#86EFAC' : '#FCA5A5', background: 'rgba(255,255,255,0.1)', padding: '3px 8px', borderRadius: 6 }}>
                YoY {fmtDelta(crecimientoYoY)}
              </span>
            )}
          </div>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 600, marginTop: 8, display: 'block' }}>
            {serviciosKPIs.clientesActivos} clientes · {serviciosKPIs.serviciosActivos} servicios
          </span>
        </NorthCard>

        {/* Ganancia Proyectada */}
        <NorthCard label="Ganancia Proyectada">
          <span style={{ fontSize: 28, fontWeight: 800, color: gananciaProyectada > 0 ? GREEN : DANGER, letterSpacing: -0.5, lineHeight: 1.1 }}>
            {fmt(gananciaProyectada)}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: margenProyectado > 0.25 ? ACCENT : margenProyectado > 0.1 ? 'rgba(26,31,54,0.6)' : DANGER }}>
              {fmtPct(margenProyectado)}
            </span>
            <span style={{ fontSize: 10, color: 'rgba(26,31,54,0.35)', fontWeight: 600 }}>margen</span>
          </div>
          <span style={{ fontSize: 10, color: 'rgba(26,31,54,0.4)', fontWeight: 600, marginTop: 6, display: 'block' }}>MRR − costos del mes ({fmt(costosDelMes)})</span>
        </NorthCard>
      </div>

      {/* ═══ 2. EVOLUCIÓN ═══════════════════════════════════════════════════ */}
      {chartData.length > 1 && (
        <>
          <Divider title="Evolución 12 meses" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 12, marginBottom: 14, alignItems: 'stretch' }}>
            <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 14, padding: '14px 18px' }}>
              <RevenueCollectedChart data={chartData} height={190} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <HealthCard label="Revenue 12m" value={fmt(totalRevenue12)} color={ACCENT} />
              <HealthCard label="Cash 12m" value={fmt(totalCash12)} color="#4B5563" />
              <HealthCard label="% Cobrado" value={fmtPct(pctCobrado12)} color={pctCobrado12 >= 0.9 ? GREEN : pctCobrado12 >= 0.7 ? AMBER : DANGER} />
              <HealthCard label="Ganancia 12m" value={fmt(totalGanancia12)} color={GREEN} />
              <HealthCard label="Margen 12m" value={fmtPct(margen12)} color={margen12 >= 0.25 ? GREEN : margen12 >= 0.1 ? AMBER : DANGER} />
            </div>
          </div>
        </>
      )}

      {/* ═══ 3. UNIDAD ECONÓMICA + EVOLUCIÓN CLIENTES ═══════════════════ */}
      <Divider title="Unidad económica" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 12, marginBottom: 24 }}>
        <HealthCard
          label="LTV (LTGP)"
          value={ltgp > 0 ? fmt(ltgp) : '—'}
          color={ACCENT}
          sub="LTR × margen bruto"
        />
        <HealthCard
          label="CAC"
          value={cac > 0 ? fmt(cac) : '—'}
          color="#1a1f36"
          sub={cac > 0 && ltgp > 0 ? `${(ltgp / cac).toFixed(1)}x LTV/CAC` : 'sin CAC del cohort'}
        />
        {/* Chart Nuevos vs Bajas */}
        <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 14, padding: '14px 18px' }}>
          <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.4)', fontWeight: 700, display: 'block', marginBottom: 8 }}>Nuevos vs Bajas — 12 meses</span>
          <div style={{ display: 'flex', gap: 12, marginBottom: 8, fontSize: 10, color: 'rgba(26,31,54,0.5)', fontWeight: 600 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 2, background: GREEN, borderRadius: 1 }} /> Nuevos
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 2, background: DANGER, borderRadius: 1 }} /> Bajas
            </span>
          </div>
          <NuevosBajasBars data={nuevosVsBajasData} />
        </div>
      </div>

      {/* ═══ 4. PULSO POR FRENTE ═══════════════════════════════════════════ */}
      <Divider title="Pulso por frente" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
        {/* Adquisición */}
        <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 14, padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: ACCENT, letterSpacing: 0.5 }}>ADQUISICIÓN</span>
            <span style={{ fontSize: 10, color: 'rgba(26,31,54,0.35)', fontWeight: 600 }}>· marketing</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 14 }}>
            <StatChip label="Ventas" value={cohort?.closuresCount || '—'} />
            <StatChip label="MER" value={cohort?.mer > 0 ? `${cohort.mer.toFixed(1)}x` : '—'} />
            <StatChip label="Inversión" value={cohort?.gasto > 0 ? fmt(cohort.gasto) : '—'} />
            <StatChip label="CAC" value={cac > 0 ? fmt(cac) : '—'} />
            <StatChip label="Leads" value={cohort?.leadsCount || '—'} />
            <StatChip label="CPL" value={cohort?.cpl > 0 ? fmt(cohort.cpl) : '—'} />
          </div>
          <Sparkline data={leadsSparkData} dataKey="v" color={ACCENT} />
        </div>

        {/* Retención */}
        <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 14, padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: GREEN, letterSpacing: 0.5 }}>RETENCIÓN</span>
            <span style={{ fontSize: 10, color: 'rgba(26,31,54,0.35)', fontWeight: 600 }}>· fulfillment</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 14 }}>
            <StatChip label="Life Span" value={monthFulfillment.lifeSpan > 0 ? `${monthFulfillment.lifeSpan.toFixed(1)}m` : '—'} />
            <StatChip label="Churn" value={monthFulfillment.pctChurn > 0 ? `${(monthFulfillment.pctChurn * 100).toFixed(1)}%` : '—'} color={monthFulfillment.pctChurn > 0.05 ? DANGER : undefined} />
            <StatChip label="NRR" value={nrrWavg > 0 ? `${Math.round(nrrWavg)}%` : '—'} color={nrrColor} />
            <StatChip label="MRR Neto" value={monthFulfillment.mrrNeto !== 0 ? fmt(monthFulfillment.mrrNeto) : '—'} color={monthFulfillment.mrrNeto > 0 ? GREEN : monthFulfillment.mrrNeto < 0 ? DANGER : undefined} />
            <StatChip label="C. Bajas" value={monthFulfillment.clientesBajas !== 0 ? `${Math.abs(monthFulfillment.clientesBajas)}` : '—'} color={monthFulfillment.clientesBajas !== 0 ? DANGER : undefined} />
          </div>
          <Sparkline data={churnSparkData} dataKey="v" color={DANGER} />
        </div>
      </div>

      {/* ═══ 5. DESGLOSE POR MODELO ═══════════════════════════════════════ */}
      <Divider title="Desglose por modelo" />
      <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 14, padding: 20, marginBottom: 10 }}>
        <DataTable
          rows={modelos}
          columns={[
            { key: 'model', label: 'Modelo', render: v => <ModelBadge tipo={v} /> },
            { key: 'clientes', label: 'Clientes', align: 'right' },
            { key: 'mrr', label: 'MRR', align: 'right', render: v => <span style={{ color: ACCENT, fontWeight: 700 }}>{fmt(v)}</span> },
            { key: 'aov', label: 'AOV', align: 'right', render: v => fmt(v) },
            { key: 'ltgp', label: 'LTGP', align: 'right', render: v => fmt(v) },
            { key: 'ganancia', label: 'Ganancia', align: 'right', render: v => <span style={{ color: v > 0 ? GREEN : v < 0 ? DANGER : 'rgba(26,31,54,0.4)', fontWeight: 700 }}>{fmt(v)}</span> },
            { key: 'margen', label: 'Margen', align: 'right', render: v => <span style={{ color: v > 0.25 ? GREEN : v > 0.1 ? 'rgba(26,31,54,0.7)' : DANGER, fontWeight: 700 }}>{fmtPct(v)}</span> },
            { key: 'crecMoM', label: 'MoM', align: 'right', render: v => v !== 0 ? <span style={{ color: v > 0 ? GREEN : DANGER, fontWeight: 700, fontSize: 12 }}>{fmtDelta(v)}</span> : '—' },
          ]}
          emptyText="Sin datos por modelo"
        />
      </div>
    </>
  )
}
