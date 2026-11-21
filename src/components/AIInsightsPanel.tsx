import { Check, Copy, KeyRound, Lock, Save, Sparkles } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';
import remarkGfm from 'remark-gfm';
import { rankAgentsByROI } from '../engine/calculations';
import type { AgentPLResult, Currency, TornadoItem } from '../engine/types';
import {
  type AIInsightsResponse,
  type AIProvider,
  type AuthUser,
  type UserAISettings,
  fetchAISettings,
  generateInsights,
  saveAISettings,
} from '../utils/api';
import { formatMoney, formatNumber, formatPercent } from '../utils/format';

interface AIInsightsPanelProps {
  user: AuthUser | null;
  activeResult: AgentPLResult;
  agentResults: AgentPLResult[];
  tornado: TornadoItem[];
  viewScope: 'agent' | 'portfolio';
  currency: Currency;
  exchangeRate: number;
}

const PROVIDER_PRESETS: Record<
  AIProvider,
  { label: string; baseUrl: string; model: string; needsKey: boolean }
> = {
  openrouter: {
    label: 'OpenRouter (Default)',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'openai/gpt-4o-mini',
    needsKey: true,
  },
  openai: {
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    needsKey: true,
  },
  anthropic: {
    label: 'Anthropic (Claude)',
    baseUrl: 'https://api.anthropic.com',
    model: 'claude-3-5-sonnet-latest',
    needsKey: true,
  },
  gemini: {
    label: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-2.5-flash',
    needsKey: true,
  },
  ollama: {
    label: 'Ollama (Local)',
    baseUrl: 'http://host.docker.internal:11434/v1',
    model: 'llama3.2',
    needsKey: false,
  },
  openai_compatible: {
    label: 'OpenAI-Compatible Endpoint',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    needsKey: true,
  },
};

const QUICK_PROMPTS = [
  {
    label: 'Executive Board Summary',
    instruction:
      'Provide a concise board-level financial summary covering 3-year net saving, ROI, payback period, and whether this deployment should be approved.',
  },
  {
    label: 'Payback & Risk Critique',
    instruction:
      'Critique the payback timeline, sensitivity risks, error exposure, and human-in-the-loop review burden.',
  },
  {
    label: 'Cost Optimisation Plan',
    instruction:
      'Identify the top 3 concrete actions to reduce agent run cost, human review cost, or fixed overhead.',
  },
  {
    label: 'Portfolio Prioritisation',
    instruction:
      'Rank and compare the agents in this portfolio, recommending which to deploy in Phase 1 vs Phase 2.',
  },
];

export function AIInsightsPanel({
  user,
  activeResult,
  agentResults,
  tornado,
  viewScope,
  currency,
  exchangeRate,
}: AIInsightsPanelProps) {
  const [settings, setSettings] = useState<UserAISettings | null>(null);
  const [provider, setProvider] = useState<AIProvider>('openrouter');
  const [baseUrl, setBaseUrl] = useState('https://openrouter.ai/api/v1');
  const [model, setModel] = useState('openai/gpt-4o-mini');
  const [apiKey, setApiKey] = useState('');
  const [temperature, setTemperature] = useState(0.2);
  const [systemPrompt, setSystemPrompt] = useState('');

  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const [customQuestion, setCustomQuestion] = useState(QUICK_PROMPTS[0].instruction);
  const [generating, setGenerating] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [insightsResult, setInsightsResult] = useState<AIInsightsResponse | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    fetchAISettings()
      .then((s) => {
        if (!active) return;
        setSettings(s);
        setProvider(s.provider);
        setBaseUrl(s.baseUrl || PROVIDER_PRESETS[s.provider].baseUrl);
        setModel(s.model || PROVIDER_PRESETS[s.provider].model);
        setTemperature(s.temperature);
        setSystemPrompt(s.systemPrompt);
      })
      .catch(() => {
        // Ignore initial load error
      });
    return () => {
      active = false;
    };
  }, [user]);

  if (!user) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
        <Lock className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
        <h2 className="mt-3 text-sm font-semibold text-slate-900">Sign in to Configure Your AI</h2>
        <p className="mt-1 text-xs text-slate-500">
          Your AI provider credentials are encrypted and stored per user in PostgreSQL.
        </p>
        <Link
          to="/vault"
          className="mt-4 inline-flex items-center rounded-md bg-blue-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800"
        >
          Go to Sign in
        </Link>
      </div>
    );
  }

  const handleProviderChange = (next: AIProvider) => {
    setProvider(next);
    const preset = PROVIDER_PRESETS[next];
    setBaseUrl(preset.baseUrl);
    setModel(preset.model);
  };

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsMessage(null);
    setSettingsError(null);
    try {
      const saved = await saveAISettings({
        provider,
        baseUrl,
        model,
        temperature,
        systemPrompt,
        apiKey: apiKey.trim() || undefined,
      });
      setSettings(saved);
      setApiKey('');
      setSettingsMessage('AI provider configuration saved.');
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : 'Failed to save AI settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleClearKey = async () => {
    setSavingSettings(true);
    setSettingsMessage(null);
    setSettingsError(null);
    try {
      const saved = await saveAISettings({
        provider,
        baseUrl,
        model,
        temperature,
        systemPrompt,
        clearApiKey: true,
      });
      setSettings(saved);
      setSettingsMessage('Stored API key removed.');
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : 'Failed to clear API key.');
    } finally {
      setSavingSettings(false);
    }
  };

  const buildContextPrompt = (instruction: string): string => {
    const m = activeResult.metrics;
    const ranked = rankAgentsByROI(agentResults);
    const lines = [
      `Analysis Scope: ${viewScope === 'portfolio' ? 'Consolidated Portfolio' : activeResult.agentName}`,
      `Currency: ${currency} (1 USD = ${exchangeRate.toFixed(2)} SGD)`,
      `Cost per task (Baseline vs Agent all-in 36m): ${formatMoney(m.baselineCostPerTask, currency, exchangeRate, 2)} vs ${formatMoney(m.agentCostPerTask, currency, exchangeRate, 2)}`,
      `Variable agent cost per task: ${formatMoney(m.variableAgentCostPerTask, currency, exchangeRate, 2)}`,
      `Average monthly net saving: ${formatMoney(m.avgMonthlyNetSaving, currency, exchangeRate, 0)}`,
      `Steady-state monthly net saving (M36): ${formatMoney(m.steadyStateMonthlyNetSaving, currency, exchangeRate, 0)}`,
      `3-year net saving: ${formatMoney(m.totalNetSaving36m, currency, exchangeRate, 0)}`,
      `3-year total agent cost: ${formatMoney(m.totalAgentCost36m, currency, exchangeRate, 0)}`,
      `3-year ROI: ${formatPercent(m.roi3YearPct, 1)}`,
      `Payback period: ${m.paybackPeriodMonths !== null ? `${m.paybackPeriodMonths} months` : 'Greater than 36 months'}`,
      `Break-even volume: ${m.breakEvenVolume !== null ? `${formatNumber(m.breakEvenVolume)} tasks/month` : 'Unreachable'}`,
      `Capacity released (36m): ${formatNumber(m.totalHoursReleased36m, 0)} hours`,
      '',
      'Agent Ranking by 3-Year ROI:',
      ...ranked.map(
        (r, i) =>
          `${i + 1}. ${r.agentName}: ROI ${formatPercent(r.metrics.roi3YearPct, 1)}, 3Y Net Saving ${formatMoney(r.metrics.totalNetSaving36m, currency, exchangeRate, 0)}, Payback ${r.metrics.paybackPeriodMonths !== null ? `${r.metrics.paybackPeriodMonths}m` : '>36m'}`
      ),
      '',
      'Top Sensitivity Drivers (3-Year Net Saving Swing):',
      ...tornado.map(
        (t) =>
          `- ${t.lever}: Low (${t.lowLabel}) ${formatMoney(t.lowDelta, currency, exchangeRate, 0)} vs High (${t.highLabel}) ${formatMoney(t.highDelta, currency, exchangeRate, 0)}`
      ),
      '',
      `Request: ${instruction}`,
    ];
    return lines.join('\n');
  };

  const handleGenerate = async (instructionOverride?: string) => {
    const promptText = instructionOverride ?? customQuestion;
    if (!promptText.trim()) return;
    setGenerating(true);
    setInsightsError(null);
    try {
      const res = await generateInsights(buildContextPrompt(promptText));
      setInsightsResult(res);
    } catch (err) {
      setInsightsError(err instanceof Error ? err.message : 'Failed to generate insights.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!insightsResult) return;
    await navigator.clipboard.writeText(insightsResult.insights);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      {/* Left: AI Provider Configuration */}
      <div className="xl:col-span-5">
        <form
          onSubmit={handleSaveSettings}
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-5"
        >
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-blue-900" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-slate-900">Your AI Provider Settings</h2>
          </div>
          <p className="text-xs text-slate-500">
            Configure your preferred LLM provider. API keys are encrypted with AES-256-GCM at rest on the server.
          </p>

          <div>
            <label className="block text-xs font-medium text-slate-700">Provider</label>
            <select
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value as AIProvider)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-800 focus:outline-none"
            >
              {(Object.keys(PROVIDER_PRESETS) as AIProvider[]).map((key) => (
                <option key={key} value={key}>
                  {PROVIDER_PRESETS[key].label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">Model</label>
            <input
              type="text"
              required
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={PROVIDER_PRESETS[provider].model}
              className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-800 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">Base URL</label>
            <input
              type="url"
              required
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder={PROVIDER_PRESETS[provider].baseUrl}
              className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-800 focus:outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-slate-700">
                API Key {PROVIDER_PRESETS[provider].needsKey ? '' : '(optional for Ollama)'}
              </label>
              {settings?.hasApiKey && (
                <span className="text-[11px] font-medium text-emerald-700">
                  Saved ({settings.maskedApiKey})
                </span>
              )}
            </div>
            <div className="mt-1 flex gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={
                  settings?.hasApiKey
                    ? 'Leave blank to keep existing key'
                    : 'Paste your provider API key'
                }
                className="flex-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-800 focus:outline-none"
              />
              {settings?.hasApiKey && (
                <button
                  type="button"
                  onClick={handleClearKey}
                  className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700">
              <label htmlFor="ai-temp">Temperature</label>
              <span className="tabular-nums text-blue-900">{temperature.toFixed(1)}</span>
            </div>
            <input
              id="ai-temp"
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
              className="mt-1 w-full accent-blue-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">
              Custom focus instructions (optional)
            </label>
            <textarea
              rows={2}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="e.g. Prioritise MAS regulatory risk and conservative payback thresholds."
              className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-800 focus:outline-none"
            />
          </div>

          {settingsMessage && (
            <p className="rounded bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-700">
              {settingsMessage}
            </p>
          )}
          {settingsError && (
            <p role="alert" className="rounded bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
              {settingsError}
            </p>
          )}

          <button
            type="submit"
            disabled={savingSettings}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-blue-900 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" aria-hidden="true" />
            {savingSettings ? 'Saving...' : 'Save AI settings'}
          </button>
        </form>
      </div>

      {/* Right: Insights Generator */}
      <div className="space-y-4 xl:col-span-7">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-900" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-slate-900">Generate Executive Insights</h2>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Analyses your active {viewScope === 'portfolio' ? 'portfolio' : activeResult.agentName} P&amp;L metrics, agent rankings, and sensitivity drivers.
          </p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((qp) => (
              <button
                key={qp.label}
                type="button"
                onClick={() => {
                  setCustomQuestion(qp.instruction);
                  handleGenerate(qp.instruction);
                }}
                disabled={generating}
                className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40"
              >
                {qp.label}
              </button>
            ))}
          </div>

          <div className="mt-3">
            <label className="block text-xs font-medium text-slate-700">Prompt</label>
            <textarea
              rows={3}
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-2 text-xs text-slate-900 focus:border-blue-800 focus:outline-none"
            />
          </div>

          {insightsError && (
            <p role="alert" className="mt-3 rounded bg-red-50 px-3 py-2 text-xs text-red-700">
              {insightsError}
            </p>
          )}

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => handleGenerate()}
              disabled={generating || !customQuestion.trim()}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-900 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {generating ? 'Analysing P&L...' : 'Generate insights'}
            </button>
          </div>
        </div>

        {insightsResult && (
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">AI Executive Assessment</h3>
                <p className="text-[11px] text-slate-500">
                  {insightsResult.provider} · {insightsResult.model} ·{' '}
                  {new Date(insightsResult.generatedAt).toLocaleString('en-GB')}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 rounded border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <div className="ai-markdown mt-3 text-xs text-slate-800">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{insightsResult.insights}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
