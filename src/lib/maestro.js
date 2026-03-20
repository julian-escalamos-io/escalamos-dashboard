// ─── Column indices ───────────────────────────────────────────────────────────
// SERVICIOS: ID Cliente(0) Cliente(1) Estado(2) Inicio(3) Aux:Baja(4) Aux:Meses(5)
//   Aux:Meses2(6) Tipo(7) Aux:OrdenT(8) Área(9) Servicio(10) Aux:ServC(11)
//   Monto$(12) Aux:TotalC(13) LTR(14) Aux:$/moPago(15)
// EGRESOS: TipoGasto(0) Recurrencia(1) Proveedor(2) Servicio(3) Modelo(4) Área(5)
//   Monto$(6) Monto/mo$(7)
// E.R: Año(0) Mes(1) Aux:Orden(2) Revenue(3) %+-mensual(4) %+-anual(5)
//   Proyectada(6) AciertoProy(7) CashCollected(8) %mensual(9) %anual(10)
//   CobrosMes(11) %CobradosMes(12) DeudasCobradas(13) DeudasAFavor(14)
//   Nueva(15) Histórica(16) Incobrable(17) %DeudaRec(18) Gastos(19)
//   PagosMes(20) DeudasPagadas(21) Ganancia(22) MargenNeto(23)
//   RatioMensual(24) RatioAnual(25) DelMes(26)

const MESES_ES = {
  Enero: 1, Febrero: 2, Marzo: 3, Abril: 4, Mayo: 5, Junio: 6,
  Julio: 7, Agosto: 8, Septiembre: 9, Octubre: 10, Noviembre: 11, Diciembre: 12,
  // Abreviaciones (ej: "ene 24", "feb 24" del sheet E.R)
  ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6,
  jul: 7, ago: 8, sep: 9, sept: 9, oct: 10, nov: 11, dic: 12,
}

function toMonthNum(m) {
  if (typeof m === 'number') return m
  const n = parseInt(m)
  if (!isNaN(n)) return n
  // handle "ene 24", "feb 24", etc. — take first word only
  const word = String(m).trim().split(/\s+/)[0]
  return MESES_ES[word] || MESES_ES[m] || 0
}

function excelToISO(serial) {
  if (!serial) return null
  if (typeof serial === 'string') return serial.slice(0, 10)
  const ms = (serial - 25569) * 86400 * 1000 // Excel serial to Unix ms
  return new Date(ms).toISOString().slice(0, 10)
}

function monthKey(year, month) {
  const m = toMonthNum(month)
  return `${year}-${String(m).padStart(2, '0')}`
}

// ─── Parsers ──────────────────────────────────────────────────────────────────

export function parseServicios(raw = []) {
  return raw
    .filter(r => r[0]) // skip empty rows
    .map(r => ({
      idCliente: r[0],
      nombre: r[1] || '',
      estado: r[2] || '',
      inicio: excelToISO(r[3]),
      fechaBaja: excelToISO(r[4]),
      meses: +r[5] || 0,
      tipo: r[7] || '',        // Boutique | Agencia | Soft | Financiera
      area: r[9] || '',
      servicio: r[10] || '',
      monto: +r[12] || 0,
      ltr: +r[14] || 0,
      metodoPago: r[15] || '',
    }))
}

export function parseEgresos(raw = []) {
  return raw
    .filter(r => r[0])
    .map(r => ({
      tipoGasto: r[0] || '',
      recurrencia: r[1] || '',
      proveedor: r[2] || '',
      servicio: r[3] || '',
      modelo: r[4] || '',
      area: r[5] || '',
      monto: +r[6] || 0,
      montoPorMes: +r[7] || 0,
    }))
}

export function parseER(raw = []) {
  return raw
    .filter(r => r[0] && r[1])
    .map(r => ({
      year: +r[0],
      month: toMonthNum(r[1]),
      monthKey: monthKey(r[0], r[1]),
      monthLabel: `${r[1]} ${r[0]}`,
      revenue: +r[3] || 0,
      proyectada: +r[6] || 0,
      acierto: r[7] || '',
      cashCollected: +r[8] || 0,
      deudasCobradas: +r[13] || 0,
      deudasAFavor: +r[14] || 0,
      gastos: +r[19] || 0,
      ganancia: +r[22] || 0,
      margenNeto: +r[23] || 0, // decimal (0.35 = 35%)
      delMes: +r[26] || 0,
    }))
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
}

// ─── Overview KPIs ────────────────────────────────────────────────────────────

export function computeOverviewKPIs(servicios, modelFilter) {
  const f = servicios.filter(s =>
    s.estado.toLowerCase() === 'activo' &&
    (modelFilter === 'todos' || s.tipo.toLowerCase() === modelFilter.toLowerCase())
  )

  const clientIds = [...new Set(f.map(s => s.idCliente))]
  const mrr = f.reduce((sum, s) => sum + s.monto, 0)
  const clientesActivos = clientIds.length
  const aov = clientesActivos > 0 ? mrr / clientesActivos : 0
  const ltrs = f.map(s => s.ltr).filter(v => v > 0)
  const ltvPromedio = ltrs.length > 0 ? ltrs.reduce((a, b) => a + b, 0) / ltrs.length : 0
  const mesesArr = f.map(s => s.meses).filter(v => v > 0)
  const permanencia = mesesArr.length > 0 ? mesesArr.reduce((a, b) => a + b, 0) / mesesArr.length : 0
  const serviciosActivos = f.length

  return { mrr, clientesActivos, aov, ltvPromedio, permanencia, serviciosActivos }
}

// Churn: distinct clients with fechaBaja in the given YYYY-MM period
export function computeChurn(servicios, periodKey, modelFilter) {
  const churned = servicios.filter(s =>
    s.fechaBaja &&
    s.fechaBaja.slice(0, 7) === periodKey &&
    (modelFilter === 'todos' || s.tipo.toLowerCase() === modelFilter.toLowerCase())
  )
  return [...new Set(churned.map(s => s.idCliente))].length
}

// ─── Desglose por modelo ──────────────────────────────────────────────────────

export function computeModelBreakdown(servicios) {
  const models = ['Boutique', 'Agencia', 'Soft', 'Financiera']
  return models.map(model => {
    const f = servicios.filter(s =>
      s.estado.toLowerCase() === 'activo' &&
      s.tipo === model
    )
    const clientIds = [...new Set(f.map(s => s.idCliente))]
    const mrr = f.reduce((sum, s) => sum + s.monto, 0)
    const clientesActivos = clientIds.length
    const aov = clientesActivos > 0 ? mrr / clientesActivos : 0
    const ltrs = f.map(s => s.ltr).filter(v => v > 0)
    const ltvPromedio = ltrs.length > 0 ? ltrs.reduce((a, b) => a + b, 0) / ltrs.length : 0
    return { model, clientesActivos, mrr, aov, ltvPromedio }
  })
}

// ─── Fulfillment ──────────────────────────────────────────────────────────────

// Group servicios by client
export function computeClientTable(servicios, modelFilter) {
  const active = servicios.filter(s =>
    s.estado.toLowerCase() === 'activo' &&
    (modelFilter === 'todos' || s.tipo.toLowerCase() === modelFilter.toLowerCase())
  )

  const byClient = {}
  for (const s of active) {
    if (!byClient[s.idCliente]) {
      byClient[s.idCliente] = {
        idCliente: s.idCliente,
        nombre: s.nombre,
        tipo: s.tipo,
        servicios: [],
        mrr: 0,
        meses: s.meses,
        ltr: s.ltr,
        metodoPago: s.metodoPago,
      }
    }
    byClient[s.idCliente].servicios.push(s.servicio)
    byClient[s.idCliente].mrr += s.monto
  }

  return Object.values(byClient)
    .map(c => ({ ...c, serviciosCount: c.servicios.length }))
    .sort((a, b) => b.mrr - a.mrr)
}

// Churned clients in last 3 months
export function computeRecentChurn(servicios, modelFilter) {
  const now = new Date()
  const cutoff = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().slice(0, 7)

  return servicios
    .filter(s =>
      s.fechaBaja &&
      s.fechaBaja.slice(0, 7) >= cutoff &&
      (modelFilter === 'todos' || s.tipo.toLowerCase() === modelFilter.toLowerCase())
    )
    .reduce((acc, s) => {
      const existing = acc.find(r => r.idCliente === s.idCliente)
      if (!existing) acc.push({
        idCliente: s.idCliente,
        nombre: s.nombre,
        tipo: s.tipo,
        fechaBaja: s.fechaBaja,
        meses: s.meses,
        ltr: s.ltr,
      })
      return acc
    }, [])
    .sort((a, b) => b.fechaBaja.localeCompare(a.fechaBaja))
}

// LTV by model
export function computeLTVByModel(servicios) {
  const models = ['Boutique', 'Agencia', 'Soft', 'Financiera']
  return models.map(model => {
    const f = servicios.filter(s => s.tipo === model && s.ltr > 0)
    const ltvPromedio = f.length > 0 ? f.reduce((s, x) => s + x.ltr, 0) / f.length : 0
    return { model, ltvPromedio, count: f.length }
  })
}

// Top 10 by LTV (across all active clients, one row per client)
export function computeTopLTV(servicios, modelFilter) {
  const byClient = {}
  for (const s of servicios) {
    if (modelFilter !== 'todos' && s.tipo.toLowerCase() !== modelFilter.toLowerCase()) continue
    if (!byClient[s.idCliente] || s.ltr > byClient[s.idCliente].ltr) {
      byClient[s.idCliente] = { idCliente: s.idCliente, nombre: s.nombre, tipo: s.tipo, ltr: s.ltr, meses: s.meses }
    }
  }
  return Object.values(byClient)
    .filter(c => c.ltr > 0)
    .sort((a, b) => b.ltr - a.ltr)
    .slice(0, 10)
}

// ─── Egresos breakdown ────────────────────────────────────────────────────────

export function computeEgresosBreakdown(egresos) {
  const byArea = {}
  for (const e of egresos) {
    const area = e.area || 'Sin área'
    if (!byArea[area]) byArea[area] = 0
    byArea[area] += e.montoPorMes > 0 ? e.montoPorMes : e.monto
  }
  return Object.entries(byArea)
    .map(([area, total]) => ({ area, total }))
    .sort((a, b) => b.total - a.total)
}
