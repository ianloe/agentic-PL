import { Copy, FolderOpen, Save, Trash2 } from 'lucide-react';
import { calculatePortfolioPL } from '../engine/calculations';
import type { Currency, SavedScenario } from '../engine/types';
import { formatMoney, formatNumber, formatPercent } from '../utils/format';

interface ScenariosPanelProps {
  scenarios: SavedScenario[];
  onSaveScenario: (name: 'Conservative' | 'Base' | 'Optimistic') => void;
  onLoadScenario: (id: string) => void;
  onDuplicateScenario: (id: string) => void;
  onDeleteScenario: (id: string) => void;
  currency: Currency;
  exchangeRate: number;
}

const PRESET_NAMES: Array<'Conservative' | 'Base' | 'Optimistic'> = [
  'Conservative',
  'Base',
  'Optimistic',
];

export function ScenariosPanel({
  scenarios,
  onSaveScenario,
  onLoadScenario,
  onDuplicateScenario,
  onDeleteScenario,
  currency,
  exchangeRate,
}: ScenariosPanelProps) {
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Scenario Comparison ({scenarios.length}/3 saved)
            </h3>
            <p className="text-xs text-slate-500">
              Save up to 3 named portfolio snapshots (Conservative, Base, Optimistic) to compare side by side.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {PRESET_NAMES.map((preset) => {
              const exists = scenarios.some((s) => s.name === preset);
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onSaveScenario(preset)}
                  disabled={!exists && scenarios.length >= 3}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Save className="h-3.5 w-3.5 text-blue-900" aria-hidden="true" />
                  {exists ? `Overwrite ${preset}` : `Save ${preset}`}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {scenarios.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="text-sm font-medium text-slate-700">No saved scenarios yet</p>
          <p className="mt-1 text-xs text-slate-500">
            Adjust your agents or sensitivity sliders, then click Save Conservative, Save Base, or Save Optimistic above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {scenarios.map((scenario) => {
            const pl = calculatePortfolioPL(scenario.agents, scenario.sensitivity);
            const m = pl.metrics;
            return (
              <div
                key={scenario.id}
                className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">{scenario.name}</h4>
                      <p className="text-[11px] text-slate-400">
                        {scenario.agents.length} agents · Saved{' '}
                        {new Date(scenario.savedAt).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                  </div>

                  <dl className="mt-3 space-y-2 text-xs tabular-nums">
                    <div className="flex justify-between">
                      <dt className="text-slate-500">3-year net saving</dt>
                      <dd
                        className={`font-semibold ${
                          m.totalNetSaving36m >= 0 ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {formatMoney(m.totalNetSaving36m, currency, exchangeRate, 0)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">3-year ROI</dt>
                      <dd
                        className={`font-semibold ${
                          m.roi3YearPct >= 0 ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {formatPercent(m.roi3YearPct, 1)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Payback period</dt>
                      <dd className="font-medium text-slate-900">
                        {m.paybackPeriodMonths !== null ? `${m.paybackPeriodMonths} mo` : '> 36 mo'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Avg monthly saving</dt>
                      <dd className="font-medium text-slate-900">
                        {formatMoney(m.avgMonthlyNetSaving, currency, exchangeRate, 0)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Agent cost / task</dt>
                      <dd className="font-medium text-slate-900">
                        {formatMoney(m.agentCostPerTask, currency, exchangeRate, 2)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Capacity released (36m)</dt>
                      <dd className="font-medium text-slate-900">
                        {formatNumber(m.totalHoursReleased36m, 0)} hrs
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => onLoadScenario(scenario.id)}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded bg-blue-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-800"
                  >
                    <FolderOpen className="h-3 w-3" aria-hidden="true" />
                    Load
                  </button>
                  <button
                    type="button"
                    onClick={() => onDuplicateScenario(scenario.id)}
                    disabled={scenarios.length >= 3}
                    title="Duplicate scenario into current workspace"
                    className="inline-flex items-center justify-center gap-1 rounded border border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <Copy className="h-3 w-3" aria-hidden="true" />
                    Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteScenario(scenario.id)}
                    aria-label={`Delete ${scenario.name} scenario`}
                    className="inline-flex items-center justify-center rounded border border-slate-200 p-1.5 text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
