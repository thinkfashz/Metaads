const META_API = `https://graph.facebook.com/${process.env.META_API_VERSION || 'v19.0'}`;
const TOKEN = process.env.META_ACCESS_TOKEN;
const ACCOUNT = process.env.META_ACCOUNT_ID;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const envCheck = {
    META_ACCESS_TOKEN: !!TOKEN,
    META_ACCOUNT_ID: !!ACCOUNT,
    META_API_VERSION: process.env.META_API_VERSION || 'v19.0 (default)',
    API_SECRET_KEY: !!process.env.API_SECRET_KEY,
  };

  const missing = Object.entries(envCheck)
    .filter(([, v]) => v === false)
    .map(([k]) => k);

  if (missing.length > 0) {
    return res.status(200).json({
      status: 'error',
      message: 'Variables de entorno faltantes',
      missing,
      env: envCheck,
    });
  }

  // Verificar token con Meta
  try {
    const response = await fetch(
      `${META_API}/${ACCOUNT}?fields=name,currency,account_status,timezone_name&access_token=${TOKEN}`
    );
    const data = await response.json();

    if (data.error) {
      return res.status(200).json({
        status: 'error',
        message: 'Token de Meta inválido o expirado',
        meta_error: data.error.message,
        env: envCheck,
      });
    }

    return res.status(200).json({
      status: 'ok',
      message: 'Todo configurado correctamente ✅',
      account: {
        name: data.name,
        currency: data.currency,
        timezone: data.timezone_name,
        status: data.account_status,
      },
      env: envCheck,
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: err.message,
      env: envCheck,
    });
  }
}
