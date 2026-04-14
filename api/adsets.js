const META_API = `https://graph.facebook.com/${process.env.META_API_VERSION || 'v19.0'}`;
const TOKEN = process.env.META_ACCESS_TOKEN;
const ACCOUNT = process.env.META_ACCOUNT_ID;

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!TOKEN || !ACCOUNT) {
    return res.status(500).json({ error: 'Variables de entorno no configuradas.' });
  }

  try {
    // GET — listar ad sets
    if (req.method === 'GET') {
      const response = await fetch(
        `${META_API}/${ACCOUNT}/adsets?fields=name,campaign_id,status,daily_budget,spend_cap,optimization_goal,billing_event,targeting,start_time,end_time&limit=50&access_token=${TOKEN}`
      );
      const data = await response.json();
      if (data.error) return res.status(400).json({ error: data.error.message });
      return res.status(200).json(data);
    }

    // POST — crear ad set
    if (req.method === 'POST') {
      const {
        name, campaign_id, status, daily_budget,
        optimization_goal, billing_event, bid_amount,
        targeting, start_time, end_time,
      } = req.body;

      if (!name || !campaign_id || !daily_budget || !optimization_goal || !billing_event) {
        return res.status(400).json({ error: 'Faltan campos obligatorios: name, campaign_id, daily_budget, optimization_goal, billing_event' });
      }

      const params = new URLSearchParams({
        name,
        campaign_id,
        status: status || 'PAUSED',
        daily_budget,
        optimization_goal,
        billing_event,
        access_token: TOKEN,
      });

      if (bid_amount) params.append('bid_amount', bid_amount);
      if (targeting) params.append('targeting', JSON.stringify(targeting));
      if (start_time) params.append('start_time', start_time);
      if (end_time) params.append('end_time', end_time);

      const response = await fetch(`${META_API}/${ACCOUNT}/adsets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      const data = await response.json();
      if (data.error) return res.status(400).json({ error: data.error.message });
      return res.status(201).json(data);
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
