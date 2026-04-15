import type { VercelRequest, VercelResponse } from '@vercel/node';

// ─────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────
interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

type AIProvider = 'openai' | 'anthropic' | 'openrouter' | 'gemini';

interface AIRequestBody {
  provider: AIProvider;
  model?: string;
  messages: AIMessage[];
  max_tokens?: number;
  temperature?: number;
}

// ─────────────────────────────────────────────
//  CORS
// ─────────────────────────────────────────────
function cors(res: VercelResponse): void {
  const origin = process.env.ALLOWED_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// ─────────────────────────────────────────────
//  Provider implementations
// ─────────────────────────────────────────────

/** OpenAI — GPT-4o / GPT-4o-mini */
async function callOpenAI(
  messages: AIMessage[],
  model: string,
  maxTokens: number,
  temperature: number
): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY no está configurada en las variables de entorno');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
  });

  const data = (await res.json()) as { choices?: { message: { content: string } }[]; error?: { message: string } };
  if (data.error) throw new Error(data.error.message);
  return data.choices?.[0]?.message?.content ?? '';
}

/** Anthropic — Claude 3.x */
async function callAnthropic(
  messages: AIMessage[],
  model: string,
  maxTokens: number,
  temperature: number
): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY no está configurada en las variables de entorno');

  const system = messages.find((m) => m.role === 'system')?.content;
  const userMessages = messages.filter((m) => m.role !== 'system');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: userMessages,
      ...(system ? { system } : {}),
      temperature,
    }),
  });

  const data = (await res.json()) as {
    content?: { type: string; text: string }[];
    error?: { message: string } | string;
  };
  if (data.error) {
    const msg = typeof data.error === 'string' ? data.error : data.error.message;
    throw new Error(msg);
  }
  return data.content?.[0]?.text ?? '';
}

/** OpenRouter — Free + paid models */
async function callOpenRouter(
  messages: AIMessage[],
  model: string,
  maxTokens: number,
  temperature: number
): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY no está configurada en las variables de entorno');

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
      'HTTP-Referer': 'https://fabrick-ads.vercel.app',
      'X-Title': 'Fabrick ADS Agent',
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
  });

  const data = (await res.json()) as { choices?: { message: { content: string } }[]; error?: { message: string } };
  if (data.error) throw new Error(data.error.message);
  return data.choices?.[0]?.message?.content ?? '';
}

/** Google Gemini */
async function callGemini(
  messages: AIMessage[],
  model: string,
  maxTokens: number,
  temperature: number
): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY no está configurada en las variables de entorno');

  const system = messages.find((m) => m.role === 'system')?.content;
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        generationConfig: { maxOutputTokens: maxTokens, temperature },
      }),
    }
  );

  const data = (await res.json()) as {
    candidates?: { content: { parts: { text: string }[] } }[];
    error?: { message: string };
  };
  if (data.error) throw new Error(data.error.message);
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

// ─────────────────────────────────────────────
//  Default models per provider
// ─────────────────────────────────────────────
const DEFAULT_MODELS: Record<AIProvider, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-haiku-20241022',
  openrouter: 'mistralai/mistral-7b-instruct:free',
  gemini: 'gemini-1.5-flash',
};

// ─────────────────────────────────────────────
//  Handler
// ─────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const body = req.body as Partial<AIRequestBody>;
  const { provider, model, messages, max_tokens = 2000, temperature = 0.7 } = body;

  if (!provider || !messages?.length) {
    return res.status(400).json({ error: 'Se requieren los campos: provider, messages' });
  }

  const resolvedModel = model || DEFAULT_MODELS[provider as AIProvider] || DEFAULT_MODELS.openrouter;

  try {
    let content: string;

    switch (provider) {
      case 'openai':
        content = await callOpenAI(messages, resolvedModel, max_tokens, temperature);
        break;
      case 'anthropic':
        content = await callAnthropic(messages, resolvedModel, max_tokens, temperature);
        break;
      case 'gemini':
        content = await callGemini(messages, resolvedModel, max_tokens, temperature);
        break;
      case 'openrouter':
      default:
        content = await callOpenRouter(messages, resolvedModel, max_tokens, temperature);
        break;
    }

    return res.status(200).json({ content, provider, model: resolvedModel });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    return res.status(500).json({ error: message });
  }
}
