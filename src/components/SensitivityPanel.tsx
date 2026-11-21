import { RotateCcw } from 'lucide-react';
import { DEFAULT_SENSITIVITY } from '../engine/calculations';
import type { AgentMetrics, Currency, SensitivitySettings } from '../engine/types';
import { formatMoney, formatPercent } from '../utils/format';

interface SensitivityPanelProps {
  sensitivity: SensitivitySettings;
  onChange: (next: SensitivitySettings) => void;
  baseMetrics: AgentMetrics;
  adjustedMetrics: AgentMetrics;
  currency: Currency;
  exchangeRate: number;
}

export function SensitivityPanel({
  sensitivity,
  onChange,
  baseMetrics,
  adjustedMetrics,
  currency,
  exchangeRate,
}: SensitivityPanelProps) {
  const delta36m = adjustedMetrics.totalNetSaving36m - baseMetrics.totalNetSaving36m;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Live Sensitivity Stress-Test</h3>
          <p className="text-xs text-slate-500">
            Adjust assumptions below to see immediate impact across the P&amp;L, KPI cards, and charts.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange(DEFAULT_SENSITIVITY)}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Reset levers
        </button>
      </div>

      {/* Live Impact Comparison */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
          <p className="text-xs text-slate-500">Unadjusted 3-Year Net Saving</p>
          <p className="mt-1 text-base font-semibold tabular-nums text-slate-900">
            {formatMoney(baseMetrics.totalNetSaving36m, currency, exchangeRate, 0)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3.5">
          <p className="text-xs text-slate-500">Stressed 3-Year Net Saving</p>
          <p
            className={`mt-1 text-base font-semibold tabular-nums ${
              adjustedMetrics.totalNetSaving36m >= 0 ? 'text-emerald-700' : 'text-red-700'
            }`}
          >
            {formatMoney(adjustedMetrics.totalNetSaving36m, currency, exchangeRate, 0)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3.5">
          <p className="text-xs text-slate-500">Variance vs Base</p>
          <p
            className={`mt-1 text-base font-semibold tabular-nums ${
              delta36m >= 0 ? 'text-emerald-700' : 'text-red-700'
            }`}
          >
            {delta36m >= 0 ? '+' : ''}
            {formatMoney(delta36m, currency, exchangeRate, 0)} ({formatPercent(adjustedMetrics.roi3YearPct, 1)} ROI)
          </p>
        </div>
      </div>

      {/* Sliders */}
      <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
        <div>
          <div className="flex justify-between text-xs font-medium text-slate-700">
            <label htmlFor="sens-volume">Task volume multiplier</label>
            <span className="tabular-nums text-blue-900">
              {Math.round(sensitivity.volumeMultiplier * 100)}%
            </span>
          </div>
          <input
            id="sens-volume"
            type="range"
            min={0.5}
            max={1.5}
            step={0.05}
            value={sensitivity.volumeMultiplier}
            onChange={(e) =>
              onChange({ ...sensitivity, volumeMultiplier: Number(e.target.value) })
            }
            className="mt-1.5 w-full accent-blue-900"
          />
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>50%</span>
            <span>100%</span>
            <span>150%</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs font-medium text-slate-700">
            <label htmlFor="sens-token">Token price multiplier</label>
            <span className="tabular-nums text-blue-900">
              {Math.round(sensitivity.tokenPriceMultiplier * 100)}%
            </span>
          </div>
          <input
            id="sens-token"
            type="range"
            min={0.25}
            max={2.0}
            step={0.05}
            value={sensitivity.tokenPriceMultiplier}
            onChange={(e) =>
              onChange({ ...sensitivity, tokenPriceMultiplier: Number(e.target.value) })
            }
            className="mt-1.5 w-full accent-blue-900"
          />
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>25%</span>
            <span>100%</span>
            <span>200%</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs font-medium text-slate-700">
            <label htmlFor="sens-review">Human review rate shift</label>
            <span className="tabular-nums text-blue-900">
              {sensitivity.reviewRateDelta >= 0 ? '+' : ''}
              {sensitivity.reviewRateDelta} pp
            </span>
          </div>
          <input
            id="sens-review"
            type="range"
            min={-30}
            max={30}
            step={1}
            value={sensitivity.reviewRateDelta}
            onChange={(e) =>
              onChange({ ...sensitivity, reviewRateDelta: Number(e.target.value) })
            }
            className="mt-1.5 w-full accent-blue-900"
          />
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>-30 pp</span>
            <span>0 pp</span>
            <span>+30 pp</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs font-medium text-slate-700">
            <label htmlFor="sens-error">Agent error rate shift</label>
            <span className="tabular-nums text-blue-900">
              {sensitivity.errorRateDelta >= 0 ? '+' : ''}
              {sensitivity.errorRateDelta} pp
            </span>
          </div>
          <input
            id="sens-error"
            type="range"
            min={-10}
            max={20}
            step={0.5}
            value={sensitivity.errorRateDelta}
            onChange={(e) =>
              onChange({ ...sensitivity, errorRateDelta: Number(e.target.value) })
            }
            className="mt-1.5 w-full accent-blue-900"
          />
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>-10 pp</span>
            <span>0 pp</span>
            <span>+20 pp</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs font-medium text-slate-700">
            <label htmlFor="sens-adoption">Adoption ramp speed</label>
            <span className="tabular-nums text-blue-900">
              {sensitivity.adoptionSpeedMultiplier.toFixed(2)}x
            </span>
          </div>
          <input
            id="sens-adoption"
            type="range"
            min={0.5}
            max={1.5}
            step={0.05}
            value={sensitivity.adoptionSpeedMultiplier}
            onChange={(e) =>
              onChange({ ...sensitivity, adoptionSpeedMultiplier: Number(e.target.value) })
            }
            className="mt-1.5 w-full accent-blue-900"
          />
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>0.5x (Slower)</span>
            <span>1.0x</span>
            <span>1.5x (Faster)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
