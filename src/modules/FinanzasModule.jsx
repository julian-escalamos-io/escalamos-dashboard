import { useState, useMemo } from 'react'
import { KPI, Delta } from '../components/KPI.jsx'
import { MiniChart } from '../components/MiniChart.jsx'
import { DataTable } from '../components/DataTable.jsx'
import { computeEgresosBreakdown } from '../lib/maestro.js'

const ACCENT = '#2D7AFF'
const DANGER = '#E03E3E'
const GREEN = '#059669'
const ACCENT_DIM = 'rgba(45,122,255,0.12)'
const ACCENT_BORDER = 'rgba(45,122,255,0.28)'

const SUB_TABS = [
  ['proyeccion', 'Proyección'],
  ['pl', 'P&L'],
  ['deudas', 'Deudas'],
]

function fmt(v) { return (v !== undefined && v !== null && v !== 0) ? `$${Math.round(v).toLocaleString('en-US')}` : '—' }
function fmtPct(v) { return (v !== null && v !== undefined && v !== 0) ? `${(v * 100).toFixed(1)}%` : '—' }
function fmtPctDelta(v) { return v ? `${v > 0 ? '+' : ''}${(v * 100).toFixed(1)}%` : null }

const Divider = ({ title, color }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '28px 0 16px' }}>
    <div style={{ width: 3, height: 14, background: color || ACCENT, borderRadius: 2 }} />
    <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2.5, color: 'rgba(26,31,54,0.5)', fontWeight: 700 }}>{title}</span>
    <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.08)' }} />
  </div>
)

const MESES_LABEL = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

// ─── P&L Statement row ────────────────────��───────────────────────���───────────
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

// ─── Helpers para filtrar E.R. Unificado ───────��─────────────────────────────

function getModelRows(erUnificado, modelFilter) {
  if (modelFilter === 'todos') {
    return erUnificado.filter(r => r.isTotal && !r.isAcumulado)
  }
  return erUnificado.filter(r => !r.isTotal && !r.isAcumulado && r.modelo.toLowerCase() === modelFilter.toLowerCase())
}

function getRowForMonth(rows, monthKey) {
  return rows.find(r => r.monthKey === monthKey) || null
}

// ─── P&L Tab ──────��─────────────────────────────��─────────────────────────────
function PLTab({ erUnificado, modelFilter }) {
  const [localMonth, setLocalMonth] = useState(null)

  const modelRows = useMemo(() => getModelRows(erUnificado, modelFilter), [erUnificado, modelFilter])

  const availableMonths = useMemo(() => {
    const seen = new Set()
    return modelRows.filter(r => {
      if (seen.has(r.monthKey)) return false
      seen.add(r.monthKey)
      return true
    })
  }, [modelRows])

  const currentRow = useMemo(() => {
    if (!modelRows.length) return null
    const key = localMonth || modelRows[modelRows.length - 1]?.monthKey
    return getRowForMonth(modelRows, key) || modelRows[modelRows.length - 1]
  }, [modelRows, localMonth])

  const prevRow = useMemo(() => {
    if (!currentRow || !modelRows.length) return null
    const idx = modelRows.findIndex(r => r.monthKey === currentRow.monthKey)
    return idx > 0 ? modelRows[idx - 1] : null
  }, [modelRows, currentRow])

  if (!currentRow) return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(26,31,54,0.38)', fontSize: 14 }}>Sin datos del período.</div>

  const chart12 = modelRows.slice(-12)

  // Desglose por modelo del mes actual (solo si filtro = todos)
  const modelBreakdown = useMemo(() => {
    if (modelFilter !== 'todos' || !currentRow) return []
    const modelos = ['Boutique', 'Agencia', 'Soft', 'Financiera', 'Consultoría', 'Todos']
    return modelos
      .map(m => erUnificado.find(r => r.monthKey === currentRow.monthKey && r.modelo === m && !r.isTotal && !r.isAcumulado))
      .filter(Boolean)
  }, [erUnificado, currentRow, modelFilter])

  return (
    <>
      {/* Selector de mes inline */}
      {availableMonths.length > 0 && (
        <div style={{ display: 'flex', gap: 2, background: 'rgba(26,31,54,0.04)', borderRadius: 10, padding: 3, border: '1px solid rgba(26,31,54,0.08)', marginBottom: 20, width: 'fit-content' }}>
          {availableMonths.slice(-6).map(r => {
            const isActive = r.monthKey === currentRow.monthKey
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 24 }}>
        <KPI label="Revenue" value={fmt(currentRow.revenue)} highlight
          delta={<Delta current={currentRow.revenue} previous={prevRow?.revenue} />} />
        {/* Cash Collected con barra de % cobrado */}
        <div style={{ background: 'rgba(45,122,255,0.04)', border: '1px solid rgba(45,122,255,0.15)', borderRadius: 14, padding: '16px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.8, color: 'rgba(26,31,54,0.6)', fontWeight: 600 }}>Cash Collected</span>
            <Delta current={currentRow.cashCollected} previous={prevRow?.cashCollected} />
          </div>
          <span style={{ fontSize: 26, fontWeight: 800, color: '#1a1f36', letterSpacing: -0.5 }}>{fmt(currentRow.cashCollected)}</span>
          {currentRow.pctEficCobro > 0 && (
            <div style={{ marginTop: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(26,31,54,0.45)', textTransform: 'uppercase', letterSpacing: 1.5 }}>% efic. cobro</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: currentRow.pctEficCobro > 0.8 ? GREEN : currentRow.pctEficCobro > 0.5 ? '#F59E0B' : DANGER }}>
                  {Math.round(currentRow.pctEficCobro * 100)}%
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 99, background: 'rgba(26,31,54,0.08)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 99,
                  width: `${Math.min(currentRow.pctEficCobro * 100, 100)}%`,
                  background: currentRow.pctEficCobro > 0.8 ? GREEN : currentRow.pctEficCobro > 0.5 ? '#F59E0B' : DANGER,
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
          )}
        </div>
        <KPI label="Ganancia Bruta" value={fmt(currentRow.gananciaBruta)}
          accent={currentRow.gananciaBruta > 0 ? GREEN : DANGER}
          delta={<Delta current={currentRow.gananciaBruta} previous={prevRow?.gananciaBruta} />} />
        <KPI label="Ganancia Neta" value={fmt(currentRow.gananciaNeta)}
          accent={currentRow.gananciaNeta > 0 ? GREEN : DANGER}
          delta={<Delta current={currentRow.gananciaNeta} previous={prevRow?.gananciaNeta} />} />
        {/* % Margen Neto — métrica norte */}
        <div style={{
          background: 'linear-gradient(135deg, #1e3fa3 0%, #2D7AFF 100%)',
          border: '1px solid rgba(45,122,255,0.3)',
          borderRadius: 14, padding: '16px 18px',
          boxShadow: '0 4px 16px rgba(45,122,255,0.25)',
          display: 'flex', flexDirection: 'column', gap: 4,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.8, color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>% Margen Neto</span>
          <span style={{ fontSize: 32, fontWeight: 900, color: '#fff', letterSpacing: -1, lineHeight: 1.1 }}>
            {currentRow.pctMargenNeto ? `${(currentRow.pctMargenNeto * 100).toFixed(1)}%` : '—'}
          </span>
          <Delta current={currentRow.pctMargenNeto} previous={prevRow?.pctMargenNeto} />
        </div>
      </div>

      {/* P&L Statement */}
      <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 16, padding: '20px 24px', marginBottom: 20 }}>

        {/* INGRESOS */}
        <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2.5, color: 'rgba(26,31,54,0.35)', fontWeight: 700, marginBottom: 8 }}>Ingresos</div>
        <PLRow label="Revenue (devengado)" value={fmt(currentRow.revenue)} bold
          delta={<Delta current={currentRow.revenue} previous={prevRow?.revenue} />} />
        <PLRow label="Cash Collected (caja)" value={fmt(currentRow.cashCollected)} bold
          delta={<Delta current={currentRow.cashCollected} previous={prevRow?.cashCollected} />} />
        <PLRow label="Cobros a tiempo" value={fmt(currentRow.cobrosATiempo)} indent={1}
          sub={currentRow.revenue > 0 ? `${Math.round(currentRow.cobrosATiempo / currentRow.revenue * 100)}% del revenue` : null} />
        <PLRow label="Cobros de deuda" value={fmt(currentRow.cobrosDeuda)} indent={1} />
        <PLRow separator />

        {/* GASTOS */}
        <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2.5, color: 'rgba(26,31,54,0.35)', fontWeight: 700, marginBottom: 8, marginTop: 12 }}>Gastos</div>
        <PLRow label="Gastos Operativos" value={fmt(currentRow.gastosOp)} color={DANGER} indent={1}
          delta={<Delta current={currentRow.gastosOp} previous={prevRow?.gastosOp} inverse />} />
        <PLRow label="Comisiones Stripe" value={fmt(currentRow.comisionesStripe)} color={DANGER} indent={1} />
        <PLRow label="Gastos Admin (prorr.)" value={fmt(currentRow.gastosAdmin)} color={DANGER} indent={1} />
        <PLRow label="Total Gastos" value={fmt(currentRow.totalGastos)} color={DANGER} bold
          delta={<Delta current={currentRow.totalGastos} previous={prevRow?.totalGastos} inverse />} />
        <PLRow separator />

        {/* GANANCIA BRUTA */}
        <PLRow label="Ganancia Bruta" value={fmt(currentRow.gananciaBruta)}
          pct={fmtPct(currentRow.pctMargenBruto)}
          color={currentRow.gananciaBruta > 0 ? GREEN : DANGER} bold
          delta={<Delta current={currentRow.gananciaBruta} previous={prevRow?.gananciaBruta} />} />
        <PLRow separator />

        {/* GANANCIA NETA */}
        <PLRow label="Ganancia Neta" value={fmt(currentRow.gananciaNeta)}
          pct={fmtPct(currentRow.pctMargenNeto)}
          color={currentRow.gananciaNeta > 0 ? GREEN : DANGER} bold
          delta={<Delta current={currentRow.gananciaNeta} previous={prevRow?.gananciaNeta} />} />
      </div>

      {/* Desglose por modelo (solo cuando filtro = todos) */}
      {modelBreakdown.length > 0 && (
        <>
          <Divider title="Desglose por modelo" />
          <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 14, padding: 20, marginBottom: 20 }}>
            <DataTable
              rows={modelBreakdown}
              columns={[
                { key: 'modelo', label: 'Modelo', render: v => <ModeloBadge value={v} /> },
                { key: 'revenue', label: 'Revenue', align: 'right', render: v => fmt(v) },
                { key: 'cashCollected', label: 'Cash', align: 'right', render: v => fmt(v) },
                { key: 'totalGastos', label: 'Gastos', align: 'right', render: v => <span style={{ color: DANGER }}>{fmt(v)}</span> },
                { key: 'gananciaBruta', label: 'Gan. Bruta', align: 'right', render: v => (
                  <span style={{ color: v > 0 ? GREEN : DANGER, fontWeight: 700 }}>{fmt(v)}</span>
                )},
                { key: 'pctMargenBruto', label: '% Bruto', align: 'right', render: v => (
                  <span style={{ color: v > 0.3 ? GREEN : v > 0.15 ? 'rgba(26,31,54,0.7)' : DANGER, fontWeight: 600 }}>{fmtPct(v)}</span>
                )},
                { key: 'gananciaNeta', label: 'Gan. Neta', align: 'right', render: v => (
                  <span style={{ color: v > 0 ? GREEN : DANGER, fontWeight: 700 }}>{fmt(v)}</span>
                )},
                { key: 'pctMargenNeto', label: '% Neto', align: 'right', render: v => (
                  <span style={{ color: v > 0.3 ? ACCENT : v > 0.15 ? 'rgba(26,31,54,0.7)' : DANGER, fontWeight: 600 }}>{fmtPct(v)}</span>
                )},
              ]}
            />
          </div>
        </>
      )}

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
              <MiniChart data={chart12.map(r => ({ label: r.monthLabel, ganancia: r.gananciaNeta }))} dataKey="ganancia" color={GREEN} prefix="$" />
            </div>
          </div>
        </>
      )}

      {/* Detalle mensual */}
      <Divider title="Detalle mensual" />
      <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 14, padding: 20, marginBottom: 10 }}>
        <DataTable
          rows={[...modelRows].reverse().slice(0, 12).reverse()}
          columns={[
            { key: 'monthLabel', label: 'Período', sortable: false },
            { key: 'revenue', label: 'Revenue', align: 'right', render: v => fmt(v) },
            { key: 'cashCollected', label: 'Cash', align: 'right', render: v => fmt(v) },
            { key: 'pctEficCobro', label: '% Cobro', align: 'right', render: v => (
              <span style={{ color: v > 0.8 ? GREEN : v > 0.5 ? '#F59E0B' : DANGER, fontWeight: 600 }}>{fmtPct(v)}</span>
            )},
            { key: 'totalGastos', label: 'Gastos', align: 'right', render: v => fmt(v) },
            { key: 'gananciaNeta', label: 'Gan. Neta', align: 'right', render: v => (
              <span style={{ color: v > 0 ? GREEN : DANGER, fontWeight: 700 }}>{fmt(v)}</span>
            )},
            { key: 'pctMargenNeto', label: '% Neto', align: 'right', render: v => (
              <span style={{ color: v > 0.3 ? ACCENT : v > 0.15 ? 'rgba(26,31,54,0.7)' : DANGER, fontWeight: 600 }}>{fmtPct(v)}</span>
            )},
          ]}
        />
      </div>

      {/* Análisis IA */}
      <Divider title="Análisis financiero" />
      <InsightsBlock currentRow={currentRow} prevRow={prevRow} />
    </>
  )
}

// ─── Deudas Tab ──────────────────────────────────────────────────────────────
function DeudasTab({ pendingInvoices, incobrables, modelFilter }) {
  const filtered = useMemo(() => {
    if (modelFilter === 'todos') return pendingInvoices
    return pendingInvoices.filter(i => i.modelo.toLowerCase() === modelFilter.toLowerCase())
  }, [pendingInvoices, modelFilter])

  const filteredInc = useMemo(() => {
    if (modelFilter === 'todos') return incobrables
    return incobrables.filter(i => i.modelo.toLowerCase() === modelFilter.toLowerCase())
  }, [incobrables, modelFilter])

  const totalPending = filtered.reduce((s, i) => s + i.monto, 0)
  const totalIncobrable = filteredInc.reduce((s, i) => s + i.monto, 0)

  // Agrupar por modelo para resumen
  const byModelo = useMemo(() => {
    const groups = {}
    for (const inv of filtered) {
      const m = inv.modelo || 'Sin modelo'
      if (!groups[m]) groups[m] = { modelo: m, count: 0, total: 0 }
      groups[m].count++
      groups[m].total += inv.monto
    }
    return Object.values(groups).sort((a, b) => b.total - a.total)
  }, [filtered])

  // Agrupar por antigüedad
  const aging = useMemo(() => {
    const buckets = { current: 0, d30: 0, d60: 0, d90: 0 }
    for (const inv of filtered) {
      if (inv.daysPending <= 30) buckets.current += inv.monto
      else if (inv.daysPending <= 60) buckets.d30 += inv.monto
      else if (inv.daysPending <= 90) buckets.d60 += inv.monto
      else buckets.d90 += inv.monto
    }
    return buckets
  }, [filtered])

  return (
    <>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
        <div style={{ background: 'linear-gradient(135deg, #b91c1c 0%, #E03E3E 100%)', border: '1px solid rgba(224,62,62,0.3)', boxShadow: '0 4px 16px rgba(224,62,62,0.25)', borderRadius: 12, padding: '16px 20px' }}>
          <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.7)', fontWeight: 700, display: 'block', marginBottom: 6 }}>Total pendiente</span>
          <span style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>{fmt(totalPending)}</span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', display: 'block', marginTop: 2 }}>{filtered.length} facturas</span>
        </div>
        <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 12, padding: '16px 20px' }}>
          <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.38)', fontWeight: 700, display: 'block', marginBottom: 6 }}>Incobrable</span>
          <span style={{ fontSize: 28, fontWeight: 800, color: totalIncobrable !== 0 ? DANGER : 'rgba(26,31,54,0.35)', letterSpacing: -0.5 }}>{fmt(totalIncobrable)}</span>
          <span style={{ fontSize: 10, color: 'rgba(26,31,54,0.38)', display: 'block', marginTop: 2 }}>{filteredInc.length} registros</span>
        </div>
        <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 12, padding: '16px 20px' }}>
          <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.38)', fontWeight: 700, display: 'block', marginBottom: 6 }}>Antigüedad promedio</span>
          <span style={{ fontSize: 28, fontWeight: 800, color: '#1a1f36', letterSpacing: -0.5 }}>
            {filtered.length > 0 ? `${Math.round(filtered.reduce((s, i) => s + i.daysPending, 0) / filtered.length)}d` : '—'}
          </span>
        </div>
      </div>

      {/* Aging buckets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 24 }}>
        {[
          { label: '0-30 días', value: aging.current, color: GREEN },
          { label: '31-60 días', value: aging.d30, color: '#F59E0B' },
          { label: '61-90 días', value: aging.d60, color: '#F97316' },
          { label: '90+ días', value: aging.d90, color: DANGER },
        ].map(b => (
          <div key={b.label} style={{ background: 'rgba(26,31,54,0.03)', border: '1px solid rgba(26,31,54,0.08)', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
            <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(26,31,54,0.45)', fontWeight: 700, display: 'block', marginBottom: 4 }}>{b.label}</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: b.value > 0 ? b.color : 'rgba(26,31,54,0.25)' }}>{fmt(b.value)}</span>
          </div>
        ))}
      </div>

      {/* Desglose por modelo */}
      {byModelo.length > 1 && (
        <>
          <Divider title="Por modelo" />
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(byModelo.length, 5)}, 1fr)`, gap: 8, marginBottom: 24 }}>
            {byModelo.map(g => (
              <div key={g.modelo} style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 10, padding: '12px 16px' }}>
                <ModeloBadge value={g.modelo} />
                <div style={{ marginTop: 8 }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: DANGER }}>{fmt(g.total)}</span>
                  <span style={{ fontSize: 10, color: 'rgba(26,31,54,0.38)', display: 'block', marginTop: 2 }}>{g.count} facturas</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Tabla de facturas pendientes */}
      <Divider title="Facturas pendientes" color={DANGER} />
      {filtered.length > 0 ? (
        <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 14, padding: 20, marginBottom: 20 }}>
          <DataTable
            rows={filtered}
            columns={[
              { key: 'contactName', label: 'Cliente', render: v => <span style={{ fontWeight: 700 }}>{v || '—'}</span> },
              { key: 'modelo', label: 'Modelo', width: 90, render: v => v ? <ModeloBadge value={v} /> : '—' },
              { key: 'fecha', label: 'Fecha factura', width: 100 },
              { key: 'daysPending', label: 'Días', width: 60, align: 'right', render: v => (
                <span style={{ fontWeight: 700, color: v > 90 ? DANGER : v > 30 ? '#F59E0B' : 'rgba(26,31,54,0.6)' }}>{v}d</span>
              )},
              { key: 'monto', label: 'Monto', width: 100, align: 'right', render: v => (
                <span style={{ fontWeight: 700, color: DANGER }}>{fmt(v)}</span>
              )},
            ]}
          />
        </div>
      ) : (
        <div style={{ padding: 30, textAlign: 'center', color: 'rgba(26,31,54,0.35)', fontSize: 13 }}>No hay facturas pendientes de cobro.</div>
      )}

      {/* Incobrables */}
      {filteredInc.length > 0 && (
        <>
          <Divider title="Incobrables" color={DANGER} />
          <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 14, padding: 20 }}>
            <DataTable
              rows={filteredInc}
              columns={[
                { key: 'contactName', label: 'Cliente', render: v => <span style={{ fontWeight: 700 }}>{v || '—'}</span> },
                { key: 'modelo', label: 'Modelo', width: 90, render: v => v ? <ModeloBadge value={v} /> : '—' },
                { key: 'fecha', label: 'Fecha', width: 100 },
                { key: 'monto', label: 'Monto', width: 100, align: 'right', render: v => (
                  <span style={{ fontWeight: 700, color: DANGER }}>{fmt(v)}</span>
                )},
              ]}
            />
          </div>
        </>
      )}
    </>
  )
}

// ─── Egresos Tab ──────────────────────────────────────────────────────────────
const MODELO_ORDER = { todos: 0, Todos: 0, boutique: 1, Boutique: 1, agencia: 2, Agencia: 2, soft: 3, Soft: 3, financiera: 4, Financiera: 4, consultoria: 5, Consultoría: 5 }
const MODELO_COLORS = {
  Todos:       { bg: 'rgba(0,0,0,0.05)',        color: 'rgba(26,31,54,0.55)',   border: 'rgba(0,0,0,0.1)'       },
  Boutique:    { bg: 'rgba(245,158,11,0.1)',   color: '#D97706',               border: 'rgba(245,158,11,0.25)' },
  Agencia:     { bg: 'rgba(59,130,246,0.1)',   color: '#2D7AFF',               border: 'rgba(59,130,246,0.25)' },
  Soft:        { bg: 'rgba(0,0,0,0.04)',       color: 'rgba(26,31,54,0.55)',   border: 'rgba(0,0,0,0.1)'       },
  Financiera:  { bg: 'rgba(16,185,129,0.1)',   color: '#059669',               border: 'rgba(16,185,129,0.25)' },
  Consultoría: { bg: 'rgba(168,85,247,0.1)',   color: '#A855F7',               border: 'rgba(168,85,247,0.25)' },
}
function ModeloBadge({ value, size = 11 }) {
  const c = MODELO_COLORS[value] || MODELO_COLORS.Todos
  return <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: size, fontWeight: 700, background: c.bg, color: c.color, border: `1px solid ${c.border}`, whiteSpace: 'nowrap' }}>{value || '—'}</span>
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
  const [open, setOpen] = useState(false)
  const factor = share !== null ? share : 1
  const pct = share !== null ? Math.round(share * 100) : null
  const fijos = items.filter(e => e.tipoGasto?.toLowerCase().includes('fijo'))
  const vars  = items.filter(e => !e.tipoGasto?.toLowerCase().includes('fijo'))
  const totalFijos = fijos.reduce((s, e) => s + egresoMes(e) * factor, 0)
  const totalVars  = vars.reduce((s, e)  => s + egresoMes(e) * factor, 0)
  const total = totalFijos + totalVars
  return (
    <div style={{ marginBottom: 28, background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 16, padding: '18px 20px' }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: open ? 16 : 0, cursor: 'pointer', userSelect: 'none' }}>
        <span style={{ fontSize: 10, color: 'rgba(26,31,54,0.4)' }}>{open ? '▾' : '▸'}</span>
        <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 2.5, color: 'rgba(26,31,54,0.6)', fontWeight: 700 }}>Gastos Generales (ponderado)</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: DANGER }}>{fmt(total)}/mes</span>
        {pct !== null && <span style={{ fontSize: 11, color: 'rgba(26,31,54,0.38)' }}>{pct}% del MRR</span>}
      </div>
      {open && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {fijos.length > 0 && (
            <div>
              <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.72)', fontWeight: 700, marginBottom: 8 }}>Fijos — {fmt(totalFijos)}/mes</div>
              <EgresosTable rows={fijos} totalLabel="Subtotal fijos" totalColor={DANGER} factor={factor} />
            </div>
          )}
          {vars.length > 0 && (
            <div>
              <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.72)', fontWeight: 700, marginBottom: 8 }}>Variables — {fmt(totalVars)}/mes</div>
              <EgresosTable rows={vars} totalLabel="Subtotal variables" totalColor={DANGER} factor={factor} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
function EgresosTab({ egresos, modelFilter, servicios }) {
  const [openUnidad, setOpenUnidad] = useState(false)
  const mrrByUnit = useMemo(() => {
    const active = (servicios || []).filter(s => s.estado?.toLowerCase() === 'activo')
    const result = { Boutique: 0, Agencia: 0, Soft: 0, Financiera: 0, Consultoría: 0, total: 0 }
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
        <div style={{ background: 'linear-gradient(135deg, #b91c1c 0%, #E03E3E 100%)', border: '1px solid rgba(224,62,62,0.3)', boxShadow: '0 4px 16px rgba(224,62,62,0.25)', borderRadius: 12, padding: '16px 20px' }}>
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
          <div onClick={() => setOpenUnidad(o => !o)} style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: openUnidad ? 16 : 0, cursor: 'pointer', userSelect: 'none' }}>
            <span style={{ fontSize: 10, color: 'rgba(26,31,54,0.4)' }}>{openUnidad ? '▾' : '▸'}</span>
            <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 2.5, color: 'rgba(26,31,54,0.6)', fontWeight: 700 }}>Gastos de la Unidad</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: DANGER }}>{fmt(totalFijos + totalVars)}/mes</span>
          </div>
          {openUnidad && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
              {fijos.length > 0 && (
                <div>
                  <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.72)', fontWeight: 700, marginBottom: 8 }}>
                    Fijos — <span style={{ color: DANGER }}>{fmt(totalFijos)}/mes</span>
                  </div>
                  <EgresosTable rows={fijos} totalLabel="Total fijos" totalColor={DANGER} showModelo={!isUnit} />
                </div>
              )}
              {variables.length > 0 && (
                <div>
                  <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.72)', fontWeight: 700, marginBottom: 8 }}>
                    Variables — <span style={{ color: DANGER }}>{fmt(totalVars)}/mes</span>
                  </div>
                  <EgresosTable rows={variables} totalLabel="Total variables" totalColor={DANGER} showModelo={!isUnit} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {/* Ganancia proyectada */}
      {(() => {
        const mrr = isUnit ? (mrrByUnit[modelFilter] || 0) : mrrByUnit.total
        const ganancia = mrr - Math.abs(total)
        const margen = mrr > 0 ? ganancia / mrr : 0
        if (!mrr) return null
        return (
          <div style={{
            background: 'linear-gradient(135deg, #1e3fa3 0%, #2D7AFF 100%)',
            border: '1px solid rgba(45,122,255,0.3)',
            borderRadius: 16, padding: '20px 24px', marginBottom: 12,
            boxShadow: '0 4px 20px rgba(45,122,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.65)', fontWeight: 700, display: 'block', marginBottom: 6 }}>Ganancia proyectada</span>
              <span style={{ fontSize: 32, fontWeight: 900, color: '#fff', letterSpacing: -1 }}>{fmt(ganancia)}</span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', display: 'block', marginTop: 2 }}>MRR - Total egresos</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.65)', fontWeight: 700, display: 'block', marginBottom: 6 }}>Margen</span>
              <span style={{ fontSize: 40, fontWeight: 900, color: '#fff', letterSpacing: -2 }}>{(margen * 100).toFixed(1)}%</span>
            </div>
          </div>
        )
      })()}
    </>
  )
}

// ─── Proyección Ingresos Tab ─────────��────────────────────────────────────────
function ModeloIngresosCard({ modelo, rows }) {
  const [open, setOpen] = useState(false)
  const c = MODELO_COLORS[modelo] || MODELO_COLORS.Todos

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
      <div onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', cursor: 'pointer', userSelect: 'none' }}>
        <span style={{ fontSize: 10, color: 'rgba(26,31,54,0.3)' }}>{open ? '▾' : '▸'}</span>
        <ModeloBadge value={modelo} size={13} />
        <span style={{ fontSize: 16, fontWeight: 800, color: c.color }}>{fmt(total)}/mes</span>
        <span style={{ fontSize: 13, color: 'rgba(26,31,54,0.4)', fontWeight: 600 }}>{nClientes} clientes · {rows.length} servicios</span>
      </div>
      {open && (
        <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', padding: '8px 20px 16px' }}>
          {byCliente.map((cliente, i) => (
            <div key={cliente.idCliente} style={{ marginBottom: i < byCliente.length - 1 ? 12 : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(26,31,54,0.85)', flex: 1 }}>{cliente.nombre}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: GREEN, minWidth: 80, textAlign: 'right' }}>{fmt(cliente.mrr)}/mes</span>
              </div>
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

function IngresosTab({ servicios, modelFilter }) {
  const active = useMemo(() =>
    (servicios || []).filter(s =>
      s.estado?.toLowerCase() === 'activo' &&
      (modelFilter === 'todos' || s.tipo?.toLowerCase() === modelFilter.toLowerCase())
    ), [servicios, modelFilter])

  const mrr = active.reduce((s, r) => s + r.monto, 0)
  const clientes = [...new Set(active.map(s => s.idCliente))].length

  const modelos = ['Boutique', 'Agencia', 'Soft', 'Financiera', 'Consultoría']
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 24, maxWidth: 440 }}>
        <div style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', border: '1px solid rgba(5,150,105,0.3)', boxShadow: '0 4px 16px rgba(5,150,105,0.2)', borderRadius: 12, padding: '16px 20px' }}>
          <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.7)', fontWeight: 700, display: 'block', marginBottom: 6 }}>MRR Total</span>
          <span style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>{fmt(mrr)}</span>
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

// ─── Insights Block ──────────��────────────────────────────────────────────────
function InsightsBlock({ currentRow, prevRow }) {
  const [loading, setLoading] = useState(false)
  const [insights, setInsights] = useState(null)
  const [error, setError] = useState(null)

  async function generate() {
    setLoading(true); setError(null)
    try {
      const resp = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: 'finanzas', data: { current: currentRow, prev: prevRow }, period: currentRow?.monthLabel }),
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
      {!insights && !loading && <p style={{ fontSize: 13, color: 'rgba(26,31,54,0.5)', marginTop: 12 }}>Claude analiza margen vs objetivo, cobros, gastos y proyección del mes.</p>}
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

// ─── Main Module ──────────���──────────────────────────────────��────────────────
export function FinanzasModule({ erUnificado = [], er, egresos, servicios, pendingInvoices = [], incobrables = [], selectedERMonth, modelFilter = 'todos', subTab = 'pl', onSubTabChange }) {
  const setSubTab = onSubTabChange || (() => {})
  const erData = erUnificado || []
  const egresosData = egresos || []

  if (!erData.length && !egresosData.length) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(26,31,54,0.38)', fontSize: 14 }}>Sin datos del E.R. Unificado.</div>
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

      {subTab === 'pl'      && <PLTab erUnificado={erData} modelFilter={modelFilter} />}
      {subTab === 'deudas'  && <DeudasTab pendingInvoices={pendingInvoices} incobrables={incobrables} modelFilter={modelFilter} />}
      {subTab === 'proyeccion' && (
        <>
          <Divider title="Ingresos" />
          <IngresosTab servicios={servicios} modelFilter={modelFilter} />
          <Divider title="Egresos" color={DANGER} />
          <EgresosTab egresos={egresosData} modelFilter={modelFilter} servicios={servicios} />
        </>
      )}
    </>
  )
}
