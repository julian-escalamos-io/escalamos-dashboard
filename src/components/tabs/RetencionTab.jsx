const ACCENT = '#2D7AFF'

const COMING = [
  { icon: '🔄', label: 'Tasa de recompra', desc: 'Porcentaje de clientes que vuelven a comprar en los siguientes 90 días.' },
  { icon: '📈', label: 'LTV por cohorte', desc: 'Valor de vida acumulado por cada cohorte mensual a 3, 6 y 12 meses.' },
  { icon: '📉', label: 'Churn rate', desc: 'Porcentaje de clientes que no renuevan o no vuelven a interactuar.' },
  { icon: '💵', label: 'Revenue recurrente vs nuevo', desc: 'Split entre ingresos de clientes existentes y nuevas adquisiciones.' },
]

export function RetencionTab() {
  return (
    <div style={{ maxWidth: 640, margin: '60px auto', textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.2 }}>🔒</div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.7)', margin: '0 0 8px' }}>Retención — Próximamente</h2>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', fontWeight: 500, lineHeight: 1.6, marginBottom: 40 }}>
        Esta sección estará disponible cuando tengamos datos de recompra y LTV en el sistema.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {COMING.map(({ icon, label, desc }) => (
          <div key={label} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '14px 18px', textAlign: 'left' }}>
            <span style={{ fontSize: 20, flexShrink: 0, opacity: 0.5 }}>{icon}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', lineHeight: 1.5, fontWeight: 500 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
