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
      tipo: r[2] || '',        // C: Boutique | Agencia | Soft | Financiera | Consultoria
      estado: r[3] || '',      // D: Activo | Inactivo
      inicio: excelToISO(r[4]),
      fechaBaja: excelToISO(r[5]),
      meses: +r[6] || 0,
      area: r[7] || '',        // H: Área
      servicio: r[8] || '',    // I: Servicio
      monto: +r[10] || 0,     // K: Monto $
      ltr: +r[13] || 0,       // N: LTR
      pm: String(r[15] || ''),  // P: PM (BMR, JB, etc.)
      metodoPago: r[16] || '', // Q: Pago
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
      pm: String(r[10] || ''),  // K: PM (BMR, etc.)
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
      pctMensual: +r[4] || 0,        // %+- vs mes anterior
      pctAnual: +r[5] || 0,          // %+- vs mismo mes año anterior
      proyectada: +r[6] || 0,
      acierto: r[7] || '',
      cashCollected: +r[8] || 0,
      cobrosMes: +r[11] || 0,        // cobros del mes corriente
      pctCobradosMes: +r[12] || 0,   // % cobrado del mes
      deudasCobradas: +r[13] || 0,
      deudasAFavor: +r[14] || 0,
      deudasNueva: +r[15] || 0,      // corriente (< 1 mes)
      deudasHistorica: +r[16] || 0,  // morosa (> 1 mes)
      deudasIncobrable: +r[17] || 0, // incobrable
      pctDeudaRec: +r[18] || 0,      // % deuda recuperada
      gastos: +r[19] || 0,
      ganancia: +r[22] || 0,
      margenNeto: +r[23] || 0,
      delMes: +r[26] || 0,           // ganancia solo del período (sin deudas cobradas)
    }))
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
}

// ─── Xero Raw Data — Facturas pendientes ─────────────────────────────────────
// Raw Data columns (from EstadoResultados.gs):
//   A(0):Fecha  C(2):Modelo  D(3):Tipo  E(4):Account Code
//   G(6):Contact Name  K(10):Monto USD  N(13):Status  O(14):Fecha Pago

export function parsePendingInvoices(raw = []) {
  return raw
    .filter(r => {
      if (!r[0]) return false
      const acCode = String(r[4] || '')
      const tipo = String(r[3] || '')
      const monto = +r[10] || 0
      const fechaPago = r[14]
      // Revenue items (account code starts with 2), positive amount, no payment date, not TRANSFER
      return acCode.charAt(0) === '2' && monto > 0 && !fechaPago && tipo !== 'TRANSFER'
    })
    .map(r => {
      const fecha = r[0]
      // Calculate days pending
      let daysPending = 0
      if (fecha) {
        const fechaDate = typeof fecha === 'number'
          ? new Date((fecha - 25569) * 86400 * 1000) // Excel serial
          : new Date(fecha)
        daysPending = Math.floor((Date.now() - fechaDate.getTime()) / (1000 * 60 * 60 * 24))
      }
      return {
        fecha: typeof fecha === 'number' ? new Date((fecha - 25569) * 86400 * 1000).toISOString().slice(0, 10) : String(fecha).slice(0, 10),
        modelo: normalizeModelo(String(r[2] || '')),
        tipo: String(r[3] || ''),
        contactName: String(r[6] || ''),
        monto: +r[10] || 0,
        status: String(r[13] || ''),
        daysPending,
      }
    })
    .sort((a, b) => b.daysPending - a.daysPending) // más viejas primero
}

export function parseIncobrables(raw = []) {
  return raw
    .filter(r => {
      if (!r[0]) return false
      const acCode = String(r[4] || '')
      return acCode === '114' // Account Code 114 = Incobrable
    })
    .map(r => {
      const fecha = r[0]
      return {
        fecha: typeof fecha === 'number' ? new Date((fecha - 25569) * 86400 * 1000).toISOString().slice(0, 10) : String(fecha).slice(0, 10),
        modelo: normalizeModelo(String(r[2] || '')),
        contactName: String(r[6] || ''),
        monto: +r[10] || 0,
      }
    })
}

function normalizeModelo(m) {
  if (m === 'Consultoria') return 'Consultoría'
  return m
}

// ─── Benchmark de ritmo de cobro ─────────────────────────────────────────────

// Libro Diario columns: A(0):FechaPago B(1):Modelo C(2):Tipo D(3):Code
//   E(4):AccountName F(5):ContactName G(6):Descripción H(7):MontoUSD I(8):MedioPago J(9):Area

export function computeCollectionPace(libroDiario, currentRow, prevRow) {
  if (!libroDiario?.length || !currentRow) return null
  const now = new Date()
  const dayOfMonth = now.getDate()
  const curYear = currentRow.year
  const curMonth = currentRow.month
  const prevYear = prevRow?.year
  const prevMonth = prevRow?.month

  function parseDate(val) {
    if (!val) return null
    if (typeof val === 'number') return new Date((val - 25569) * 86400 * 1000)
    return new Date(val)
  }

  // Filter: revenue items (code starts with 2, monto > 0)
  const revenueItems = libroDiario.filter(r => {
    const code = String(r[3] || '')
    const monto = +r[7] || 0
    return code.charAt(0) === '2' && monto > 0
  })

  function sumUpToDay(year, month, maxDay) {
    let total = 0
    for (const r of revenueItems) {
      const payDate = parseDate(r[0]) // A: Fecha Pago
      if (!payDate) continue
      if (payDate.getFullYear() === year && (payDate.getMonth() + 1) === month && payDate.getDate() <= maxDay) {
        total += +r[7] || 0 // H: Monto USD
      }
    }
    return total
  }

  const curCollected = sumUpToDay(curYear, curMonth, dayOfMonth)

  let prevCollected = 0
  if (prevRow && prevYear && prevMonth) {
    prevCollected = sumUpToDay(prevYear, prevMonth, dayOfMonth)
  }

  return { current: curCollected, prev: prevCollected, dayOfMonth, delta: curCollected - prevCollected }
}

// ─── E.R. Unificado (Xero) ───────────────────────────────────────────────────
// Columns: A(0):Año B(1):Mes C(2):Modelo D(3):Revenue E(4):Cash Collected
//   F(5):Cobros del mes G(6):Cobros de deuda H(7):Deuda nueva I(8):Deuda histórica
//   J(9):Incobrable K(10):%Efic.Cobro L(11):Gastos Op M(12):Comisiones Stripe
//   N(13):Gastos Admin O(14):Total Gastos P(15):Ganancia Bruta Q(16):%Margen Bruto
//   R(17):Ganancia Neta S(18):%Margen Neto

export function parseERUnificado(raw = []) {
  return raw
    .filter(r => r[0] && r[1] && r[2]) // skip empty/separator rows
    .map(r => {
      const year = +r[0]
      const mesRaw = r[1]
      const month = toMonthNum(mesRaw)
      const modelo = normalizeModelo(String(r[2] || ''))
      const isAcumulado = String(mesRaw).toLowerCase() === 'acumulado'
      const mk = isAcumulado ? `${year}-acum` : monthKey(year, mesRaw)
      const MESES_LABEL = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
      const label = isAcumulado ? `Acum ${year}` : `${MESES_LABEL[month - 1] || mesRaw} ${year}`
      return {
        year,
        month: isAcumulado ? 0 : month,
        monthKey: mk,
        monthLabel: label,
        modelo,
        isTotal: modelo === 'TOTAL' || modelo === 'TOTAL ANUAL',
        isAcumulado,
        revenue: +r[3] || 0,
        cashCollected: +r[4] || 0,
        cobrosATiempo: +r[5] || 0,
        cobrosDeuda: +r[6] || 0,
        deudaNueva: +r[7] || 0,
        deudaHistorica: +r[8] || 0,
        incobrable: +r[9] || 0,
        pctEficCobro: +r[10] || 0,
        gastosOp: +r[11] || 0,
        comisionesStripe: +r[12] || 0,
        gastosAdmin: +r[13] || 0,
        totalGastos: +r[14] || 0,
        gananciaBruta: +r[15] || 0,
        pctMargenBruto: +r[16] || 0,
        gananciaNeta: +r[17] || 0,
        pctMargenNeto: +r[18] || 0,
        margenMes: +r[19] || 0,
      }
    })
    .sort((a, b) => {
      if (a.isAcumulado !== b.isAcumulado) return a.isAcumulado ? 1 : -1
      return a.monthKey.localeCompare(b.monthKey)
    })
}

// Filas TOTAL mensuales para Overview (compatible con el shape viejo de er)
export function erUnificadoToOverview(rows) {
  return rows
    .filter(r => r.isTotal && !r.isAcumulado)
    .map(r => ({
      year: r.year,
      month: r.month,
      monthKey: r.monthKey,
      monthLabel: r.monthLabel,
      revenue: r.revenue,
      cashCollected: r.cashCollected,
      ganancia: r.gananciaNeta,
      margenNeto: r.pctMargenNeto,
      gastos: r.totalGastos,
      // Campos de deuda (simplificados)
      deudasCobradas: r.cobrosDeuda,
      cobrosMes: r.cobrosATiempo,
      pctCobradosMes: r.pctEficCobro,
      deudasNueva: r.deudaNueva,
      deudasIncobrable: r.incobrable,
    }))
}

export function parseHistorico(raw = []) {
  return raw
    .filter(r => r[0] && typeof r[0] === 'number')
    .map(r => ({
      year: +r[0],
      month: toMonthNum(r[1]),
      monthKey: monthKey(r[0], r[1]),
      monthLabel: String(r[1]),
      modelo: String(r[3] || ''),
      area: String(r[4] || ''),
      clientesActivos: +r[5] || 0,  // F
      // G (6): Aux M.C — omitido
      cNuevos: +r[7] || 0,          // H
      upsells: +r[8] || 0,          // I
      mNuevos: +r[9] || 0,          // J — $ nuevos
      mUpsells: +r[10] || 0,        // K — $ upsells
      cPerdidos: +r[11] || 0,       // L
      downsells: +r[12] || 0,       // M
      mDownsells: +r[13] || 0,      // N — $ downsells
      mPerdidos: +r[14] || 0,       // O — $ perdidos
      pctChurnTri: +r[15] || 0,     // P
      pctChurnA: +r[16] || 0,       // Q — % Churn Anual
      pctMRRNeto: +r[17] || 0,      // R — % MRR Neto
      nrr: +r[18] || 0,             // S — (era r[17], corregido)
      lifeRetention: +r[19] || 0,   // T
      lifeSpan: +r[20] || 0,        // U
      aov: +r[21] || 0,             // V
      ltgp: +r[22] || 0,            // W
      ltgpActual: +r[23] || 0,      // X
      mrr: +r[24] || 0,             // Y
      cashCollected: +r[25] || 0,   // Z
      comisiones: +r[28] || 0,
      extraccion: +r[29] || 0,
      margenTransaccion: +r[30] || 0,
      gastosDirectos: +r[32] || 0,
      gastosIndirectos: +r[33] || 0,
      gananciaBruta: +r[34] || 0,
      pctBruto: +r[35] || 0,
      gastosAdm: +r[36] || 0,
      totalGastosAdm: +r[37] || 0,
      margenNeto: +r[39] || 0,
      pctNeto: +r[40] || 0,
    }))
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey) || a.modelo.localeCompare(b.modelo))
}

// Agrega filas de Histórico por monthKey y modelFilter (suma numéricos, recalcula %)
export function aggregateHistorico(historico, targetMonthKey, modelFilter) {
  let rows = historico.filter(r => r.monthKey === targetMonthKey)
  if (modelFilter && modelFilter !== 'todos') {
    rows = rows.filter(r => r.modelo.toLowerCase() === modelFilter.toLowerCase())
  }
  if (!rows.length) return null
  const s = (f) => rows.reduce((acc, r) => acc + (r[f] || 0), 0)
  const cashCollected = s('cashCollected')
  const gananciaBruta = s('gananciaBruta')
  const margenNeto = s('margenNeto')
  const avg = (f) => rows.length ? rows.reduce((a, r) => a + (r[f] || 0), 0) / rows.length : 0
  return {
    clientesActivos: s('clientesActivos'),
    cNuevos: s('cNuevos'),
    upsells: s('upsells'),
    mNuevos: s('mNuevos'),
    mUpsells: s('mUpsells'),
    cPerdidos: s('cPerdidos'),
    downsells: s('downsells'),
    mDownsells: s('mDownsells'),
    mPerdidos: s('mPerdidos'),
    cashCollected,
    comisiones: s('comisiones'),
    extraccion: s('extraccion'),
    margenTransaccion: s('margenTransaccion'),
    gastosDirectos: s('gastosDirectos'),
    gastosIndirectos: s('gastosIndirectos'),
    gananciaBruta,
    pctBruto: cashCollected ? gananciaBruta / cashCollected : 0,
    gastosAdm: s('gastosAdm'),
    totalGastosAdm: s('totalGastosAdm'),
    margenNeto,
    pctNeto: cashCollected ? margenNeto / cashCollected : 0,
    mrr: s('mrr'),
    nrr: avg('nrr'),
    pctChurnTri: avg('pctChurnTri'),
    pctChurnA: avg('pctChurnA'),
    pctMRRNeto: avg('pctMRRNeto'),
    lifeRetention: avg('lifeRetention'),
    lifeSpan: avg('lifeSpan'),
    aov: avg('aov'),
    ltgp: avg('ltgp'),
    ltgpActual: avg('ltgpActual'),
  }
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
