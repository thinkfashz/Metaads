const META_API = `https://graph.facebook.com/${process.env.META_API_VERSION || 'v19.0'}`;
const TOKEN = process.env.META_ACCESS_TOKEN;
const ACCOUNT = process.env.META_ACCOUNT_ID;

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  if (!TOKEN || !ACCOUNT) {
    return res.status(500).json({ error: 'Variables de entorno no configuradas.' });
  }

  const {
    level = 'account',
    since,
    until,
    date_preset = 'last_14_days',
    time_increment,
  } = req.query;

  const fields = 'spend,reach,impressions,clicks,ctr,cpc,cpm,actions,cost_per_action_type,date_start,date_stop';

  const params = new URLSearchParams({
    fields,
    access_token: TOKEN,
  });

  if (since && until) {
    params.append('time_range', JSON.stringify({ since, until }));
  } else {
    params.append('date_preset', date_preset);
  }

  if (level !== 'account') params.append('level', level);
  if (time_increment) params.append('time_increment', time_increment);

  try {
    const response = await fetch(`${META_API}/${ACCOUNT}/insights?${params.toString()}`);
    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error.message });
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
