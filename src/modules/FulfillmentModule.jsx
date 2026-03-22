import { useMemo } from 'react'
import { KPI } from '../components/KPI.jsx'
import { DataTable } from '../components/DataTable.jsx'
import { MiniChart } from '../components/MiniChart.jsx'
import {
  computeOverviewKPIs, computeClientTable, computeRecentChurn,
  computeLTVByModel, computeTopLTV,
} from '../lib/maestro.js'

const ACCENT = '#2D7AFF'
const DANGER = '#E03E3E'
const GREEN = '#059669'

function fmt(v) { return v > 0 ? `$${Math.round(v).toLocaleString('en-US')}` : '—' }

const Divider = ({ title }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '28px 0 16px' }}>
    <div style={{ width: 3, height: 14, background: ACCENT, borderRadius: 2 }} />
    <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2.5, color: 'rgba(26,31,54,0.5)', fontWeight: 700 }}>{title}</span>
    <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.08)' }} />
  </div>
)

const ModelBadge = ({ tipo }) => {
  const colors = { Boutique: '#A78BFA', Agencia: '#2D7AFF', Soft: '#34D399', Financiera: '#FBBF24' }
  const color = colors[tipo] || 'rgba(255,255,255,0.3)'
  return (
    <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, background: `${color}18`, color, fontWeight: 700 }}>{tipo || '—'}</span>
  )
}

export function FulfillmentModule({ servicios, modelFilter }) {
  const serviciosData = servicios || []

  const kpis = useMemo(() => computeOverviewKPIs(serviciosData, modelFilter), [serviciosData, modelFilter])
  const clients = useMemo(() => computeClientTable(serviciosData, modelFilter), [serviciosData, modelFilter])
  const churned = useMemo(() => computeRecentChurn(serviciosData, modelFilter), [serviciosData, modelFilter])
  const ltvByModel = useMemo(() => computeLTVByModel(serviciosData), [serviciosData])
  const topLTV = useMemo(() => computeTopLTV(serviciosData, modelFilter), [serviciosData, modelFilter])

  if (!serviciosData.length) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(26,31,54,0.38)', fontSize: 14 }}>Sin datos del Registro Maestro.</div>
  }

  return (
    <>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 10, maxWidth: 860 }}>
        <KPI label="Clientes activos" value={kpis.clientesActivos || '—'} ring accent={ACCENT} />
        <KPI label="Servicios activos" value={kpis.serviciosActivos || '—'} ring />
        <KPI label="Servicios / cliente" value={kpis.clientesActivos > 0 ? (kpis.serviciosActivos / kpis.clientesActivos).toFixed(1) : '—'} />
        <KPI label="Permanencia promedio" value={kpis.permanencia > 0 ? `${kpis.permanencia.toFixed(1)} meses` : '—'} />
      </div>

      {/* Clients table */}
      <Divider title={`Clientes activos${modelFilter !== 'todos' ? ` — ${modelFilter}` : ''}`} />
      <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 14, padding: 20, marginBottom: 10 }}>
        <DataTable
          rows={clients}
          columns={[
            { key: 'nombre', label: 'Cliente' },
            { key: 'tipo', label: 'Modelo', render: (v) => <ModelBadge tipo={v} /> },
            { key: 'servicios', label: 'Servicios', render: (v) => (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 280 }}>
                {(v || []).slice(0, 4).map((s, i) => (
                  <span key={i} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'rgba(0,0,0,0.05)', color: 'rgba(26,31,54,0.6)', fontWeight: 600 }}>{s}</span>
                ))}
                {v && v.length > 4 && <span style={{ fontSize: 10, color: 'rgba(26,31,54,0.38)', fontWeight: 600 }}>+{v.length - 4}</span>}
              </div>
            )},
            { key: 'mrr', label: 'MRR', align: 'right', render: v => <span style={{ color: ACCENT, fontWeight: 700 }}>{fmt(v)}</span> },
            { key: 'meses', label: 'Meses', align: 'right', render: v => v > 0 ? `${v}m` : '—' },
            { key: 'ltr', label: 'LTR', align: 'right', render: v => fmt(v) },
            { key: 'metodoPago', label: 'Método' },
          ]}
          emptyText="Sin clientes activos"
        />
      </div>

      {/* Churn reciente */}
      <Divider title="Churn reciente (últimos 3 meses)" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 10 }}>
        <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 14, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: churned.length > 3 ? DANGER : 'rgba(26,31,54,0.75)' }}>{churned.length}</span>
            <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(26,31,54,0.38)', fontWeight: 700 }}>bajas recientes</span>
          </div>
          <DataTable
            rows={churned}
            columns={[
              { key: 'nombre', label: 'Cliente' },
              { key: 'tipo', label: 'Modelo', render: v => <ModelBadge tipo={v} /> },
              { key: 'meses', label: 'Duración', align: 'right', render: v => v > 0 ? `${v}m` : '—' },
              { key: 'ltr', label: 'LTR', align: 'right', render: v => fmt(v) },
              { key: 'fechaBaja', label: 'Baja', render: v => v?.slice(0, 7) || '—' },
            ]}
            emptyText="Sin bajas recientes"
          />
        </div>

        {/* LTV por modelo */}
        <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 14, padding: 20 }}>
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.5)', fontWeight: 700, marginBottom: 16, display: 'block' }}>LTV por modelo</span>
          <DataTable
            rows={ltvByModel.filter(m => m.count > 0)}
            columns={[
              { key: 'model', label: 'Modelo', render: v => <ModelBadge tipo={v} /> },
              { key: 'count', label: 'Clientes', align: 'right' },
              { key: 'ltvPromedio', label: 'LTV promedio', align: 'right', render: v => fmt(v) },
            ]}
            emptyText="Sin datos"
          />
        </div>
      </div>

      {/* Top 10 LTV */}
      <Divider title="Top 10 por LTV" />
      <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 14, padding: 20, maxWidth: 600, marginBottom: 10 }}>
        <DataTable
          rows={topLTV}
          columns={[
            { key: 'nombre', label: 'Cliente' },
            { key: 'tipo', label: 'Modelo', render: v => <ModelBadge tipo={v} /> },
            { key: 'meses', label: 'Meses', align: 'right', render: v => v > 0 ? `${v}m` : '—' },
            { key: 'ltr', label: 'LTR', align: 'right', render: v => <span style={{ color: ACCENT, fontWeight: 700 }}>{fmt(v)}</span> },
          ]}
          emptyText="Sin datos"
        />
      </div>
    </>
  )
}
