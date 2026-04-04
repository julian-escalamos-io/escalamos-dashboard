import { GoogleAuth } from 'google-auth-library'
import { requireAuth } from './_auth.js'

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly']
const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'

async function getToken() {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON)
  const auth = new GoogleAuth({ credentials, scopes: SCOPES })
  const client = await auth.getClient()
  const { token } = await client.getAccessToken()
  return token
}

async function readSheet(token, spreadsheetId, sheetName, range = 'A2:ZZ') {
  const encoded = encodeURIComponent(`'${sheetName}'!${range}`)
  const url = `${SHEETS_BASE}/${spreadsheetId}/values/${encoded}?valueRenderOption=UNFORMATTED_VALUE`
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!resp.ok) {
    const body = await resp.text()
    console.error(`Sheet "${sheetName}" error ${resp.status}: ${body.slice(0, 300)}`)
    return []
  }
  const data = await resp.json()
  return data.values || []
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()

  const auth = await requireAuth(req, res)
  if (!auth) return

  const marketingId = process.env.SPREADSHEET_ID
  const maestroId = process.env.REGISTRO_MAESTRO_SPREADSHEET_ID
  const xeroId = process.env.XERO_SPREADSHEET_ID

  try {
    const token = await getToken()

    const marketingReads = [
      readSheet(token, marketingId, 'meta_ads_ads', 'A2:U'),
      readSheet(token, marketingId, 'ghl_leads', 'A2:J'),
      readSheet(token, marketingId, 'ghl_ventas', 'A2:J'),
      readSheet(token, marketingId, 'costos_y_margenes', 'A2:G'),
      readSheet(token, marketingId, 'instagram_org', 'A2:J'),
      readSheet(token, marketingId, 'clarity_ux', 'A2:H'),
      readSheet(token, marketingId, 'search_console', 'A2:H'),
      readSheet(token, marketingId, 'ga4_trafico', 'A2:L'),
    ]

    const maestroReads = maestroId ? [
      readSheet(token, maestroId, '1- Servicios \u{1F504}', 'A2:P'),
      readSheet(token, maestroId, '2- Egresos \u{1FAF0}', 'A2:H'),
      readSheet(token, maestroId, '4- Hist\u00F3rico', 'A1:AZ'),
    ] : []

    const xeroReads = xeroId ? [
      readSheet(token, xeroId, 'E.R. Unificado', 'A5:R'),
    ] : []

    const [marketingResults, maestroResults, xeroResults] = await Promise.all([
      Promise.all(marketingReads),
      Promise.all(maestroReads),
      Promise.all(xeroReads),
    ])

    const [metaAds, ghlLeads, ghlVentas, costos, instagram, clarity, searchConsole, ga4Trafico] = marketingResults

    const response = { metaAds, ghlLeads, ghlVentas, costos, instagram, clarity, searchConsole, ga4Trafico }

    if (maestroId && maestroResults.length === 3) {
      response.servicios = maestroResults[0]
      response.egresos = maestroResults[1]
      response.historico = maestroResults[2]
    }

    if (xeroId && xeroResults.length === 1) {
      response.erUnificado = xeroResults[0]
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30')
    res.json(response)
  } catch (err) {
    console.error('Sheets error:', err)
    res.status(500).json({ error: err.message })
  }
}
