import { AlertTriangle, Copy, Plus, Trash2 } from 'lucide-react';
import { convertCurrency, fromCurrencyInput, validateAgentInput } from '../engine/calculations';
import type { AgentInput, Currency } from '../engine/types';
import { Toggletip } from './Toggletip';

interface AgentInputPanelProps {
  agents: AgentInput[];
  selectedAgentId: string;
  onSelectAgent: (id: string) => void;
  onUpdateAgent: (updated: AgentInput) => void;
  onAddAgent: () => void;
  onDuplicateAgent: (id: string) => void;
  onRemoveAgent: (id: string) => void;
  currency: Currency;
  exchangeRate: number;
}

const RAMP_PRESETS: Array<{ label: string; values: number[] }> = [
  { label: 'Fast (3m)', values: [40, 75, 95, 95, 95, 95, 95, 95, 95, 95, 95, 95] },
  { label: 'Standard (6m)', values: [20, 35, 50, 65, 80, 90, 95, 95, 95, 95, 95, 95] },
  { label: 'Gradual (12m)', values: [10, 18, 25, 35, 45, 55, 65, 72, 80, 85, 90, 95] },
];

export function AgentInputPanel({
  agents,
  selectedAgentId,
  onSelectAgent,
  onUpdateAgent,
  onAddAgent,
  onDuplicateAgent,
  onRemoveAgent,
  currency,
  exchangeRate,
}: AgentInputPanelProps) {
  const agent = agents.find((a) => a.id === selectedAgentId) ?? agents[0];
  const warnings = validateAgentInput(agent);

  const setField = <K extends keyof AgentInput>(key: K, value: AgentInput[K]) => {
    onUpdateAgent({ ...agent, [key]: value });
  };

  const setMoneyField = (key: keyof AgentInput, displayValue: number) => {
    const safeVal = Number.isFinite(displayValue) ? Math.max(0, displayValue) : 0;
    onUpdateAgent({
      ...agent,
      [key]: fromCurrencyInput(safeVal, currency, exchangeRate),
    });
  };

  const getMoneyDisplay = (usdValue: number, decimals = 2): string => {
    const val = convertCurrency(usdValue, currency, exchangeRate);
    return Number(val.toFixed(decimals)).toString();
  };

  const setRampMonth = (index: number, val: number) => {
    const next = [...agent.adoptionRamp];
    next[index] = Math.min(100, Math.max(0, Number.isFinite(val) ? val : 0));
    onUpdateAgent({ ...agent, adoptionRamp: next });
  };

  return (
    <div className="space-y-5">
      {/* Agent Selector */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">
            Digital Workforce ({agents.length}/10)
          </h2>
          <button
            type="button"
            onClick={onAddAgent}
            disabled={agents.length >= 10}
            className="inline-flex items-center gap-1 rounded-md bg-blue-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add agent
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {agents.map((a) => {
            const active = a.id === agent.id;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => onSelectAgent(a.id)}
                className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? 'border-blue-900 bg-blue-50 text-blue-900'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {a.name || 'Unnamed agent'}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-100 pt-2.5">
          <button
            type="button"
            onClick={() => onDuplicateAgent(agent.id)}
            disabled={agents.length >= 10}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
          >
            <Copy className="h-3 w-3" aria-hidden="true" />
            Duplicate
          </button>
          <button
            type="button"
            onClick={() => onRemoveAgent(agent.id)}
            disabled={agents.length <= 1}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="h-3 w-3" aria-hidden="true" />
            Remove
          </button>
        </div>
      </div>

      {/* Validation Warnings */}
      {warnings.length > 0 && (
        <div
          role="status"
          className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950"
        >
          {warnings.map((w, i) => (
            <div key={`${w.field}-${i}`} className="flex items-start gap-2">
              <AlertTriangle
                className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                  w.severity === 'error' ? 'text-red-700' : 'text-amber-700'
                }`}
                aria-hidden="true"
              />
              <span>{w.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* 1. Role & Volume */}
      <fieldset className="rounded-lg border border-slate-200 bg-white p-4">
        <legend className="px-1 text-xs font-semibold tracking-wide text-slate-700 uppercase">
          1. Agent Role &amp; Volume
        </legend>
        <div className="mt-2 space-y-3">
          <div>
            <label className="flex items-center text-xs font-medium text-slate-700">
              Agent name
              <Toggletip
                label="Agent name"
                text="Short name for the digital worker role (for example, Invoice Processing)."
              />
            </label>
            <input
              type="text"
              value={agent.name}
              onChange={(e) => setField('name', e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900 focus:border-blue-800 focus:outline-none"
            />
          </div>

          <div>
            <label className="flex items-center text-xs font-medium text-slate-700">
              Description
              <Toggletip
                label="Description"
                text="Brief summary of the workflow, systems integrated, and business outcome."
              />
            </label>
            <textarea
              rows={2}
              value={agent.description}
              onChange={(e) => setField('description', e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900 focus:border-blue-800 focus:outline-none"
            />
          </div>

          <div>
            <label className="flex items-center text-xs font-medium text-slate-700">
              Task volume per month
              <Toggletip
                label="Task volume per month"
                text="Total monthly transactions or cases eligible for this agent at 100% adoption."
              />
            </label>
            <input
              type="number"
              min={0}
              step={100}
              value={agent.tasksPerMonth}
              onChange={(e) => setField('tasksPerMonth', Math.max(0, Number(e.target.value)))}
              className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm tabular-nums text-slate-900 focus:border-blue-800 focus:outline-none"
            />
          </div>
        </div>
      </fieldset>

      {/* 2. Baseline Process */}
      <fieldset className="rounded-lg border border-slate-200 bg-white p-4">
        <legend className="px-1 text-xs font-semibold tracking-wide text-slate-700 uppercase">
          2. Human Baseline
        </legend>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="flex items-center text-xs font-medium text-slate-700">
              Human minutes / task
              <Toggletip
                label="Human minutes per task"
                text="Average handling time in minutes for a human worker to complete one task."
              />
            </label>
            <input
              type="number"
              min={0}
              step={0.5}
              value={agent.humanMinutesPerTask}
              onChange={(e) =>
                setField('humanMinutesPerTask', Math.max(0, Number(e.target.value)))
              }
              className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm tabular-nums text-slate-900 focus:border-blue-800 focus:outline-none"
            />
          </div>

          <div>
            <label className="flex items-center text-xs font-medium text-slate-700">
              Loaded hourly cost ({currency})
              <Toggletip
                label="Loaded hourly cost"
                text="Fully loaded hourly labour cost (salary, benefits, payroll taxes, and workspace overhead)."
              />
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={getMoneyDisplay(agent.loadedHourlyCost, 2)}
              onChange={(e) => setMoneyField('loadedHourlyCost', Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm tabular-nums text-slate-900 focus:border-blue-800 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="flex items-center text-xs font-medium text-slate-700">
              Baseline rework / error rate (%)
              <Toggletip
                label="Baseline rework rate"
                text="Percentage of human-completed tasks requiring rework, increasing effective baseline handling time."
              />
            </label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={agent.baselineErrorRate}
              onChange={(e) =>
                setField('baselineErrorRate', Math.min(100, Math.max(0, Number(e.target.value))))
              }
              className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm tabular-nums text-slate-900 focus:border-blue-800 focus:outline-none"
            />
          </div>
        </div>
      </fieldset>

      {/* 3. Agent Run Cost */}
      <fieldset className="rounded-lg border border-slate-200 bg-white p-4">
        <legend className="px-1 text-xs font-semibold tracking-wide text-slate-700 uppercase">
          3. Agent Model &amp; Tooling
        </legend>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="flex items-center text-xs font-medium text-slate-700">
              Input tokens / call
              <Toggletip
                label="Input tokens per call"
                text="Average prompt and context tokens sent per model call (multiplied by model calls per task)."
              />
            </label>
            <input
              type="number"
              min={0}
              step={100}
              value={agent.inputTokensPerTask}
              onChange={(e) => setField('inputTokensPerTask', Math.max(0, Number(e.target.value)))}
              className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm tabular-nums text-slate-900 focus:border-blue-800 focus:outline-none"
            />
          </div>

          <div>
            <label className="flex items-center text-xs font-medium text-slate-700">
              Output tokens / call
              <Toggletip
                label="Output tokens per call"
                text="Average generated tokens per model call (multiplied by model calls per task)."
              />
            </label>
            <input
              type="number"
              min={0}
              step={50}
              value={agent.outputTokensPerTask}
              onChange={(e) =>
                setField('outputTokensPerTask', Math.max(0, Number(e.target.value)))
              }
              className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm tabular-nums text-slate-900 focus:border-blue-800 focus:outline-none"
            />
          </div>

          <div>
            <label className="flex items-center text-xs font-medium text-slate-700">
              Input price / 1M ({currency})
              <Toggletip
                label="Input token price"
                text="Provider price per one million input tokens."
              />
            </label>
            <input
              type="number"
              min={0}
              step={0.1}
              value={getMoneyDisplay(agent.inputTokenPricePerMillion, 2)}
              onChange={(e) => setMoneyField('inputTokenPricePerMillion', Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm tabular-nums text-slate-900 focus:border-blue-800 focus:outline-none"
            />
          </div>

          <div>
            <label className="flex items-center text-xs font-medium text-slate-700">
              Output price / 1M ({currency})
              <Toggletip
                label="Output token price"
                text="Provider price per one million output tokens."
              />
            </label>
            <input
              type="number"
              min={0}
              step={0.5}
              value={getMoneyDisplay(agent.outputTokenPricePerMillion, 2)}
              onChange={(e) => setMoneyField('outputTokenPricePerMillion', Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm tabular-nums text-slate-900 focus:border-blue-800 focus:outline-none"
            />
          </div>

          <div>
            <label className="flex items-center text-xs font-medium text-slate-700">
              Model calls / task
              <Toggletip
                label="Model calls per task"
                text="Average number of LLM inference steps (planning, extraction, verification) per task."
              />
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={agent.modelCallsPerTask}
              onChange={(e) => setField('modelCallsPerTask', Math.max(0, Number(e.target.value)))}
              className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm tabular-nums text-slate-900 focus:border-blue-800 focus:outline-none"
            />
          </div>

          <div>
            <label className="flex items-center text-xs font-medium text-slate-700">
              Tool / API cost / task ({currency})
              <Toggletip
                label="Tool or API cost per task"
                text="External API, OCR, vector search, or third-party data fee incurred per task."
              />
            </label>
            <input
              type="number"
              min={0}
              step={0.005}
              value={getMoneyDisplay(agent.toolCostPerTask, 4)}
              onChange={(e) => setMoneyField('toolCostPerTask', Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm tabular-nums text-slate-900 focus:border-blue-800 focus:outline-none"
            />
          </div>
        </div>
      </fieldset>

      {/* 4. Human-in-the-loop */}
      <fieldset className="rounded-lg border border-slate-200 bg-white p-4">
        <legend className="px-1 text-xs font-semibold tracking-wide text-slate-700 uppercase">
          4. Human-in-the-Loop Review
        </legend>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="flex items-center text-xs font-medium text-slate-700">
              Tasks needing review (%)
              <Toggletip
                label="Review rate"
                text="Percentage of agent-processed tasks escalated for human approval or exception handling."
              />
            </label>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={agent.reviewRate}
              onChange={(e) =>
                setField('reviewRate', Math.min(100, Math.max(0, Number(e.target.value))))
              }
              className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm tabular-nums text-slate-900 focus:border-blue-800 focus:outline-none"
            />
          </div>

          <div>
            <label className="flex items-center text-xs font-medium text-slate-700">
              Minutes per review
              <Toggletip
                label="Minutes per review"
                text="Average human minutes spent reviewing and signing off an escalated task."
              />
            </label>
            <input
              type="number"
              min={0}
              step={0.5}
              value={agent.reviewMinutesPerTask}
              onChange={(e) =>
                setField('reviewMinutesPerTask', Math.max(0, Number(e.target.value)))
              }
              className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm tabular-nums text-slate-900 focus:border-blue-800 focus:outline-none"
            />
          </div>
        </div>
      </fieldset>

      {/* 5. Fixed & Platform Costs */}
      <fieldset className="rounded-lg border border-slate-200 bg-white p-4">
        <legend className="px-1 text-xs font-semibold tracking-wide text-slate-700 uppercase">
          5. Fixed &amp; Platform Costs
        </legend>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="flex items-center text-xs font-medium text-slate-700">
              One-time build ({currency})
              <Toggletip
                label="Build cost"
                text="Upfront engineering, prompt design, evaluation, and testing cost recognised in Month 1."
              />
            </label>
            <input
              type="number"
              min={0}
              step={500}
              value={getMoneyDisplay(agent.buildCost, 0)}
              onChange={(e) => setMoneyField('buildCost', Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm tabular-nums text-slate-900 focus:border-blue-800 focus:outline-none"
            />
          </div>

          <div>
            <label className="flex items-center text-xs font-medium text-slate-700">
              Integration cost ({currency})
              <Toggletip
                label="Integration cost"
                text="One-time ERP, CRM, or security integration cost recognised in Month 1."
              />
            </label>
            <input
              type="number"
              min={0}
              step={500}
              value={getMoneyDisplay(agent.integrationCost, 0)}
              onChange={(e) => setMoneyField('integrationCost', Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm tabular-nums text-slate-900 focus:border-blue-800 focus:outline-none"
            />
          </div>

          <div>
            <label className="flex items-center text-xs font-medium text-slate-700">
              Monthly platform ({currency})
              <Toggletip
                label="Monthly platform cost"
                text="Recurring hosting, orchestration, vector database, and runtime infrastructure cost."
              />
            </label>
            <input
              type="number"
              min={0}
              step={50}
              value={getMoneyDisplay(agent.monthlyPlatformCost, 0)}
              onChange={(e) => setMoneyField('monthlyPlatformCost', Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm tabular-nums text-slate-900 focus:border-blue-800 focus:outline-none"
            />
          </div>

          <div>
            <label className="flex items-center text-xs font-medium text-slate-700">
              Monitoring &amp; gov ({currency}/mo)
              <Toggletip
                label="Monitoring and governance cost"
                text="Monthly observability, guardrails, audit logging, and compliance tooling cost."
              />
            </label>
            <input
              type="number"
              min={0}
              step={50}
              value={getMoneyDisplay(agent.monthlyMonitoringCost, 0)}
              onChange={(e) => setMoneyField('monthlyMonitoringCost', Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm tabular-nums text-slate-900 focus:border-blue-800 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="flex items-center text-xs font-medium text-slate-700">
              Support &amp; maintenance ({currency}/mo)
              <Toggletip
                label="Support and maintenance cost"
                text="Ongoing engineering support, prompt tuning, and model upgrade maintenance per month."
              />
            </label>
            <input
              type="number"
              min={0}
              step={50}
              value={getMoneyDisplay(agent.monthlySupportCost, 0)}
              onChange={(e) => setMoneyField('monthlySupportCost', Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm tabular-nums text-slate-900 focus:border-blue-800 focus:outline-none"
            />
          </div>
        </div>
      </fieldset>

      {/* 6. Quality, Risk Reserve & Adoption Ramp */}
      <fieldset className="rounded-lg border border-slate-200 bg-white p-4">
        <legend className="px-1 text-xs font-semibold tracking-wide text-slate-700 uppercase">
          6. Quality, Risk &amp; Adoption Ramp
        </legend>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="flex items-center text-xs font-medium text-slate-700">
              Agent error rate (%)
              <Toggletip
                label="Agent error rate"
                text="Percentage of automated tasks that result in a material error or exception."
              />
            </label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={agent.agentErrorRate}
              onChange={(e) =>
                setField('agentErrorRate', Math.min(100, Math.max(0, Number(e.target.value))))
              }
              className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm tabular-nums text-slate-900 focus:border-blue-800 focus:outline-none"
            />
          </div>

          <div>
            <label className="flex items-center text-xs font-medium text-slate-700">
              Cost / error ({currency})
              <Toggletip
                label="Cost per error"
                text="Average remediation, credit note, or operational cost of a single agent error."
              />
            </label>
            <input
              type="number"
              min={0}
              step={5}
              value={getMoneyDisplay(agent.costPerError, 0)}
              onChange={(e) => setMoneyField('costPerError', Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm tabular-nums text-slate-900 focus:border-blue-800 focus:outline-none"
            />
          </div>

          <div>
            <label className="flex items-center text-xs font-medium text-slate-700">
              Risk reserve (%)
              <Toggletip
                label="Risk reserve"
                text="Percentage of agent run cost held back each month for incidents, rate spikes, and model drift."
              />
            </label>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={agent.riskReserveRate}
              onChange={(e) =>
                setField('riskReserveRate', Math.min(100, Math.max(0, Number(e.target.value))))
              }
              className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm tabular-nums text-slate-900 focus:border-blue-800 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center text-xs font-medium text-slate-700">
              Adoption ramp (% volume, Months 1 to 12)
              <Toggletip
                label="Adoption ramp"
                text="Share of monthly volume handled by the agent during Year 1. Months 13 to 36 continue at the Month 12 rate."
              />
            </span>
            <div className="flex gap-1">
              {RAMP_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setField('adoptionRamp', [...preset.values])}
                  className="rounded border border-slate-200 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-2 grid grid-cols-4 gap-1.5 sm:grid-cols-6">
            {agent.adoptionRamp.map((pct, idx) => (
              <label key={idx} className="block text-[11px] text-slate-500">
                M{idx + 1}
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={pct}
                  onChange={(e) => setRampMonth(idx, Number(e.target.value))}
                  className="mt-0.5 w-full rounded border border-slate-300 px-1.5 py-1 text-xs tabular-nums text-slate-900 focus:border-blue-800 focus:outline-none"
                />
              </label>
            ))}
          </div>
        </div>
      </fieldset>
    </div>
  );
}
