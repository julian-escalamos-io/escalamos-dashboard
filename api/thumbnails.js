export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  const { ids } = req.query
  const token = process.env.META_ACCESS_TOKEN

  if (!ids || !token) return res.status(400).json({ error: 'Missing params' })

  const adIds = ids.split(',').filter(Boolean).slice(0, 60)

  const results = {}
  await Promise.all(adIds.map(async (adId) => {
    try {
      const url = `https://graph.facebook.com/v19.0/${adId}?fields=creative{thumbnail_url,image_url}&access_token=${token}`
      const resp = await fetch(url)
      if (!resp.ok) return
      const data = await resp.json()
      const c = data.creative
      if (c) results[adId] = c.thumbnail_url || c.image_url || null
    } catch { /* ignore individual failures */ }
  }))

  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=300')
  res.json(results)
}
