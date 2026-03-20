import { useEffect } from 'react'
import { MiniChart } from './MiniChart.jsx'
import { Delta } from './KPI.jsx'
import { monthLabel } from '../lib/formatters.js'

const ACCENT = '#2D7AFF'
const DANGER = '#FF6B6B'
const GREEN = '#34D399'

export const METRIC_META = {
  revenue: {
    label: 'Ingresos nuevos clientes',
    icon: '💰',
    what: 'Suma total facturada por nuevos clientes en el mes de su primer cierre.',
    why: 'Es el output directo de tu motor de adquisición. Sin crecimiento sostenido de revenue, todo lo demás es ruido. La pendiente de esta curva es la señal más clara de si estás ganando o perdiendo tracción en el mercado.',
    benchmark: 'Buscás crecimiento mes a mes. Si cae 2 meses seguidos, revisá pipeline, calidad de leads y proceso comercial.',
    color: ACCENT,
    getData: (c) => c.revenue,
    prefix: '$',
  },
  mer: {
    label: 'MER — Marketing Efficiency Ratio',
    icon: '⚡',
    what: 'Revenue ÷ Inversión total (publicidad + equipo). Cuántos pesos generás por cada peso invertido en marketing.',
    why: 'Es la métrica maestra de eficiencia. Integra todo: creativos, targeting, proceso de ventas y precio. Si el MER baja, hay una fuga en alguna parte de ese sistema.',
    benchmark: 'MER < 2x: estás perdiendo. 2–3x: zona gris. 3–5x: saludable. > 5x: excelente — escalá sin dudarlo.',
    color: GREEN,
    getData: (c) => c.mer,
    prefix: '',
    suffix: 'x',
  },
  cac: {
    label: 'CAC — Costo de Adquisición',
    icon: '🎯',
    what: 'Inversión total ÷ clientes cerrados. Lo que te cuesta traer un cliente nuevo.',
    why: 'Determina la escalabilidad del negocio. Si el CAC sube sin que suba el AOV, el modelo se destruye. CAC < GP mensual = recuperás la inversión en menos de un mes.',
    benchmark: 'CAC saludable: < 30% del valor de vida del cliente. Si supera el Gross Profit de 3 meses, el modelo no es rentable.',
    color: DANGER,
    getData: (c) => c.cac,
    prefix: '$',
    inverse: true,
  },
  aov: {
    label: 'AOV — Ticket Promedio',
    icon: '🏷️',
    what: 'Revenue total ÷ clientes cerrados. El valor promedio de cada nuevo cliente.',
    why: 'Subir el AOV sin subir el CAC mejora automáticamente el MER, el Gross Profit y acorta el Payback. Es una de las palancas más eficientes para escalar rentabilidad.',
    benchmark: 'Si el AOV cae, revisá si estás bajando precios para cerrar o si el mix de clientes cambió. Subir el AOV un 20% tiene el mismo efecto que bajar el CAC un 20%.',
    color: ACCENT,
    getData: (c) => c.cohortAov,
    prefix: '$',
  },
  grossProfit: {
    label: '30D Gross Profit',
    icon: '📊',
    what: 'AOV × margen bruto. La ganancia bruta que genera un nuevo cliente en su primer ciclo.',
    why: 'Es el techo real de lo que podés pagar por adquirir un cliente. CAC > GP = cada nuevo cliente te cuesta dinero. GP > CAC = cada cierre es inmediatamente rentable.',
    benchmark: 'GP / CAC > 1: cada cliente es rentable desde el día 0. Apuntá a GP / CAC > 2 para tener margen de error y poder escalar con confianza.',
    color: GREEN,
    getData: (c) => c.grossProfit,
    prefix: '$',
  },
  payback: {
    label: 'Payback Period',
    icon: '⏱️',
    what: 'CAC ÷ (GP mensual) × 30. Los días que tardás en recuperar lo que invertiste para adquirir un cliente.',
    why: 'Cuanto más corto el payback, más rápido podés reinvertir y acelerar el crecimiento. Payback largo = crecimiento lento porque el capital queda atado.',
    benchmark: '< 30 días: flujo de caja positivo desde el primer mes — ideal. 30–90 días: aceptable. > 90 días: riesgo si no tenés acceso a capital de trabajo.',
    color: ACCENT,
    getData: (c) => c.payback,
    prefix: '',
    suffix: 'd',
    inverse: true,
  },
  cpl: {
    label: 'CPL — Costo por Lead',
    icon: '🔍',
    what: 'Gasto en publicidad ÷ leads generados. Lo que cuesta traer un lead al sistema.',
    why: 'Indicador de eficiencia creativa y de segmentación. Si el CPL sube sin cambios en presupuesto, los creativos se fatigaron o el mercado objetivo se saturó.',
    benchmark: 'El número absoluto depende del sector, pero lo crítico es la tendencia. CPL subiendo + tasa de conversión estable = problema de adquisición. CPL estable + conversión bajando = problema comercial.',
    color: DANGER,
    getData: (c) => c.cpl,
    prefix: '$',
    inverse: true,
  },
  leads: {
    label: 'Volumen de Leads',
    icon: '📥',
    what: 'Total de nuevos contactos que ingresaron al CRM en el mes.',
    why: 'Es el primer eslabón del pipeline. Sin volumen suficiente, no hay ventas posibles — incluso con el mejor proceso comercial. El volumen de leads es el input que mueve todo lo demás.',
    benchmark: 'Si los leads caen, el problema es de distribución (medios pagos, orgánico). Si los leads suben pero las ventas no, el problema es conversión (calidad de leads o proceso comercial).',
    color: ACCENT,
    getData: (c) => c.leadsCount,
    prefix: '',
  },
  convRate: {
    label: 'Tasa de Conversión',
    icon: '🔄',
    what: 'Clientes cerrados ÷ Leads × 100. El porcentaje de leads que terminan comprando.',
    why: 'Separa el problema de adquisición del problema comercial. Si la tasa baja, la falla está en ventas (seguimiento, propuesta, objeciones). Si la tasa sube pero el volumen baja, hay restricción de supply.',
    benchmark: 'En servicios B2B: 10–20% es saludable. < 5% indica fricción severa en el proceso. > 30% puede indicar que los leads son de muy alta calidad o que el volumen es bajo y hay sesgo de selección.',
    color: GREEN,
    getData: (c) => c.leadsCount > 0 ? Math.round((c.closuresCount / c.leadsCount) * 1000) / 10 : 0,
    prefix: '',
    suffix: '%',
  },
  cicloVentas: {
    label: 'Ciclo de Ventas',
    icon: '📅',
    what: 'Promedio de días entre el primer contacto con un lead y el cierre de la venta.',
    why: 'Ciclos cortos mejoran el flujo de caja y la velocidad de iteración. Si el ciclo crece, hay fricción en alguna etapa del proceso comercial — puede ser en la propuesta, en las objeciones o en el seguimiento.',
    benchmark: 'Idealmente < 14 días para servicios mid-market. Si supera 30 días, revisá en qué etapa del funnel se estancan los leads.',
    color: ACCENT,
    getData: (c) => c.cicloVentas,
    prefix: '',
    suffix: 'd',
    inverse: true,
  },
}

export function MetricModal({ metricKey, cohort, prevCohort, allCohorts, onClose }) {
  const meta = METRIC_META[metricKey]
  if (!meta) return null

  const current = meta.getData(cohort)
  const previous = prevCohort ? meta.getData(prevCohort) : null

  const chartData = allCohorts
    .map(c => ({ label: monthLabel(c.month).split(' ')[0], value: meta.getData(c) }))
    .filter(d => d.value > 0)

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function fmtVal(v) {
    if (!v || v === 0) return '—'
    const s = meta.prefix || ''
    const suf = meta.suffix || ''
    if (s === '$') return `$${Math.round(v).toLocaleString('en-US')}${suf}`
    return `${s}${v % 1 === 0 ? v : v.toFixed(1)}${suf}`
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#141B2D',
          border: '1px solid rgba(45,122,255,0.2)',
          borderRadius: 20,
          padding: 32,
          maxWidth: 560,
          width: '100%',
          boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(45,122,255,0.1)',
          position: 'relative',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8, width: 32, height: 32, cursor: 'pointer',
            color: 'rgba(255,255,255,0.5)', fontSize: 16, display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontFamily: 'Montserrat',
          }}
        >×</button>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 20 }}>{meta.icon}</span>
            <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.45)', fontWeight: 700 }}>{meta.label}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontSize: 40, fontWeight: 700, color: meta.color, letterSpacing: -1 }}>{fmtVal(current)}</span>
            {previous !== null && previous > 0 && (
              <Delta current={current} previous={previous} inverse={meta.inverse} />
            )}
          </div>
        </div>

        {/* Chart */}
        {chartData.length > 1 && (
          <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: '16px 16px 8px', marginBottom: 24 }}>
            <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.3)', fontWeight: 700, display: 'block', marginBottom: 4 }}>Evolución</span>
            <MiniChart data={chartData} dataKey="value" color={meta.color} prefix={meta.prefix || ''} height={140} />
          </div>
        )}

        {/* Meta info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.3)', fontWeight: 700, display: 'block', marginBottom: 5 }}>Qué es</span>
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, fontWeight: 500 }}>{meta.what}</p>
          </div>
          <div>
            <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.3)', fontWeight: 700, display: 'block', marginBottom: 5 }}>Por qué importa</span>
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, fontWeight: 500 }}>{meta.why}</p>
          </div>
          <div style={{ background: 'rgba(45,122,255,0.06)', border: '1px solid rgba(45,122,255,0.15)', borderRadius: 10, padding: '12px 14px' }}>
            <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: ACCENT, fontWeight: 700, display: 'block', marginBottom: 5 }}>Benchmark / Cómo leerlo</span>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, fontWeight: 500 }}>{meta.benchmark}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
