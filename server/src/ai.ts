export type AIProvider =
  | 'openrouter'
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'ollama'
  | 'openai_compatible';

export interface AISettingsConfig {
  provider: AIProvider;
  baseUrl: string;
  model: string;
  apiKey: string;
  temperature: number;
  systemPrompt: string;
}

const DEFAULT_BASE_URLS: Record<AIProvider, string> = {
  openrouter: 'https://openrouter.ai/api/v1',
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com',
  gemini: 'https://generativelanguage.googleapis.com/v1beta',
  ollama: 'http://host.docker.internal:11434/v1',
  openai_compatible: 'https://api.openai.com/v1',
};

const OLLAMA_ALLOWED_HOSTS = new Set(['localhost', '127.0.0.1', 'host.docker.internal']);

function isPrivateOrLocalHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    h === 'localhost' ||
    h === '0.0.0.0' ||
    h === '::1' ||
    h === 'db' ||
    h === 'api' ||
    h === 'web' ||
    h.endsWith('.local') ||
    h.endsWith('.internal')
  ) {
    return true;
  }

  // IPv4 private / loopback / link-local / metadata ranges
  const ipv4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [, a, b] = ipv4.map(Number);
    if (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    ) {
      return true;
    }
  }

  if (h.startsWith('fe80:') || h.startsWith('fc') || h.startsWith('fd')) {
    return true;
  }

  return false;
}

export function validateBaseUrl(provider: AIProvider, rawUrl: string): string {
  const candidate = (rawUrl || DEFAULT_BASE_URLS[provider]).trim().replace(/\/+$/, '');
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error('Base URL must be a valid URL.');
  }

  if (parsed.username || parsed.password) {
    throw new Error('Base URL must not contain embedded credentials.');
  }

  if (provider === 'ollama') {
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Ollama Base URL must use http or https.');
    }
    if (!OLLAMA_ALLOWED_HOSTS.has(parsed.hostname.toLowerCase())) {
      throw new Error('Ollama Base URL must target localhost or host.docker.internal.');
    }
    return candidate;
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Provider Base URL must use HTTPS.');
  }
  if (isPrivateOrLocalHostname(parsed.hostname)) {
    throw new Error('Provider Base URL cannot target private or internal network addresses.');
  }

  return candidate;
}

export async function generateAIInsights(
  config: AISettingsConfig,
  userPrompt: string
): Promise<string> {
  const baseUrl = validateBaseUrl(config.provider, config.baseUrl);
  const timeoutSignal = AbortSignal.timeout(30_000);
  const systemInstruction = [
    'You are an executive finance and AI deployment advisor.',
    'Use British English spelling. Never use em dashes.',
    'Base every figure strictly on the P&L data provided. Highlight payback, unit economics, risk exposure, and concrete optimisation actions.',
    config.systemPrompt?.trim() ? `Additional focus: ${config.systemPrompt.trim()}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (config.provider === 'anthropic') {
    if (!config.apiKey) {
      throw new Error('Anthropic API key is required.');
    }
    const res = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      signal: timeoutSignal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.model || 'claude-3-5-sonnet-latest',
        max_tokens: 1400,
        temperature: config.temperature,
        system: systemInstruction,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
      content?: Array<{ type: string; text?: string }>;
    };
    if (!res.ok) {
      throw new Error(data.error?.message ?? `Anthropic API error (${res.status})`);
    }
    const text = data.content?.find((c) => c.type === 'text')?.text;
    if (!text) throw new Error('Anthropic returned an empty response.');
    return text;
  }

  if (config.provider === 'gemini') {
    if (!config.apiKey) {
      throw new Error('Google Gemini API key is required.');
    }
    const model = config.model || 'gemini-2.5-flash';
    const url = `${baseUrl}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`;
    const res = await fetch(url, {
      method: 'POST',
      signal: timeoutSignal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: config.temperature },
      }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    if (!res.ok) {
      throw new Error(data.error?.message ?? `Gemini API error (${res.status})`);
    }
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini returned an empty response.');
    return text;
  }

  // OpenRouter, OpenAI, Ollama, and OpenAI-compatible endpoints
  if (config.provider !== 'ollama' && !config.apiKey) {
    throw new Error('API key is required for this provider.');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }
  if (config.provider === 'openrouter') {
    headers['X-Title'] = 'Agentic P&L Calculator';
  }

  const defaultModel =
    config.provider === 'openrouter'
      ? 'openai/gpt-4o-mini'
      : config.provider === 'ollama'
        ? 'llama3.2'
        : 'gpt-4o-mini';

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    signal: timeoutSignal,
    headers,
    body: JSON.stringify({
      model: config.model || defaultModel,
      temperature: config.temperature,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string } }>;
  };
  if (!res.ok) {
    throw new Error(data.error?.message ?? `Provider API error (${res.status})`);
  }
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('The AI provider returned an empty response.');
  return text;
}
