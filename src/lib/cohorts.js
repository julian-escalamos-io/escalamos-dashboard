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

export function normalizeSource(raw) {
  if (!raw) return '(sin fuente)'
  const s = raw.toLowerCase().trim()
  if (s === 'ig' || s.includes('instagram') || s === 'social media' || s === 'social' || s.includes('redes')) return 'Instagram / Social Media'
  if (s === 'fb' || s.includes('facebook')) return 'Instagram / Social Media'
  if (s.includes('whatsapp') || s === 'ws' || s === 'wa') return 'WhatsApp'
  if (s.includes('google') || s === 'gads' || s === 'sem') return 'Google'
  if (s.includes('referido') || s.includes('referral') || s.includes('referral')) return 'Referido'
  if (s.includes('linkedin')) return 'LinkedIn'
  if (s.includes('email') || s.includes('mail')) return 'Email'
  return raw
}

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

  // Build name → source map from all leads (col 1 = name, col 2/3 = source)
  const leadSourceByName = {}
  for (const lead of leadsRows) {
    if (!lead || !lead[1]) continue
    const name = String(lead[1]).trim().toLowerCase()
    if (!leadSourceByName[name]) {
      const raw = (lead[2] && String(lead[2]).trim()) || (lead[3] && String(lead[3]).trim()) || ''
      if (raw) leadSourceByName[name] = normalizeSource(raw)
    }
  }

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
    const cicloVentas = closuresCount > 0
      ? Math.round(cohortVentas.reduce((s, r) => s + (parseInt(r[8]) || 0), 0) / closuresCount)
      : 0

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

    // Sources — leads
    const sourceCounts = {}
    for (const lead of cohortLeads) {
      const raw = (lead[2] && String(lead[2]).trim()) || (lead[3] && String(lead[3]).trim()) || ''
      const src = normalizeSource(raw)
      sourceCounts[src] = (sourceCounts[src] || 0) + 1
    }

    // Sources — ventas (lookup by contact name from leads map only)
    const salesSourceCounts = {}
    const salesRevenueBySource = {}
    for (const r of cohortVentas) {
      const name = String(r[2] || '').trim().toLowerCase()
      const src = leadSourceByName[name] || '(sin fuente)'
      salesSourceCounts[src] = (salesSourceCounts[src] || 0) + 1
      salesRevenueBySource[src] = (salesRevenueBySource[src] || 0) + sf(r[3])
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
      cicloVentas,
      isOpen: activeCount > 0,
      funnelCount,
      sourceCounts,
      salesSourceCounts,
      salesRevenueBySource,
      clients,
    })
  }

  return cohorts.sort((a, b) => a.month.localeCompare(b.month))
}

export function aggregateCohorts(cohorts, periodLabel) {
  if (!cohorts.length) return null
  const gasto = cohorts.reduce((s, c) => s + c.gasto, 0)
  const gastoAds = cohorts.reduce((s, c) => s + c.gastoAds, 0)
  const gastoEquipo = cohorts.reduce((s, c) => s + c.gastoEquipo, 0)
  const leadsCount = cohorts.reduce((s, c) => s + c.leadsCount, 0)
  const closuresCount = cohorts.reduce((s, c) => s + c.closuresCount, 0)
  const revenue = cohorts.reduce((s, c) => s + c.revenue, 0)
  const activeCount = cohorts.reduce((s, c) => s + c.activeCount, 0)

  const cohortAov = closuresCount > 0 ? revenue / closuresCount : 0
  const cpl = leadsCount > 0 && gastoAds > 0 ? gastoAds / leadsCount : 0
  const mer = gasto > 0 && revenue > 0 ? revenue / gasto : 0
  const cac = closuresCount > 0 && gasto > 0 ? gasto / closuresCount : 0
  const margenBrutoAvg = cohorts.length > 0
    ? cohorts.reduce((s, c) => s + (c.margenBruto || 0), 0) / cohorts.length
    : 0
  const grossProfit = margenBrutoAvg > 0 && cohortAov > 0 ? cohortAov * margenBrutoAvg : 0
  const payback = grossProfit > 0 && cac > 0 ? (cac / grossProfit) * 30 : 0

  // Ciclo ventas — promedio ponderado por closures
  const totalDays = cohorts.reduce((s, c) => s + ((c.cicloVentas || 0) * c.closuresCount), 0)
  const cicloVentas = closuresCount > 0 ? Math.round(totalDays / closuresCount) : 0

  // Funnel — sumar cada stage
  const funnelCount = {}
  for (const c of cohorts) {
    if (!c.funnelCount) continue
    for (const [k, v] of Object.entries(c.funnelCount)) {
      funnelCount[k] = (funnelCount[k] || 0) + v
    }
  }

  // Sources — sumar
  const sourceCounts = {}
  const salesSourceCounts = {}
  const salesRevenueBySource = {}
  for (const c of cohorts) {
    for (const [k, v] of Object.entries(c.sourceCounts || {})) {
      sourceCounts[k] = (sourceCounts[k] || 0) + v
    }
    for (const [k, v] of Object.entries(c.salesSourceCounts || {})) {
      salesSourceCounts[k] = (salesSourceCounts[k] || 0) + v
    }
    for (const [k, v] of Object.entries(c.salesRevenueBySource || {})) {
      salesRevenueBySource[k] = (salesRevenueBySource[k] || 0) + v
    }
  }

  // Clients — concatenar
  const clients = cohorts.flatMap(c => c.clients || [])

  const first = cohorts[0].month
  const last = cohorts[cohorts.length - 1].month

  return {
    month: `${first}__${last}`,
    periodLabel: periodLabel || `${first} → ${last}`,
    isAggregate: true,
    gastoAds: Math.round(gastoAds * 100) / 100,
    gastoEquipo: Math.round(gastoEquipo * 100) / 100,
    gasto: Math.round(gasto * 100) / 100,
    margenBruto: margenBrutoAvg,
    leadsCount,
    activeCount,
    closuresCount,
    revenue: Math.round(revenue * 100) / 100,
    cohortAov: Math.round(cohortAov * 100) / 100,
    cpl: Math.round(cpl * 100) / 100,
    mer: Math.round(mer * 100) / 100,
    cac: Math.round(cac * 100) / 100,
    grossProfit: Math.round(grossProfit * 100) / 100,
    payback: Math.round(payback * 10) / 10,
    cicloVentas,
    isOpen: cohorts.some(c => c.isOpen),
    funnelCount,
    sourceCounts,
    salesSourceCounts,
    salesRevenueBySource,
    clients,
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
      cpm: imp > 0 ? Math.round((a.spend / imp) * 1000 * 100) / 100 : 0,
      hookRate: imp > 0 ? Math.round((a.hookW / imp) * 10) / 10 : 0,
      holdRate: imp > 0 ? Math.round((a.holdW / imp) * 10) / 10 : 0,
      uniqueCtr: imp > 0 ? Math.round((a.uctrW / imp) * 100) / 100 : 0,
      registrations: Math.round(a.registrations),
      convos: Math.round(a.convos),
      cpr: a.registrations > 0 ? Math.round((a.spend / a.registrations) * 100) / 100 : null,
    }
  }).sort((a, b) => b.spend - a.spend)
}

export function buildGoogleAds(rows, dateRange) {
  if (!rows || !rows.length) return null
  const { start, end } = dateRange
  const startStr = start.toISOString().slice(0, 10)
  const endStr = end.toISOString().slice(0, 10)
  let spend = 0, impressions = 0, clicks = 0, waConv = 0, formConv = 0
  let ctrW = 0, cpcW = 0, isW = 0, isN = 0
  const campaigns = {}
  for (const row of rows) {
    if (!row || row.length < 7) continue
    const fecha = normalizeDate(row[0])
    if (fecha < startStr || fecha > endStr) continue
    const sp = sf(row[2])
    const imp = sf(row[3])
    const clk = sf(row[4])
    spend += sp
    impressions += imp
    clicks += clk
    ctrW += sf(row[5]) * imp
    cpcW += sf(row[6]) * clk
    isW += sf(row[7]); isN++
    waConv += sf(row[10])
    formConv += sf(row[12])
    const camp = String(row[1] || '(sin campaña)')
    if (!campaigns[camp]) campaigns[camp] = { spend: 0, clicks: 0, impressions: 0, waConv: 0, formConv: 0 }
    campaigns[camp].spend += sp
    campaigns[camp].clicks += clk
    campaigns[camp].impressions += imp
    campaigns[camp].waConv += sf(row[10])
    campaigns[camp].formConv += sf(row[12])
  }
  const conversions = waConv + formConv
  return {
    spend: Math.round(spend * 100) / 100,
    impressions: Math.round(impressions),
    clicks: Math.round(clicks),
    ctr: impressions > 0 ? Math.round((ctrW / impressions) * 100) / 100 : 0,
    cpc: clicks > 0 ? Math.round((cpcW / clicks) * 100) / 100 : 0,
    impressionShare: isN > 0 ? Math.round((isW / isN) * 100) / 100 : 0,
    conversions: Math.round(conversions),
    waConv: Math.round(waConv),
    formConv: Math.round(formConv),
    cpa: conversions > 0 ? Math.round((spend / conversions) * 100) / 100 : 0,
    campaigns: Object.entries(campaigns)
      .map(([name, c]) => ({ name, ...c, conversions: c.waConv + c.formConv }))
      .sort((a, b) => b.spend - a.spend),
  }
}

export function buildInstagram(igRows, dateRange) {
  const { start, end } = dateRange
  const dates = new Set()
  const cur = new Date(start)
  while (cur <= end) { dates.add(cur.toISOString().slice(0, 10)); cur.setDate(cur.getDate() + 1) }

  // Sheet 'instagram_org' columns:
  // A:fecha B:followers_count C:reach_organico D:views_organico
  // E:interacciones F:nuevos_seguidores G:perdidos H:seguidores_netos
  let reachTotal = 0, viewsTotal = 0, interacciones = 0
  let nuevos = 0, perdidos = 0, segNetos = 0
  let lastFollowers = null
  let lastFollowersDate = ''
  for (const row of igRows) {
    if (!row) continue
    if (!dates.has(normalizeDate(row[0]))) continue
    reachTotal += sf(row[2])
    viewsTotal += sf(row[3])
    interacciones += sf(row[4])
    nuevos += sf(row[5])
    perdidos += sf(row[6])
    segNetos += sf(row[7])
    const followers = sf(row[1])
    const fecha = normalizeDate(row[0])
    if (followers > 0 && fecha >= lastFollowersDate) {
      lastFollowers = followers
      lastFollowersDate = fecha
    }
  }
  return {
    alcance: reachTotal,
    views: viewsTotal,
    interacciones,
    nuevos,
    perdidos,
    segNetos,
    lastFollowers,
  }
}

export function buildInstagramContent(rows, dateRange) {
  if (!rows || !rows.length) return []
  const { start, end } = dateRange
  const startStr = start.toISOString().slice(0, 10)
  const endStr = end.toISOString().slice(0, 10)
  // Sheet 'instagram_content':
  // A:fecha B:media_id C:tipo D:caption E:permalink F:thumbnail_url
  // G:reach H:views I:total_interactions J:likes K:comments L:shares M:saved
  // N:avg_watch_time O:watch_time_total P:engagement_rate Q:save_rate R:share_rate S:nuevos_seguidores
  const items = []
  for (const row of rows) {
    if (!row || !row[0]) continue
    const fecha = normalizeDate(row[0])
    if (fecha < startStr || fecha > endStr) continue
    items.push({
      fecha,
      mediaId: String(row[1] || ''),
      tipo: String(row[2] || ''),
      caption: String(row[3] || ''),
      permalink: String(row[4] || ''),
      thumbnail: String(row[5] || ''),
      reach: sf(row[6]),
      views: sf(row[7]),
      interactions: sf(row[8]),
      likes: sf(row[9]),
      comments: sf(row[10]),
      shares: sf(row[11]),
      saved: sf(row[12]),
      avgWatchTime: sf(row[13]),
      engagementRate: sf(row[15]),
      saveRate: sf(row[16]),
      shareRate: sf(row[17]),
      nuevosSeguidores: sf(row[18]),
    })
  }
  return items.sort((a, b) => b.interactions - a.interactions)
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
