import { useState, useMemo } from 'react'
import { KPI, Delta } from '../components/KPI.jsx'
import { MiniChart } from '../components/MiniChart.jsx'
import { DataTable } from '../components/DataTable.jsx'
import { computeEgresosBreakdown, aggregateHistorico } from '../lib/maestro.js'

const ACCENT = '#2D7AFF'
const DANGER = '#E03E3E'
const GREEN = '#059669'
const ACCENT_DIM = 'rgba(45,122,255,0.12)'
const ACCENT_BORDER = 'rgba(45,122,255,0.28)'

const SUB_TABS = [
  ['pl', 'P&L'],
  ['ingresos', 'Proyección Ingresos'],
  ['deudas', 'Deudas'],
  ['egresos', 'Proyección Egresos'],
]

function fmt(v) { return (v !== undefined && v !== null && v !== 0) ? `$${Math.round(v).toLocaleString('en-US')}` : '—' }
function fmtPct(v) { return (v !== null && v !== undefined && v !== 0) ? `${(v * 100).toFixed(1)}%` : '—' }
function fmtPctDelta(v) { return v ? `${v > 0 ? '+' : ''}${(v * 100).toFixed(1)}%` : null }

const Divider = ({ title }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '28px 0 16px' }}>
    <div style={{ width: 3, height: 14, background: ACCENT, borderRadius: 2 }} />
    <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2.5, color: 'rgba(26,31,54,0.5)', fontWeight: 700 }}>{title}</span>
    <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.08)' }} />
  </div>
)

// ─── P&L Statement row ────────────────────────────────────────────────────────
function PLRow({ label, value, color, indent = 0, bold = false, sub, pct, delta, dimValue = false, separator = false }) {
  if (separator) return <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', margin: '6px 0' }} />
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: 8,
      paddingLeft: indent * 20, paddingTop: 5, paddingBottom: 5,
      borderBottom: bold ? '1px solid rgba(0,0,0,0.06)' : 'none',
    }}>
      <span style={{ flex: 1, fontSize: bold ? 13 : 12, fontWeight: bold ? 700 : 500, color: bold ? 'rgba(26,31,54,0.85)' : 'rgba(26,31,54,0.6)' }}>
        {indent > 0 && <span style={{ color: 'rgba(26,31,54,0.25)', marginRight: 6 }}>·</span>}
        {label}
      </span>
      {sub && <span style={{ fontSize: 11, color: 'rgba(26,31,54,0.38)', fontWeight: 500 }}>{sub}</span>}
      {pct && <span style={{ fontSize: 11, color: 'rgba(26,31,54,0.45)', fontWeight: 600 }}>{pct}</span>}
      {delta}
      <span style={{
        fontSize: bold ? 14 : 12, fontWeight: bold ? 800 : 500, minWidth: 90, textAlign: 'right',
        color: dimValue ? 'rgba(26,31,54,0.35)' : (color || (bold ? '#1a1f36' : 'rgba(26,31,54,0.75)')),
        letterSpacing: bold ? -0.3 : 0,
      }}>{value}</span>
    </div>
  )
}

// ─── P&L Tab ──────────────────────────────────────────────────────────────────
function PLTab({ er, historico, selectedERMonth, modelFilter }) {
  const [localMonth, setLocalMonth] = useState(null)
  const currentER = useMemo(() => {
    if (!er.length) return null
    const key = localMonth || selectedERMonth
    return er.find(r => r.monthKey === key) || er[er.length - 1]
  }, [er, selectedERMonth, localMonth])

  const prevER = useMemo(() => {
    if (!currentER || !er.length) return null
    const idx = er.findIndex(r => r.monthKey === currentER.monthKey)
    return idx > 0 ? er[idx - 1] : null
  }, [er, currentER])

  const currentH = useMemo(() =>
    currentER ? aggregateHistorico(historico, currentER.monthKey, modelFilter) : null,
    [historico, currentER, modelFilter]
  )

  const prevH = useMemo(() =>
    prevER ? aggregateHistorico(historico, prevER.monthKey, modelFilter) : null,
    [historico, prevER, modelFilter]
  )

  if (!currentER) return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(26,31,54,0.38)', fontSize: 14 }}>Sin datos del período.</div>

  const MESES_LABEL = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

  const costoVentas = currentH ? (currentH.comisiones + currentH.extraccion + currentH.gastosDirectos + currentH.gastosIndirectos) : 0
  const prevCostoVentas = prevH ? (prevH.comisiones + prevH.extraccion + prevH.gastosDirectos + prevH.gastosIndirectos) : 0

  const chart12 = er.slice(-12)

  return (
    <>
      {/* Selector de mes inline */}
      {er.length > 0 && (
        <div style={{ display: 'flex', gap: 2, background: 'rgba(26,31,54,0.04)', borderRadius: 10, padding: 3, border: '1px solid rgba(26,31,54,0.08)', marginBottom: 20, width: 'fit-content' }}>
          {er.slice(-6).map(r => {
            const isActive = r.monthKey === currentER.monthKey
            return (
              <button key={r.monthKey} onClick={() => setLocalMonth(r.monthKey)} style={{
                padding: '5px 11px', borderRadius: 7, border: 'none',
                background: isActive ? ACCENT : 'transparent',
                color: isActive ? '#fff' : 'rgba(26,31,54,0.45)',
                fontSize: 11, fontWeight: 700, fontFamily: "'Montserrat'", cursor: 'pointer',
              }}>
                {MESES_LABEL[r.month - 1]} {String(r.year).slice(-2)}
              </button>
            )
          })}
        </div>
      )}

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
        <KPI label="Revenue" value={fmt(currentER.revenue)} highlight
          delta={<Delta current={currentER.revenue} previous={prevER?.revenue} />} />
        <KPI label="Cash Collected" value={fmt(currentH?.cashCollected ?? currentER.cashCollected)} ring
          delta={<Delta current={currentH?.cashCollected} previous={prevH?.cashCollected} />} />
        <KPI label="Ganancia Bruta" value={fmt(currentH?.gananciaBruta)}
          accent={currentH?.gananciaBruta > 0 ? GREEN : DANGER}
          delta={<Delta current={currentH?.gananciaBruta} previous={prevH?.gananciaBruta} />} />
        <KPI label="Ganancia Neta" value={fmt(currentER.ganancia)}
          accent={currentER.ganancia > 0 ? GREEN : DANGER}
          delta={<Delta current={currentER.ganancia} previous={prevER?.ganancia} />} />
      </div>

      {/* P&L Statement */}
      <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 16, padding: '20px 24px', marginBottom: 20 }}>

        {/* INGRESOS */}
        <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2.5, color: 'rgba(26,31,54,0.35)', fontWeight: 700, marginBottom: 8 }}>Ingresos</div>
        <PLRow label="Revenue" value={fmt(currentER.revenue)} bold
          pct={fmtPctDelta(currentER.pctMensual) ? `${fmtPctDelta(currentER.pctMensual)} m/m` : null}
          delta={<Delta current={currentER.revenue} previous={prevER?.revenue} />} />
        <PLRow label="Proyectada (MRR día 1)" value={fmt(currentER.proyectada)} indent={1} dimValue />
        <PLRow separator />
        <PLRow label="Cash Collected" value={fmt(currentH?.cashCollected ?? currentER.cashCollected)} bold
          delta={<Delta current={currentH?.cashCollected} previous={prevH?.cashCollected} />} />
        <PLRow label="Del mes" value={fmt(currentER.cobrosMes)} indent={1}
          sub={currentER.pctCobradosMes ? `${Math.round(currentER.pctCobradosMes * 100)}% cobrado` : null} />
        <PLRow label="Deudas cobradas" value={fmt(currentER.deudasCobradas)} indent={1} />

        {/* COSTO DE VENTAS */}
        <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', margin: '12px 0 8px' }} />
        <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2.5, color: 'rgba(26,31,54,0.35)', fontWeight: 700, marginBottom: 8 }}>Costo de ventas</div>
        {currentH ? <>
          <PLRow label="Comisiones + Extracción" value={fmt(currentH.comisiones + currentH.extraccion)} color={DANGER} indent={1} />
          <PLRow label="Gastos operativos directos" value={fmt(currentH.gastosDirectos)} color={DANGER} indent={1} />
          <PLRow label="Gastos operativos indirectos" value={fmt(currentH.gastosIndirectos)} color={DANGER} indent={1} />
          <PLRow label="Total costo de ventas" value={fmt(costoVentas)} color={DANGER} bold
            delta={<Delta current={costoVentas} previous={prevCostoVentas} inverse />} />
        </> : <div style={{ fontSize: 12, color: 'rgba(26,31,54,0.35)', padding: '8px 0' }}>Sin datos del Histórico para este período/modelo.</div>}

        {/* GANANCIA BRUTA */}
        <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', margin: '12px 0 8px' }} />
        <PLRow label="Ganancia Bruta" value={fmt(currentH?.gananciaBruta)}
          pct={fmtPct(currentH?.pctBruto)}
          color={currentH?.gananciaBruta > 0 ? GREEN : DANGER} bold
          delta={<Delta current={currentH?.gananciaBruta} previous={prevH?.gananciaBruta} />} />

        {/* GASTOS ADM */}
        <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', margin: '12px 0 8px' }} />
        <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2.5, color: 'rgba(26,31,54,0.35)', fontWeight: 700, marginBottom: 8 }}>Gastos administrativos (ponderados)</div>
        {currentH && <PLRow label="Total gastos adm" value={fmt(currentH.totalGastosAdm)} color={DANGER} bold
          delta={<Delta current={currentH.totalGastosAdm} previous={prevH?.totalGastosAdm} inverse />} />}

        {/* GANANCIA NETA */}
        <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', margin: '12px 0 8px' }} />
        <PLRow label="Ganancia Neta" value={fmt(currentER.ganancia)}
          pct={fmtPct(currentH?.pctNeto)}
          color={currentER.ganancia > 0 ? GREEN : DANGER} bold
          delta={<Delta current={currentER.ganancia} previous={prevER?.ganancia} />} />
        <PLRow label="Total (con deudas cobradas)" value={fmt(currentER.ganancia)} indent={1} />
        <PLRow label="Solo del período" value={fmt(currentER.delMes)} indent={1} color={currentER.delMes > 0 ? GREEN : DANGER} />
      </div>

      {/* Evolución */}
      {chart12.length > 1 && (
        <>
          <Divider title="Evolución 12 meses" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 10 }}>
            <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 14, padding: 20 }}>
              <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.5)', fontWeight: 700, marginBottom: 8, display: 'block' }}>Revenue vs Cash Collected</span>
              <MiniChart data={chart12.map(r => ({ label: r.monthLabel, revenue: r.revenue }))} dataKey="revenue" color={ACCENT} prefix="$" />
            </div>
            <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 14, padding: 20 }}>
              <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.5)', fontWeight: 700, marginBottom: 8, display: 'block' }}>Ganancia Neta</span>
              <MiniChart data={chart12.map(r => ({ label: r.monthLabel, ganancia: r.ganancia }))} dataKey="ganancia" color={GREEN} prefix="$" />
            </div>
          </div>
        </>
      )}

      {/* P&L tabla histórica */}
      <Divider title="Detalle mensual" />
      <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 14, padding: 20, marginBottom: 10 }}>
        <DataTable
          rows={[...er].reverse().slice(0, 12).reverse()}
          columns={[
            { key: 'monthLabel', label: 'Período', sortable: false },
            { key: 'revenue', label: 'Revenue', align: 'right', render: v => fmt(v) },
            { key: 'cashCollected', label: 'Cash', align: 'right', render: v => fmt(v) },
            { key: 'deudasCobradas', label: 'Deudas cobr.', align: 'right', render: v => fmt(v) },
            { key: 'gastos', label: 'Gastos', align: 'right', render: v => fmt(v) },
            { key: 'ganancia', label: 'Ganancia', align: 'right', render: v => (
              <span style={{ color: v > 0 ? GREEN : DANGER, fontWeight: 700 }}>{fmt(v)}</span>
            )},
            { key: 'margenNeto', label: 'Margen', align: 'right', render: v => (
              <span style={{ color: v > 0.3 ? ACCENT : v > 0.15 ? 'rgba(26,31,54,0.7)' : DANGER, fontWeight: 600 }}>{fmtPct(v)}</span>
            )},
            { key: 'proyectada', label: 'Proyectada', align: 'right', render: v => v > 0 ? fmt(v) : '—' },
          ]}
        />
      </div>

      {/* Análisis IA */}
      <Divider title="Análisis financiero" />
      <InsightsBlock currentER={currentER} prevER={prevER} />
    </>
  )
}

// ─── Deudas Tab ───────────────────────────────────────────────────────────────
function DeudasTab({ er }) {
  const last12 = er.slice(-12)
  const current = er[er.length - 1]
  const prev = er.length > 1 ? er[er.length - 2] : null

  if (!current) return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(26,31,54,0.38)', fontSize: 14 }}>Sin datos.</div>

  const totalDeuda = (current.deudasNueva || 0) + (current.deudasHistorica || 0)

  return (
    <>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
        <div style={{ background: 'linear-gradient(135deg, #2D7AFF 0%, #1e5fd4 100%)', border: '1px solid rgba(45,122,255,0.3)', boxShadow: '0 4px 16px rgba(45,122,255,0.25)', borderRadius: 12, padding: '16px 20px' }}>
          <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.7)', fontWeight: 700, display: 'block', marginBottom: 6 }}>Deudas a favor</span>
          <span style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>{fmt(current.deudasAFavor)}</span>
        </div>
        <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 12, padding: '16px 20px' }}>
          <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.38)', fontWeight: 700, display: 'block', marginBottom: 6 }}>Corriente</span>
          <span style={{ fontSize: 28, fontWeight: 800, color: '#F59E0B', letterSpacing: -0.5 }}>{fmt(current.deudasNueva)}</span>
          <span style={{ fontSize: 10, color: 'rgba(26,31,54,0.38)', display: 'block', marginTop: 2 }}>{'< 1 mes'}</span>
        </div>
        <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 12, padding: '16px 20px' }}>
          <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.38)', fontWeight: 700, display: 'block', marginBottom: 6 }}>Morosos</span>
          <span style={{ fontSize: 28, fontWeight: 800, color: DANGER, letterSpacing: -0.5 }}>{fmt(current.deudasHistorica)}</span>
          <span style={{ fontSize: 10, color: 'rgba(26,31,54,0.38)', display: 'block', marginTop: 2 }}>{'> 1 mes'}</span>
        </div>
        <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 12, padding: '16px 20px' }}>
          <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.38)', fontWeight: 700, display: 'block', marginBottom: 6 }}>Incobrables</span>
          <span style={{ fontSize: 28, fontWeight: 800, color: 'rgba(26,31,54,0.35)', letterSpacing: -0.5 }}>{fmt(current.deudasIncobrable)}</span>
          <span style={{ fontSize: 10, color: 'rgba(26,31,54,0.38)', display: 'block', marginTop: 2 }}>{'> 6 meses'}</span>
        </div>
      </div>

      {/* % Recuperada + cobradas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
        <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 12, padding: '16px 20px' }}>
          <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.38)', fontWeight: 700, display: 'block', marginBottom: 6 }}>% Deuda recuperada</span>
          <span style={{ fontSize: 28, fontWeight: 800, color: current.pctDeudaRec > 0.5 ? GREEN : '#F59E0B', letterSpacing: -0.5 }}>
            {current.pctDeudaRec ? `${(current.pctDeudaRec * 100).toFixed(1)}%` : '—'}
          </span>
          <span style={{ fontSize: 10, color: 'rgba(26,31,54,0.38)', display: 'block', marginTop: 2 }}>del total corriente + morosos</span>
        </div>
        <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 12, padding: '16px 20px' }}>
          <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.38)', fontWeight: 700, display: 'block', marginBottom: 6 }}>Cobrado este mes</span>
          <span style={{ fontSize: 28, fontWeight: 800, color: GREEN, letterSpacing: -0.5 }}>{fmt(current.deudasCobradas)}</span>
          <Delta current={current.deudasCobradas} previous={prev?.deudasCobradas} />
        </div>
      </div>

      {/* Evolución */}
      <Divider title="Evolución de deudas" />
      <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 14, padding: 20 }}>
        <DataTable
          rows={[...last12].reverse()}
          columns={[
            { key: 'monthLabel', label: 'Período', sortable: false },
            { key: 'deudasAFavor', label: 'Total a favor', align: 'right', render: v => fmt(v) },
            { key: 'deudasNueva', label: 'Corriente', align: 'right', render: v => (
              <span style={{ color: v > 0 ? '#F59E0B' : 'rgba(26,31,54,0.3)' }}>{fmt(v)}</span>
            )},
            { key: 'deudasHistorica', label: 'Morosos', align: 'right', render: v => (
              <span style={{ color: v > 0 ? DANGER : 'rgba(26,31,54,0.3)' }}>{fmt(v)}</span>
            )},
            { key: 'deudasIncobrable', label: 'Incobrable', align: 'right', render: v => (
              <span style={{ color: v > 0 ? 'rgba(26,31,54,0.4)' : 'rgba(26,31,54,0.2)' }}>{fmt(v)}</span>
            )},
            { key: 'deudasCobradas', label: 'Cobrado', align: 'right', render: v => (
              <span style={{ color: v > 0 ? GREEN : 'rgba(26,31,54,0.3)', fontWeight: 700 }}>{fmt(v)}</span>
            )},
            { key: 'pctDeudaRec', label: '% Rec.', align: 'right', render: v => (
              <span style={{ color: v > 0.5 ? GREEN : v > 0 ? '#F59E0B' : 'rgba(26,31,54,0.3)', fontWeight: 600 }}>
                {v ? `${(v * 100).toFixed(0)}%` : '—'}
              </span>
            )},
          ]}
        />
      </div>
    </>
  )
}

// ─── Egresos Tab ──────────────────────────────────────────────────────────────
const MODELO_ORDER = { todos: 0, Todos: 0, boutique: 1, Boutique: 1, agencia: 2, Agencia: 2, soft: 3, Soft: 3, financiera: 4, Financiera: 4 }
const MODELO_COLORS = {
  Todos:      { bg: 'rgba(0,0,0,0.05)',        color: 'rgba(26,31,54,0.55)',   border: 'rgba(0,0,0,0.1)'       },
  Boutique:   { bg: 'rgba(245,158,11,0.1)',   color: '#D97706',               border: 'rgba(245,158,11,0.25)' },
  Agencia:    { bg: 'rgba(59,130,246,0.1)',   color: '#2D7AFF',               border: 'rgba(59,130,246,0.25)' },
  Soft:       { bg: 'rgba(0,0,0,0.04)',       color: 'rgba(26,31,54,0.55)',   border: 'rgba(0,0,0,0.1)'       },
  Financiera: { bg: 'rgba(16,185,129,0.1)',   color: '#059669',               border: 'rgba(16,185,129,0.25)' },
}
function ModeloBadge({ value }) {
  const c = MODELO_COLORS[value] || MODELO_COLORS.Todos
  return <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: c.bg, color: c.color, border: `1px solid ${c.border}`, whiteSpace: 'nowrap' }}>{value || '—'}</span>
}
function modeloRank(m) { return MODELO_ORDER[m] ?? 99 }
const RECURRENCIA_ORDER = { Mensual: 0, Trimestral: 1, Semestral: 2, Anual: 3 }
function egresoMes(e) { return e.montoPorMes || e.monto || 0 }
function sortEgresos(rows) {
  return [...rows].sort((a, b) => {
    const mo = modeloRank(a.modelo) - modeloRank(b.modelo)
    if (mo !== 0) return mo
    const ro = (RECURRENCIA_ORDER[a.recurrencia] ?? 99) - (RECURRENCIA_ORDER[b.recurrencia] ?? 99)
    if (ro !== 0) return ro
    return egresoMes(a) - egresoMes(b)
  })
}
function EgresosTable({ rows, totalLabel, totalColor, factor = 1, showModelo = false }) {
  const totalMes = rows.reduce((s, e) => s + egresoMes(e) * factor, 0)
  const modeloCol = showModelo ? [{ key: 'modelo', label: 'Modelo', width: 90, render: v => <ModeloBadge value={v} /> }] : []
  const cols = [
    ...modeloCol,
    { key: 'recurrencia', label: 'Rec.',      width: 70, render: v => <span style={{ color: 'rgba(26,31,54,0.45)', fontSize: 11 }}>{v || '—'}</span> },
    { key: 'proveedor',   label: 'Proveedor', width: 120, render: v => <span style={{ fontWeight: 700 }}>{v || '—'}</span> },
    { key: 'servicio',    label: 'Servicio',  wrap: true },
    { key: '_total',      label: 'Total',     width: 68, align: 'right', render: (_, row) => (
      <span style={{ color: 'rgba(26,31,54,0.3)', fontSize: 11 }}>{row.monto ? fmt(row.monto * factor) : '—'}</span>
    )},
    { key: '_mes', label: '$ / mes', width: 80, align: 'right', render: (_, row) => (
      <span style={{ color: totalColor, fontWeight: 700, fontSize: 13 }}>{fmt(egresoMes(row) * factor)}</span>
    )},
  ]
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 12, overflow: 'hidden', marginBottom: 8 }}>
      <DataTable rows={sortEgresos(rows)} columns={cols} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '6px 12px', borderTop: '1px solid rgba(0,0,0,0.07)' }}>
        <span style={{ fontSize: 11, color: 'rgba(26,31,54,0.38)' }}>
          {totalLabel}: <strong style={{ color: totalColor }}>{fmt(totalMes)}/mes</strong>
        </span>
      </div>
    </div>
  )
}
function GastosGeneralesCard({ items, share }) {
  const [openFijos, setOpenFijos] = useState(false)
  const [openVars, setOpenVars] = useState(false)
  const factor = share !== null ? share : 1
  const pct = share !== null ? Math.round(share * 100) : null
  const fijos = items.filter(e => e.tipoGasto?.toLowerCase().includes('fijo'))
  const vars  = items.filter(e => !e.tipoGasto?.toLowerCase().includes('fijo'))
  const totalFijos = fijos.reduce((s, e) => s + egresoMes(e) * factor, 0)
  const totalVars  = vars.reduce((s, e)  => s + egresoMes(e) * factor, 0)
  const total = totalFijos + totalVars
  return (
    <div style={{ marginBottom: 28, background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 16, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 2.5, color: 'rgba(26,31,54,0.6)', fontWeight: 700 }}>Gastos Generales (ponderado)</span>
        {pct !== null && <span style={{ fontSize: 11, color: 'rgba(26,31,54,0.38)' }}>{pct}% del MRR</span>}
        <span style={{ marginLeft: 'auto', fontSize: 22, fontWeight: 800, color: DANGER }}>{fmt(total)}/mes</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {fijos.length > 0 && (
          <div>
            <div onClick={() => setOpenFijos(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, cursor: 'pointer', userSelect: 'none' }}>
              <span style={{ fontSize: 10, color: 'rgba(26,31,54,0.3)' }}>{openFijos ? '▾' : '▸'}</span>
              <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.45)', fontWeight: 700 }}>Fijos — {fmt(totalFijos)}/mes</span>
            </div>
            {openFijos && <EgresosTable rows={fijos} totalLabel="Subtotal fijos" totalColor={DANGER} factor={factor} />}
          </div>
        )}
        {vars.length > 0 && (
          <div>
            <div onClick={() => setOpenVars(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, cursor: 'pointer', userSelect: 'none' }}>
              <span style={{ fontSize: 10, color: 'rgba(26,31,54,0.3)' }}>{openVars ? '▾' : '▸'}</span>
              <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.45)', fontWeight: 700 }}>Variables — {fmt(totalVars)}/mes</span>
            </div>
            {openVars && <EgresosTable rows={vars} totalLabel="Subtotal variables" totalColor={DANGER} factor={factor} />}
          </div>
        )}
      </div>
    </div>
  )
}
function EgresosTab({ egresos, modelFilter, servicios }) {
  const mrrByUnit = useMemo(() => {
    const active = (servicios || []).filter(s => s.estado?.toLowerCase() === 'activo')
    const result = { Boutique: 0, Agencia: 0, Soft: 0, Financiera: 0, total: 0 }
    for (const s of active) {
      if (result[s.tipo] !== undefined) result[s.tipo] += s.monto
      result.total += s.monto
    }
    return result
  }, [servicios])
  const shareOf = (unit) => mrrByUnit.total > 0 ? mrrByUnit[unit] / mrrByUnit.total : 0
  const todosItems = egresos.filter(e => e.modelo?.toLowerCase() === 'todos')
  const isUnit = modelFilter && modelFilter !== 'todos'
  const unitSpecific = isUnit
    ? egresos.filter(e => e.modelo?.toLowerCase() === modelFilter.toLowerCase())
    : egresos.filter(e => e.modelo?.toLowerCase() !== 'todos')
  const fijos     = unitSpecific.filter(e => e.tipoGasto?.toLowerCase().includes('fijo'))
  const variables = unitSpecific.filter(e => !e.tipoGasto?.toLowerCase().includes('fijo'))
  const share = isUnit ? shareOf(modelFilter) : null
  const factor = share !== null ? share : 1
  const todosF = todosItems.filter(e => e.tipoGasto?.toLowerCase().includes('fijo'))
  const todosV = todosItems.filter(e => !e.tipoGasto?.toLowerCase().includes('fijo'))
  const totalGralesFijos = todosF.reduce((s, e) => s + egresoMes(e) * factor, 0)
  const totalGralesVars  = todosV.reduce((s, e) => s + egresoMes(e) * factor, 0)
  const totalFijos  = fijos.reduce((s, e) => s + egresoMes(e), 0)
  const totalVars   = variables.reduce((s, e) => s + egresoMes(e), 0)
  const total = totalGralesFijos + totalGralesVars + totalFijos + totalVars
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24, maxWidth: 660 }}>
        <div style={{ background: 'linear-gradient(135deg, #2D7AFF 0%, #1e5fd4 100%)', border: '1px solid rgba(45,122,255,0.3)', boxShadow: '0 4px 16px rgba(45,122,255,0.25)', borderRadius: 12, padding: '16px 20px' }}>
          <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.7)', fontWeight: 700, display: 'block', marginBottom: 6 }}>Total Egresos</span>
          <span style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>{fmt(total)}</span>
        </div>
        <div style={{ background: 'rgba(26,31,54,0.04)', border: '1px solid rgba(26,31,54,0.08)', borderRadius: 12, padding: '16px 20px' }}>
          <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.38)', fontWeight: 700, display: 'block', marginBottom: 6 }}>Fijos</span>
          <span style={{ fontSize: 28, fontWeight: 800, color: 'rgba(26,31,54,0.55)', letterSpacing: -0.5 }}>{fmt(totalGralesFijos + totalFijos)}</span>
        </div>
        <div style={{ background: 'rgba(26,31,54,0.04)', border: '1px solid rgba(26,31,54,0.08)', borderRadius: 12, padding: '16px 20px' }}>
          <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.38)', fontWeight: 700, display: 'block', marginBottom: 6 }}>Variables</span>
          <span style={{ fontSize: 28, fontWeight: 800, color: 'rgba(26,31,54,0.55)', letterSpacing: -0.5 }}>{fmt(totalVars)}</span>
        </div>
      </div>
      {todosItems.length > 0 && <GastosGeneralesCard items={todosItems} share={share} />}
      {(fijos.length > 0 || variables.length > 0) && (
        <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 16, padding: '18px 20px', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 2.5, color: 'rgba(26,31,54,0.6)', fontWeight: 700 }}>Gastos de la Unidad</span>
            <span style={{ marginLeft: 'auto', fontSize: 22, fontWeight: 800, color: DANGER }}>{fmt(totalFijos + totalVars)}/mes</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
            {fijos.length > 0 && (
              <div>
                <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.45)', fontWeight: 700, marginBottom: 8 }}>
                  Fijos — <span style={{ color: DANGER }}>{fmt(totalFijos)}/mes</span>
                </div>
                <EgresosTable rows={fijos} totalLabel="Total fijos" totalColor={DANGER} showModelo={!isUnit} />
              </div>
            )}
            {variables.length > 0 && (
              <div>
                <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.45)', fontWeight: 700, marginBottom: 8 }}>
                  Variables — <span style={{ color: DANGER }}>{fmt(totalVars)}/mes</span>
                </div>
                <EgresosTable rows={variables} totalLabel="Total variables" totalColor={DANGER} showModelo={!isUnit} />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

// ─── Proyección Ingresos Tab ──────────────────────────────────────────────────
function ModeloIngresosCard({ modelo, rows }) {
  const [open, setOpen] = useState(true)
  const c = MODELO_COLORS[modelo] || MODELO_COLORS.Todos

  // Agrupar por cliente, ordenar por MRR del cliente desc
  const byCliente = useMemo(() => {
    const groups = {}
    for (const s of rows) {
      if (!groups[s.idCliente]) groups[s.idCliente] = { nombre: s.nombre, idCliente: s.idCliente, servicios: [], mrr: 0, meses: s.meses }
      groups[s.idCliente].servicios.push(s)
      groups[s.idCliente].mrr += s.monto
    }
    return Object.values(groups).sort((a, b) => b.mrr - a.mrr)
  }, [rows])

  const total = rows.reduce((s, r) => s + r.monto, 0)
  const nClientes = byCliente.length

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 16, marginBottom: 16, overflow: 'hidden' }}>
      {/* Header */}
      <div onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', cursor: 'pointer', userSelect: 'none' }}>
        <span style={{ fontSize: 10, color: 'rgba(26,31,54,0.3)' }}>{open ? '▾' : '▸'}</span>
        <ModeloBadge value={modelo} />
        <span style={{ fontSize: 11, color: 'rgba(26,31,54,0.45)', fontWeight: 600 }}>{nClientes} clientes · {rows.length} servicios</span>
        <span style={{ marginLeft: 'auto', fontSize: 18, fontWeight: 800, color: c.color }}>{fmt(total)}/mes</span>
      </div>

      {/* Clientes */}
      {open && (
        <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', padding: '8px 20px 16px' }}>
          {byCliente.map((cliente, i) => (
            <div key={cliente.idCliente} style={{ marginBottom: i < byCliente.length - 1 ? 12 : 0 }}>
              {/* Fila cliente */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(26,31,54,0.85)', flex: 1 }}>{cliente.nombre}</span>
                <span style={{ fontSize: 10, color: 'rgba(26,31,54,0.35)', fontWeight: 600 }}>{cliente.meses} meses</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: GREEN, minWidth: 80, textAlign: 'right' }}>{fmt(cliente.mrr)}/mes</span>
              </div>
              {/* Servicios del cliente */}
              {cliente.servicios.map((s, j) => (
                <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 16, paddingTop: 4, paddingBottom: 2 }}>
                  <span style={{ fontSize: 10, color: 'rgba(26,31,54,0.25)', marginRight: 2 }}>·</span>
                  <span style={{ fontSize: 11, color: 'rgba(26,31,54,0.55)', flex: 1 }}>{s.servicio || s.area || '—'}</span>
                  <span style={{ fontSize: 11, color: GREEN, fontWeight: 600, minWidth: 80, textAlign: 'right' }}>{fmt(s.monto)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function IngresosTab({ servicios, historico, modelFilter }) {
  const active = useMemo(() =>
    (servicios || []).filter(s =>
      s.estado?.toLowerCase() === 'activo' &&
      (modelFilter === 'todos' || s.tipo?.toLowerCase() === modelFilter.toLowerCase())
    ), [servicios, modelFilter])

  const mrr = active.reduce((s, r) => s + r.monto, 0)
  const clientes = [...new Set(active.map(s => s.idCliente))].length
  const aov = clientes > 0 ? mrr / clientes : 0

  const lastHistMonth = useMemo(() => {
    const months = [...new Set(historico.map(r => r.monthKey))].sort()
    const last = months[months.length - 1]
    if (!last) return null
    return aggregateHistorico(historico, last, modelFilter)
  }, [historico, modelFilter])

  const modelos = ['Boutique', 'Agencia', 'Soft', 'Financiera']
  const byModelo = useMemo(() => {
    const groups = {}
    for (const s of active) {
      const m = s.tipo || 'Sin modelo'
      if (!groups[m]) groups[m] = []
      groups[m].push(s)
    }
    return groups
  }, [active])

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
        <div style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', border: '1px solid rgba(5,150,105,0.3)', boxShadow: '0 4px 16px rgba(5,150,105,0.2)', borderRadius: 12, padding: '16px 20px' }}>
          <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.7)', fontWeight: 700, display: 'block', marginBottom: 6 }}>MRR Total</span>
          <span style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>{fmt(mrr)}</span>
        </div>
        <div style={{ background: 'rgba(26,31,54,0.04)', border: '1px solid rgba(26,31,54,0.08)', borderRadius: 12, padding: '16px 20px' }}>
          <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.38)', fontWeight: 700, display: 'block', marginBottom: 6 }}>Clientes activos</span>
          <span style={{ fontSize: 28, fontWeight: 800, color: 'rgba(26,31,54,0.75)', letterSpacing: -0.5 }}>{clientes}</span>
        </div>
        <div style={{ background: 'rgba(26,31,54,0.04)', border: '1px solid rgba(26,31,54,0.08)', borderRadius: 12, padding: '16px 20px' }}>
          <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.38)', fontWeight: 700, display: 'block', marginBottom: 6 }}>AOV</span>
          <span style={{ fontSize: 28, fontWeight: 800, color: 'rgba(26,31,54,0.75)', letterSpacing: -0.5 }}>{fmt(aov)}</span>
        </div>
        <div style={{ background: 'rgba(26,31,54,0.04)', border: '1px solid rgba(26,31,54,0.08)', borderRadius: 12, padding: '16px 20px' }}>
          <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.38)', fontWeight: 700, display: 'block', marginBottom: 6 }}>NRR (último mes)</span>
          <span style={{ fontSize: 28, fontWeight: 800, color: lastHistMonth?.nrr > 0 ? GREEN : DANGER, letterSpacing: -0.5 }}>
            {lastHistMonth?.nrr ? `${Math.round(lastHistMonth.nrr)}` : '—'}
          </span>
        </div>
      </div>

      {modelos.map(modelo => {
        const rows = byModelo[modelo]
        if (!rows?.length) return null
        return <ModeloIngresosCard key={modelo} modelo={modelo} rows={rows} />
      })}
    </>
  )
}

// ─── Insights Block ───────────────────────────────────────────────────────────
function InsightsBlock({ currentER, prevER }) {
  const [loading, setLoading] = useState(false)
  const [insights, setInsights] = useState(null)
  const [error, setError] = useState(null)

  async function generate() {
    setLoading(true); setError(null)
    try {
      const resp = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: 'finanzas', data: { current: currentER, prev: prevER }, period: currentER?.monthLabel }),
      })
      if (!resp.ok) throw new Error(`Error ${resp.status}`)
      setInsights(await resp.json())
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 14, padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: insights ? 16 : 0 }}>
        <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.5)', fontWeight: 700 }}>Análisis financiero</span>
        {!insights && <button onClick={generate} disabled={loading} style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${ACCENT}`, background: 'rgba(45,122,255,0.1)', color: ACCENT, fontSize: 11, fontWeight: 700, fontFamily: 'Montserrat', cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? '✦ Analizando...' : '✦ Generar análisis'}
        </button>}
        {insights && <button onClick={() => setInsights(null)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.07)', background: 'transparent', color: 'rgba(26,31,54,0.5)', fontSize: 10, cursor: 'pointer', fontFamily: 'Montserrat' }}>↺ regenerar</button>}
      </div>
      {error && <p style={{ color: DANGER, fontSize: 12, marginTop: 12 }}>Error: {error}</p>}
      {!insights && !loading && <p style={{ fontSize: 13, color: 'rgba(26,31,54,0.5)', marginTop: 12 }}>Claude analiza margen vs objetivo, deudas, gastos y proyección del mes.</p>}
      {insights && (
        <>
          <p style={{ fontSize: 14, color: 'rgba(26,31,54,0.75)', lineHeight: 1.7, margin: '0 0 16px', fontWeight: 500 }}>{insights.conclusion}</p>
          <div style={{ background: 'rgba(45,122,255,0.05)', border: '1px solid rgba(45,122,255,0.12)', borderRadius: 10, padding: '14px 18px', marginBottom: 16 }}>
            <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: ACCENT, fontWeight: 700, display: 'block', marginBottom: 6 }}>Cuello de botella</span>
            <p style={{ fontSize: 13, color: 'rgba(26,31,54,0.65)', lineHeight: 1.6, margin: 0 }}>{insights.bottleneck}</p>
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

// ─── Main Module ──────────────────────────────────────────────────────────────
export function FinanzasModule({ er, egresos, servicios, historico = [], selectedERMonth, modelFilter = 'todos', subTab = 'pl', onSubTabChange }) {
  const setSubTab = onSubTabChange || (() => {})
  const erRows = er || []
  const egresosData = egresos || []

  if (!erRows.length && !egresosData.length) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(26,31,54,0.38)', fontSize: 14 }}>Sin datos del Registro Maestro.</div>
  }

  return (
    <>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
        {SUB_TABS.map(([k, l]) => (
          <button key={k} onClick={() => setSubTab(k)} style={{
            background: subTab === k ? ACCENT_DIM : 'transparent',
            border: subTab === k ? `1px solid ${ACCENT_BORDER}` : '1px solid rgba(0,0,0,0.07)',
            borderRadius: 8, padding: '8px 16px',
            color: subTab === k ? ACCENT : 'rgba(26,31,54,0.38)',
            fontSize: 12, cursor: 'pointer', fontWeight: 600, fontFamily: "'Montserrat'", transition: 'all 0.15s',
          }}>{l}</button>
        ))}
      </div>

      {subTab === 'pl'      && <PLTab er={erRows} historico={historico} selectedERMonth={selectedERMonth} modelFilter={modelFilter} />}
      {subTab === 'deudas'  && <DeudasTab er={erRows} />}
      {subTab === 'egresos' && <EgresosTab egresos={egresosData} modelFilter={modelFilter} servicios={servicios} />}
      {subTab === 'ingresos' && <IngresosTab servicios={servicios} historico={historico} modelFilter={modelFilter} />}
    </>
  )
}
