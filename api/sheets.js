import { GoogleAuth } from 'google-auth-library'

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
    console.error(`Sheet ${sheetName} error: ${resp.status}`)
    return []
  }
  const data = await resp.json()
  return data.values || []
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')

  const spreadsheetId = process.env.SPREADSHEET_ID

  try {
    const token = await getToken()

    const [metaAds, ghlLeads, ghlVentas, costos, instagram, clarity, searchConsole, ga4Trafico] =
      await Promise.all([
        readSheet(token, spreadsheetId, 'meta_ads_ads', 'A2:U'),
        readSheet(token, spreadsheetId, 'ghl_leads', 'A2:J'),
        readSheet(token, spreadsheetId, 'ghl_ventas', 'A2:J'),
        readSheet(token, spreadsheetId, 'costos_y_margenes', 'A2:G'),
        readSheet(token, spreadsheetId, 'instagram_org', 'A2:J'),
        readSheet(token, spreadsheetId, 'clarity_ux', 'A2:H'),
        readSheet(token, spreadsheetId, 'search_console', 'A2:H'),
        readSheet(token, spreadsheetId, 'ga4_trafico', 'A2:L'),
      ])

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60')
    res.json({ metaAds, ghlLeads, ghlVentas, costos, instagram, clarity, searchConsole, ga4Trafico })
  } catch (err) {
    console.error('Sheets error:', err)
    res.status(500).json({ error: err.message })
  }
}
