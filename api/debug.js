import { GoogleAuth } from 'google-auth-library'

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly']
const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'

export default async function handler(_req, res) {
  try {
    const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON || '{}')
    const maestroId = process.env.REGISTRO_MAESTRO_SPREADSHEET_ID

    const auth = new GoogleAuth({ credentials: creds, scopes: SCOPES })
    const client = await auth.getClient()
    const { token } = await client.getAccessToken()

    // Try to list sheet names from the Registro Maestro spreadsheet
    const metaResp = await fetch(`${SHEETS_BASE}/${maestroId}?fields=sheets.properties.title`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const metaBody = await metaResp.json()

    res.json({
      service_account: creds.client_email,
      registro_maestro_id: maestroId,
      status: metaResp.status,
      sheets: metaBody?.sheets?.map(s => s.properties.title) || metaBody,
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
