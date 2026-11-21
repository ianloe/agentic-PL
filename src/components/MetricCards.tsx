import type { AgentMetrics, Currency } from '../engine/types';
import { formatMoney, formatNumber, formatPercent } from '../utils/format';

interface MetricCardsProps {
  metrics: AgentMetrics;
  currency: Currency;
  exchangeRate: number;
}

export function MetricCards({ metrics, currency, exchangeRate }: MetricCardsProps) {
  const isPositiveMonthly = metrics.avgMonthlyNetSaving >= 0;
  const isPositiveRoi = metrics.roi3YearPct >= 0;

  return (
    <section aria-label="Key financial metrics" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
          Cost per task (Baseline vs Agent)
        </p>
        <div className="mt-1.5 flex items-baseline gap-2 tabular-nums">
          <span className="text-lg font-semibold text-slate-900">
            {formatMoney(metrics.baselineCostPerTask, currency, exchangeRate, 2)}
          </span>
          <span className="text-xs text-slate-400">vs</span>
          <span className="text-lg font-semibold text-blue-900">
            {formatMoney(metrics.agentCostPerTask, currency, exchangeRate, 2)}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500 tabular-nums">
          Variable run rate: {formatMoney(metrics.variableAgentCostPerTask, currency, exchangeRate, 2)} / task
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
          Net saving per month
        </p>
        <p
          className={`mt-1.5 text-xl font-semibold tabular-nums ${
            isPositiveMonthly ? 'text-emerald-700' : 'text-red-700'
          }`}
        >
          {formatMoney(metrics.avgMonthlyNetSaving, currency, exchangeRate, 0)}
        </p>
        <p className="mt-1 text-xs text-slate-500 tabular-nums">
          Steady state (M36):{' '}
          <span
            className={
              metrics.steadyStateMonthlyNetSaving >= 0 ? 'text-emerald-700' : 'text-red-700'
            }
          >
            {formatMoney(metrics.steadyStateMonthlyNetSaving, currency, exchangeRate, 0)}
          </span>
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
          Payback period
        </p>
        <p className="mt-1.5 text-xl font-semibold text-slate-900 tabular-nums">
          {metrics.paybackPeriodMonths !== null
            ? `${metrics.paybackPeriodMonths} ${metrics.paybackPeriodMonths === 1 ? 'month' : 'months'}`
            : '> 36 months'}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {metrics.paybackPeriodMonths !== null
            ? 'First month cumulative net saving turns positive'
            : 'Does not pay back within 36 months'}
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
          3-year ROI
        </p>
        <p
          className={`mt-1.5 text-xl font-semibold tabular-nums ${
            isPositiveRoi ? 'text-emerald-700' : 'text-red-700'
          }`}
        >
          {formatPercent(metrics.roi3YearPct, 1)}
        </p>
        <p className="mt-1 text-xs text-slate-500 tabular-nums">
          36-mo net saving:{' '}
          <span className={metrics.totalNetSaving36m >= 0 ? 'text-emerald-700' : 'text-red-700'}>
            {formatMoney(metrics.totalNetSaving36m, currency, exchangeRate, 0)}
          </span>
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
          Break-even volume
        </p>
        <p className="mt-1.5 text-xl font-semibold text-slate-900 tabular-nums">
          {metrics.breakEvenVolume !== null
            ? `${formatNumber(metrics.breakEvenVolume)} tasks/mo`
            : 'Unreachable'}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {metrics.breakEvenVolume !== null
            ? 'Monthly volume to cover ongoing fixed costs'
            : 'Variable cost exceeds baseline cost per task'}
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
          Capacity released
        </p>
        <p className="mt-1.5 text-xl font-semibold text-slate-900 tabular-nums">
          {formatNumber(metrics.totalHoursReleased36m, 0)} hrs
        </p>
        <p className="mt-1 text-xs text-slate-500 tabular-nums">
          Steady state: {formatNumber(metrics.monthlyHoursReleasedSteadyState, 0)} hrs/mo
        </p>
      </div>
    </section>
  );
}
