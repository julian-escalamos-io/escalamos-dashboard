import { normalizeDate } from './dates.js'

const ACTIVE_STAGES = new Set([
  'Lead nuevo', 'Leads Entrantes', 'Leads | Form', 'Leads Instagram | Cold Message',
  '💬 Pendiente Conversación', '🤑 En Conversación',
  '🚀 Cliente potencial', '📔 Reunión agendada',
  '❓Negociando', '💵Auditando/Presupuestando', '👓 Envio Loom',
  '﹪ Descuento', '🤔 Confirmados | Marzo', '🤔 Confirmados | Abril',
])

export const FUNNEL_LABELS = [
  ['Lead nuevo', new Set(['Lead nuevo', 'Leads Entrantes', 'Leads | Form', 'Leads Instagram | Cold Message'])],
  ['En conversación', new Set(['💬 Pendiente Conversación', '🤑 En Conversación'])],
  ['Cliente potencial', new Set(['🚀 Cliente potencial', '📔 Reunión agendada'])],
  ['Negociando', new Set(['❓Negociando', '💵Auditando/Presupuestando', '👓 Envio Loom', '﹪ Descuento', '🤔 Confirmados | Marzo', '🤔 Confirmados | Abril'])],
  ['Ganado', new Set(['😁 Ganado', '✅ Pago Confirmado | Ganado', '💻 Plan De Trabajo | Pendiente Testimonio', '⭐️ Cliente Fidelizado | Testimonio Exitoso', '❌ No Supero | Mes De Descubrimiento', '🔍 Mes Descubrimiento'])],
]
export const FUNNEL_ORDER = FUNNEL_LABELS.map(([l]) => l)

export function sf(val, def = 0) {
  if (val === null || val === undefined || val === '' || val === 'N/D') return def
  const n = parseFloat(String(val).replace(',', '').replace('$', ''))
  return isNaN(n) ? def : n
}

export function buildCohorts(leadsRows, ventasRows, costosRows, dateRange) {
  const { start, end } = dateRange
  const startMonth = start.toISOString().slice(0, 7)
  const endMonth = end.toISOString().slice(0, 7)
  const cohorts = []

  for (const row of costosRows) {
    if (!row || !row[0]) continue
    const mStr = normalizeDate(row[0]).slice(0, 7)
    if (!mStr || mStr.length < 7) continue
    if (mStr < startMonth || mStr > endMonth) continue

    const gastoAds = sf(row[1])
    const gastoEquipo = sf(row[2])
    const gasto = gastoAds + gastoEquipo
    const margenBruto = sf(row[3])

    const cohortLeads = leadsRows.filter(r => r && normalizeDate(r[0]).slice(0, 7) === mStr)
    const leadsCount = cohortLeads.length
    const activeCount = cohortLeads.filter(
      r => r.length >= 8 && ACTIVE_STAGES.has(String(r[7]).trim())
    ).length

    const cohortVentas = ventasRows.filter(
      r => r && r.length > 3 && normalizeDate(r[0]).slice(0, 7) === mStr
    )
    const closuresCount = cohortVentas.length
    const revenue = Math.round(cohortVentas.reduce((s, r) => s + sf(r[3]), 0) * 100) / 100

    const cohortAov = closuresCount > 0 ? revenue / closuresCount : 0
    const cpl = leadsCount > 0 && gastoAds > 0 ? gastoAds / leadsCount : 0
    const mer = gasto > 0 && revenue > 0 ? revenue / gasto : 0
    const cac = closuresCount > 0 && gasto > 0 ? gasto / closuresCount : 0
    const grossProfit = margenBruto > 0 && cohortAov > 0 ? cohortAov * margenBruto : 0
    const payback = grossProfit > 0 && cac > 0 ? (cac / grossProfit) * 30 : 0

    if (gasto === 0 && leadsCount === 0) continue

    // Build funnel (cumulative — lead in advanced stage counts in all previous)
    const funnelCount = {}
    FUNNEL_ORDER.forEach(l => (funnelCount[l] = 0))
    for (const lead of cohortLeads) {
      let stageIdx = 0
      if (lead.length >= 8) {
        const stage = String(lead[7]).trim()
        for (let i = 0; i < FUNNEL_LABELS.length; i++) {
          if (FUNNEL_LABELS[i][1].has(stage)) { stageIdx = i; break }
        }
      }
      for (let i = 0; i <= stageIdx; i++) funnelCount[FUNNEL_ORDER[i]]++
    }

    // Sources
    const sourceCounts = {}
    for (const lead of cohortLeads) {
      const src = (lead[2] && String(lead[2]).trim()) || (lead[3] && String(lead[3]).trim()) || '(sin fuente)'
      sourceCounts[src] = (sourceCounts[src] || 0) + 1
    }

    // Clients
    const clients = cohortVentas.map(r => ({
      name: String(r[2] || ''),
      value: sf(r[3]),
      days: parseInt(r[8]) || 0,
    }))

    cohorts.push({
      month: mStr,
      gastoAds: Math.round(gastoAds * 100) / 100,
      gastoEquipo: Math.round(gastoEquipo * 100) / 100,
      gasto: Math.round(gasto * 100) / 100,
      margenBruto,
      leadsCount,
      activeCount,
      closuresCount,
      revenue,
      cohortAov: Math.round(cohortAov * 100) / 100,
      cpl: Math.round(cpl * 100) / 100,
      mer: Math.round(mer * 100) / 100,
      cac: Math.round(cac * 100) / 100,
      grossProfit: Math.round(grossProfit * 100) / 100,
      payback: Math.round(payback * 10) / 10,
      isOpen: activeCount > 0,
      funnelCount,
      sourceCounts,
      clients,
    })
  }

  return cohorts.sort((a, b) => a.month.localeCompare(b.month))
}

export function aggregateCohorts(cohorts) {
  if (!cohorts.length) return null
  const gasto = cohorts.reduce((s, c) => s + c.gasto, 0)
  const gastoAds = cohorts.reduce((s, c) => s + c.gastoAds, 0)
  const gastoEquipo = cohorts.reduce((s, c) => s + c.gastoEquipo, 0)
  const leadsCount = cohorts.reduce((s, c) => s + c.leadsCount, 0)
  const closuresCount = cohorts.reduce((s, c) => s + c.closuresCount, 0)
  const revenue = cohorts.reduce((s, c) => s + c.revenue, 0)
  const activeCount = cohorts.reduce((s, c) => s + c.activeCount, 0)
  return {
    gasto, gastoAds, gastoEquipo, leadsCount, closuresCount, revenue, activeCount,
    mer: gasto > 0 && revenue > 0 ? Math.round((revenue / gasto) * 100) / 100 : 0,
    cac: closuresCount > 0 && gasto > 0 ? Math.round((gasto / closuresCount) * 100) / 100 : 0,
    cpl: leadsCount > 0 && gastoAds > 0 ? Math.round((gastoAds / leadsCount) * 100) / 100 : 0,
    aov: closuresCount > 0 ? Math.round((revenue / closuresCount) * 100) / 100 : 0,
  }
}

export function buildMetaAds(metaRows, dateRange) {
  const { start, end } = dateRange
  const dates = new Set()
  const cur = new Date(start)
  while (cur <= end) {
    dates.add(cur.toISOString().slice(0, 10))
    cur.setDate(cur.getDate() + 1)
  }
  const ads = {}
  for (const row of metaRows) {
    if (row.length < 15) continue
    const fecha = normalizeDate(row[0])
    if (!dates.has(fecha)) continue
    const adId = String(row[4])
    const imp = sf(row[8])
    if (!ads[adId]) {
      ads[adId] = {
        adName: String(row[3]), campaign: String(row[1]), adset: String(row[2]),
        stage: String(row[6]), spend: 0, impressions: 0, reach: 0,
        hookW: 0, holdW: 0, uctrW: 0, freqSum: 0, freqN: 0,
        cpmSum: 0, cpmN: 0, registrations: 0, convos: 0,
      }
    }
    const a = ads[adId]
    a.spend += sf(row[7]); a.impressions += imp; a.reach += sf(row[11])
    a.hookW += sf(row[12]) * imp; a.holdW += sf(row[13]) * imp; a.uctrW += sf(row[14]) * imp
    a.freqSum += sf(row[10]); a.freqN++
    a.cpmSum += sf(row[9]); a.cpmN++
    a.registrations += row.length > 19 ? sf(row[19]) : 0
    a.convos += row.length > 17 ? sf(row[17]) : 0
  }
  return Object.entries(ads).map(([adId, a]) => {
    const imp = a.impressions
    return {
      adId, adName: a.adName, campaign: a.campaign, adset: a.adset, stage: a.stage,
      spend: Math.round(a.spend * 100) / 100,
      impressions: Math.round(imp),
      reach: Math.round(a.reach),
      frequency: a.freqN > 0 ? Math.round((a.freqSum / a.freqN) * 10) / 10 : 0,
      cpm: a.cpmN > 0 ? Math.round((a.cpmSum / a.cpmN) * 100) / 100 : 0,
      hookRate: imp > 0 ? Math.round((a.hookW / imp) * 10) / 10 : 0,
      holdRate: imp > 0 ? Math.round((a.holdW / imp) * 10) / 10 : 0,
      uniqueCtr: imp > 0 ? Math.round((a.uctrW / imp) * 100) / 100 : 0,
      registrations: Math.round(a.registrations),
      convos: Math.round(a.convos),
      cpr: a.registrations > 0 ? Math.round((a.spend / a.registrations) * 100) / 100 : null,
    }
  }).sort((a, b) => b.spend - a.spend)
}

export function buildInstagram(igRows, dateRange) {
  const { start, end } = dateRange
  const dates = new Set()
  const cur = new Date(start)
  while (cur <= end) { dates.add(cur.toISOString().slice(0, 10)); cur.setDate(cur.getDate() + 1) }
  let segNetos = 0, interacciones = 0, gastoIg = 0, lastFollowers = null
  let reachMax = 0
  for (const row of igRows) {
    if (!row) continue
    if (!dates.has(normalizeDate(row[0]))) continue
    segNetos += sf(row[8])
    interacciones += sf(row[4])
    reachMax = Math.max(reachMax, sf(row[2]))
    gastoIg += sf(row[5])
    if (sf(row[1]) > 0) lastFollowers = sf(row[1])
  }
  return { segNetos, interacciones, alcance: reachMax, gastoIg, lastFollowers }
}

export function buildSeo(scRows, dateRange) {
  const { start, end } = dateRange
  const startStr = start.toISOString().slice(0, 10)
  const endStr = end.toISOString().slice(0, 10)
  let clicks = 0, impressions = 0, ctrW = 0, posW = 0, n = 0
  const queries = {}
  for (const row of scRows) {
    if (!row || row.length < 8) continue
    const rowStart = normalizeDate(row[0])
    if (rowStart < startStr || rowStart > endStr) continue
    clicks += sf(row[4]); impressions += sf(row[5])
    ctrW += sf(row[6]); posW += sf(row[7]); n++
    const q = String(row[2])
    if (!queries[q]) queries[q] = { clicks: 0, impressions: 0 }
    queries[q].clicks += sf(row[4]); queries[q].impressions += sf(row[5])
  }
  return {
    clicks, impressions,
    ctr: n > 0 ? Math.round((ctrW / n) * 100) / 100 : 0,
    position: n > 0 ? Math.round((posW / n) * 10) / 10 : 0,
    topQueries: Object.entries(queries)
      .sort((a, b) => b[1].clicks - a[1].clicks)
      .slice(0, 10)
      .map(([q, m]) => ({ query: q, ...m })),
  }
}

export function buildUx(clarityRows, ga4Rows, dateRange) {
  const { start, end } = dateRange
  const dates = new Set()
  const cur = new Date(start)
  while (cur <= end) { dates.add(cur.toISOString().slice(0, 10)); cur.setDate(cur.getDate() + 1) }
  let sessions = 0, scrollW = 0, scrollSess = 0, rageClicks = 0
  for (const row of clarityRows) {
    if (!row || !dates.has(normalizeDate(row[0]))) continue
    const sess = sf(row[2])
    sessions += sess; scrollW += sf(row[3]) * sess; scrollSess += sess; rageClicks += sf(row[5])
  }
  let bounceW = 0, bounceN = 0, convForm = 0, convWhatsapp = 0
  for (const row of ga4Rows) {
    if (!row || !dates.has(normalizeDate(row[0]))) continue
    const sess = sf(row[4])
    bounceW += sf(row[8]) * sess; bounceN += sess
    convForm += sf(row[10]); convWhatsapp += sf(row[11])
  }
  return {
    sessions,
    scrollDepth: scrollSess > 0 ? Math.round((scrollW / scrollSess) * 10) / 10 : 0,
    rageClicks,
    bounceRate: bounceN > 0 ? Math.round((bounceW / bounceN) * 10) / 10 : 0,
    convForm, convWhatsapp,
  }
}
