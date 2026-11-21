import { rankAgentsByROI } from '../engine/calculations';
import type { AgentPLResult, Currency } from '../engine/types';
import { formatMoney, formatNumber, formatPercent } from '../utils/format';

interface PrintSummaryProps {
  activeResult: AgentPLResult;
  agentResults: AgentPLResult[];
  viewScope: 'agent' | 'portfolio';
  currency: Currency;
  exchangeRate: number;
}

const GENERATED_DATE = new Date().toLocaleDateString('en-GB');

export function PrintSummary({
  activeResult,
  agentResults,
  viewScope,
  currency,
  exchangeRate,
}: PrintSummaryProps) {
  const m = activeResult.metrics;
  const ranked = rankAgentsByROI(agentResults);

  const yearSlices = [
    { label: 'Year 1 (M1-M12)', rows: activeResult.monthly.slice(0, 12) },
    { label: 'Year 2 (M13-M24)', rows: activeResult.monthly.slice(12, 24) },
    { label: 'Year 3 (M25-M36)', rows: activeResult.monthly.slice(24, 36) },
    { label: '3-Year Total', rows: activeResult.monthly },
  ];

  const sumField = (
    rows: typeof activeResult.monthly,
    key:
      | 'baselineCost'
      | 'agentRunCost'
      | 'humanReviewCost'
      | 'fixedAndPlatformCost'
      | 'errorCost'
      | 'riskReserve'
      | 'netSaving'
  ) => rows.reduce((acc, r) => acc + r[key], 0);

  return (
    <div className="print-only space-y-5 text-slate-900">
      <div className="flex items-end justify-between border-b-2 border-slate-900 pb-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Agentic P&amp;L Executive Summary
          </h1>
          <p className="text-xs text-slate-600">
            Scope: {viewScope === 'portfolio' ? 'Consolidated Portfolio' : activeResult.agentName} · Currency: {currency} (1 USD = {exchangeRate.toFixed(2)} SGD)
          </p>
        </div>
        <p className="text-xs text-slate-500">
          Generated {GENERATED_DATE}
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded border border-slate-300 p-2.5">
          <p className="text-[10px] uppercase text-slate-500">Cost / Task (Base vs Agent)</p>
          <p className="mt-1 text-sm font-bold tabular-nums">
            {formatMoney(m.baselineCostPerTask, currency, exchangeRate, 2)} vs{' '}
            {formatMoney(m.agentCostPerTask, currency, exchangeRate, 2)}
          </p>
        </div>
        <div className="rounded border border-slate-300 p-2.5">
          <p className="text-[10px] uppercase text-slate-500">Avg Monthly Net Saving</p>
          <p className="mt-1 text-sm font-bold tabular-nums">
            {formatMoney(m.avgMonthlyNetSaving, currency, exchangeRate, 0)}
          </p>
        </div>
        <div className="rounded border border-slate-300 p-2.5">
          <p className="text-[10px] uppercase text-slate-500">Payback &amp; 3-Year ROI</p>
          <p className="mt-1 text-sm font-bold tabular-nums">
            {m.paybackPeriodMonths !== null ? `${m.paybackPeriodMonths} mo` : '> 36 mo'} ·{' '}
            {formatPercent(m.roi3YearPct, 1)}
          </p>
        </div>
        <div className="rounded border border-slate-300 p-2.5">
          <p className="text-[10px] uppercase text-slate-500">3-Year Net Saving</p>
          <p className="mt-1 text-sm font-bold tabular-nums">
            {formatMoney(m.totalNetSaving36m, currency, exchangeRate, 0)}
          </p>
        </div>
        <div className="rounded border border-slate-300 p-2.5">
          <p className="text-[10px] uppercase text-slate-500">Break-even Volume</p>
          <p className="mt-1 text-sm font-bold tabular-nums">
            {m.breakEvenVolume !== null ? `${formatNumber(m.breakEvenVolume)} / mo` : 'Unreachable'}
          </p>
        </div>
        <div className="rounded border border-slate-300 p-2.5">
          <p className="text-[10px] uppercase text-slate-500">Capacity Released (36m)</p>
          <p className="mt-1 text-sm font-bold tabular-nums">
            {formatNumber(m.totalHoursReleased36m, 0)} hrs
          </p>
        </div>
      </div>

      {/* Annual P&L Summary */}
      <div>
        <h2 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-700">
          36-Month P&amp;L Summary ({currency})
        </h2>
        <table className="w-full border-collapse text-xs tabular-nums">
          <thead>
            <tr className="border-b border-slate-400 bg-slate-100">
              <th className="py-1.5 px-2 text-left">P&amp;L Line</th>
              {yearSlices.map((s) => (
                <th key={s.label} className="py-1.5 px-2 text-right">
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {[
              { label: 'Baseline cost', key: 'baselineCost' as const },
              { label: 'Agent run cost', key: 'agentRunCost' as const },
              { label: 'Human review cost', key: 'humanReviewCost' as const },
              { label: 'Fixed and platform cost', key: 'fixedAndPlatformCost' as const },
              { label: 'Error cost', key: 'errorCost' as const },
              { label: 'Risk reserve', key: 'riskReserve' as const },
              { label: 'Net saving', key: 'netSaving' as const },
            ].map((line) => (
              <tr key={line.key} className={line.key === 'netSaving' ? 'font-bold bg-slate-50' : ''}>
                <td className="py-1.5 px-2">{line.label}</td>
                {yearSlices.map((s) => (
                  <td key={s.label} className="py-1.5 px-2 text-right">
                    {formatMoney(sumField(s.rows, line.key), currency, exchangeRate, 0)}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="font-bold border-t border-slate-400">
              <td className="py-1.5 px-2">Cumulative net saving (period end)</td>
              {yearSlices.map((s) => (
                <td key={s.label} className="py-1.5 px-2 text-right">
                  {formatMoney(
                    s.rows[s.rows.length - 1]?.cumulativeNetSaving ?? 0,
                    currency,
                    exchangeRate,
                    0
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Agent Ranking */}
      <div>
        <h2 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-700">
          Digital Workforce Ranking by 3-Year ROI
        </h2>
        <table className="w-full border-collapse text-xs tabular-nums">
          <thead>
            <tr className="border-b border-slate-400 bg-slate-100">
              <th className="py-1.5 px-2 text-left">Agent</th>
              <th className="py-1.5 px-2 text-right">3-Year ROI</th>
              <th className="py-1.5 px-2 text-right">3-Year Net Saving</th>
              <th className="py-1.5 px-2 text-right">Payback</th>
              <th className="py-1.5 px-2 text-right">Hours Released</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {ranked.map((r) => (
              <tr key={r.agentId}>
                <td className="py-1.5 px-2 font-medium">{r.agentName}</td>
                <td className="py-1.5 px-2 text-right">{formatPercent(r.metrics.roi3YearPct, 1)}</td>
                <td className="py-1.5 px-2 text-right">
                  {formatMoney(r.metrics.totalNetSaving36m, currency, exchangeRate, 0)}
                </td>
                <td className="py-1.5 px-2 text-right">
                  {r.metrics.paybackPeriodMonths !== null
                    ? `${r.metrics.paybackPeriodMonths} mo`
                    : '> 36 mo'}
                </td>
                <td className="py-1.5 px-2 text-right">
                  {formatNumber(r.metrics.totalHoursReleased36m, 0)} hrs
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="border-t border-slate-200 pt-2 text-right text-[10px] text-slate-500">
        Agentic P&amp;L Calculator · Ian Loe, Tactics Solutions
      </p>
    </div>
  );
}
