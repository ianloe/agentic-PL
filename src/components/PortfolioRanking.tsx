import { rankAgentsByROI } from '../engine/calculations';
import type { AgentPLResult, Currency } from '../engine/types';
import { formatMoney, formatNumber, formatPercent } from '../utils/format';

interface PortfolioRankingProps {
  agentResults: AgentPLResult[];
  currency: Currency;
  exchangeRate: number;
  onSelectAgent: (id: string) => void;
}

export function PortfolioRanking({
  agentResults,
  currency,
  exchangeRate,
  onSelectAgent,
}: PortfolioRankingProps) {
  const ranked = rankAgentsByROI(agentResults);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-900">Portfolio Ranking by 3-Year ROI</h3>
        <p className="text-xs text-slate-500">
          Select any agent row to inspect or edit its assumptions in the left panel.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs tabular-nums">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2 pr-3 font-medium">Rank</th>
              <th className="py-2 pr-3 font-medium">Agent</th>
              <th className="py-2 px-3 text-right font-medium">3-Year ROI</th>
              <th className="py-2 px-3 text-right font-medium">3-Year Net Saving</th>
              <th className="py-2 px-3 text-right font-medium">Payback</th>
              <th className="py-2 pl-3 text-right font-medium">Hours Released</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ranked.map((r, idx) => (
              <tr
                key={r.agentId}
                onClick={() => onSelectAgent(r.agentId)}
                className="cursor-pointer hover:bg-slate-50"
              >
                <td className="py-2.5 pr-3 font-semibold text-slate-500">#{idx + 1}</td>
                <td className="py-2.5 pr-3 font-medium text-blue-900 underline-offset-2 hover:underline">
                  {r.agentName || 'Unnamed agent'}
                </td>
                <td
                  className={`py-2.5 px-3 text-right font-semibold ${
                    r.metrics.roi3YearPct >= 0 ? 'text-emerald-700' : 'text-red-700'
                  }`}
                >
                  {formatPercent(r.metrics.roi3YearPct, 1)}
                </td>
                <td
                  className={`py-2.5 px-3 text-right font-semibold ${
                    r.metrics.totalNetSaving36m >= 0 ? 'text-emerald-700' : 'text-red-700'
                  }`}
                >
                  {formatMoney(r.metrics.totalNetSaving36m, currency, exchangeRate, 0)}
                </td>
                <td className="py-2.5 px-3 text-right text-slate-700">
                  {r.metrics.paybackPeriodMonths !== null
                    ? `${r.metrics.paybackPeriodMonths} mo`
                    : '> 36 mo'}
                </td>
                <td className="py-2.5 pl-3 text-right text-slate-700">
                  {formatNumber(r.metrics.totalHoursReleased36m, 0)} hrs
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
