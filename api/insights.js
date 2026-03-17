import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `Sos un analista de negocios experto en marketing de performance.
Analizás métricas de cohortes y generás insights accionables en español.
Siempre respondés en JSON válido con exactamente estos 3 campos:
{
  "conclusion": "1-2 oraciones resumiendo el estado de la cohorte con números concretos",
  "bottleneck": "1-2 oraciones identificando el cuello de botella principal con evidencia",
  "actions": ["acción 1 concreta y accionable", "acción 2", "acción 3"]
}
Nada más. Solo JSON puro, sin markdown, sin bloques de código.`

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { cohorts, period } = req.body

    if (!cohorts || cohorts.length === 0) {
      return res.status(400).json({ error: 'No cohort data provided' })
    }

    const cohortsText = cohorts.map(c => {
      const convRate = c.leadsCount > 0 ? ((c.closuresCount / c.leadsCount) * 100).toFixed(1) : '0'
      return `Cohorte ${c.month}: Gasto $${c.gasto.toFixed(0)} (ads $${c.gastoAds.toFixed(0)} + equipo $${c.gastoEquipo.toFixed(0)}) | Leads ${c.leadsCount} | Cierres ${c.closuresCount} (${convRate}%) | Revenue $${c.revenue.toFixed(0)} | MER ${c.mer.toFixed(1)}x | CAC $${c.cac.toFixed(0)} | CPL $${c.cpl.toFixed(2)} | Payback ${c.payback.toFixed(0)}d | Activos en pipeline: ${c.activeCount}`
    }).join('\n')

    const userMsg = `Analizá estas cohortes para el período ${period}:\n\n${cohortsText}\n\nGenerá los 3 campos JSON.`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMsg }],
    })

    const text = response.content[0].text.trim()
    const parsed = JSON.parse(text)
    res.json(parsed)
  } catch (err) {
    console.error('Insights error:', err)
    res.status(500).json({ error: err.message })
  }
}
