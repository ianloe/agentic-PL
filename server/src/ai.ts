export type AIProvider =
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
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com',
  gemini: 'https://generativelanguage.googleapis.com/v1beta',
  ollama: 'http://host.docker.internal:11434/v1',
  openai_compatible: 'https://api.openai.com/v1',
};

export async function generateAIInsights(
  config: AISettingsConfig,
  userPrompt: string
): Promise<string> {
  const baseUrl = (config.baseUrl || DEFAULT_BASE_URLS[config.provider]).replace(/\/+$/, '');
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

  // OpenAI, Ollama, and OpenAI-compatible endpoints
  if (config.provider !== 'ollama' && !config.apiKey) {
    throw new Error('API key is required for this provider.');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: config.model || (config.provider === 'ollama' ? 'llama3.2' : 'gpt-4o-mini'),
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
