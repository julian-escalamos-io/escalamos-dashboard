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
      readSheet(token, marketingId, 'instagram_org', 'A2:H'),
      readSheet(token, marketingId, 'instagram_content', 'A2:S'),
      readSheet(token, marketingId, 'clarity_ux', 'A2:H'),
      readSheet(token, marketingId, 'search_console', 'A2:H'),
      readSheet(token, marketingId, 'ga4_trafico', 'A2:L'),
      readSheet(token, marketingId, 'google_ads', 'A2:N'),
    ]

    const xeroReads = xeroId ? [
      readSheet(token, xeroId, 'Estado de Resultados', 'A5:AE'),
      readSheet(token, xeroId, 'Xero - Raw Data', 'A2:O'),
      readSheet(token, xeroId, 'Libro Diario', 'A6:J'),
      readSheet(token, xeroId, '1- Servicios', 'A2:S'),
      readSheet(token, xeroId, '2- Egresos', 'A2:K'),
    ] : []

    const [marketingResults, xeroResults] = await Promise.all([
      Promise.all(marketingReads),
      Promise.all(xeroReads),
    ])

    const [metaAds, ghlLeads, ghlVentas, costos, instagram, instagramContent, clarity, searchConsole, ga4Trafico, googleAds] = marketingResults

    const response = { metaAds, ghlLeads, ghlVentas, costos, instagram, instagramContent, clarity, searchConsole, ga4Trafico, googleAds }

    if (xeroId && xeroResults.length >= 5) {
      response.erUnificado = xeroResults[0]
      response.xeroRaw = xeroResults[1]
      response.libroDiario = xeroResults[2]
      response.servicios = xeroResults[3]
      response.egresos = xeroResults[4]
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30')
    res.json(response)
  } catch (err) {
    console.error('Sheets error:', err)
    res.status(500).json({ error: err.message })
  }
}
