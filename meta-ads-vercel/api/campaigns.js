const META_API = `https://graph.facebook.com/${process.env.META_API_VERSION || 'v19.0'}`;
const TOKEN = process.env.META_ACCESS_TOKEN;
const ACCOUNT = process.env.META_ACCOUNT_ID;

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!TOKEN || !ACCOUNT) {
    return res.status(500).json({ error: 'Variables de entorno no configuradas. Revisa META_ACCESS_TOKEN y META_ACCOUNT_ID.' });
  }

  try {
    // GET — listar campañas
    if (req.method === 'GET') {
      const response = await fetch(
        `${META_API}/${ACCOUNT}/campaigns?fields=name,objective,status,daily_budget,lifetime_budget,spend_cap,created_time&limit=50&access_token=${TOKEN}`
      );
      const data = await response.json();
      if (data.error) return res.status(400).json({ error: data.error.message });
      return res.status(200).json(data);
    }

    // POST — crear campaña
    if (req.method === 'POST') {
      const { name, objective, status, daily_budget, lifetime_budget, bid_strategy, special_ad_categories } = req.body;

      if (!name || !objective) {
        return res.status(400).json({ error: 'name y objective son obligatorios' });
      }

      const params = new URLSearchParams({
        name,
        objective,
        status: status || 'PAUSED',
        bid_strategy: bid_strategy || 'LOWEST_COST_WITHOUT_CAP',
        special_ad_categories: JSON.stringify(special_ad_categories || []),
        access_token: TOKEN,
      });

      if (daily_budget) params.append('daily_budget', daily_budget);
      if (lifetime_budget) params.append('lifetime_budget', lifetime_budget);

      const response = await fetch(`${META_API}/${ACCOUNT}/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      const data = await response.json();
      if (data.error) return res.status(400).json({ error: data.error.message });
      return res.status(201).json(data);
    }

    // DELETE — eliminar campaña
    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Se requiere id de campaña' });

      const response = await fetch(`${META_API}/${id}?access_token=${TOKEN}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.error) return res.status(400).json({ error: data.error.message });
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
