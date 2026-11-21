import { Download } from 'lucide-react';
import { useState } from 'react';
import type { AgentPLResult, Currency, MonthlyPLRow } from '../engine/types';
import { exportPLToCsv } from '../utils/exportCsv';
import { formatMoney, formatNumber, formatPercent } from '../utils/format';

interface PLTableProps {
  result: AgentPLResult;
  currency: Currency;
  exchangeRate: number;
}

type LineKey =
  | 'baselineCost'
  | 'agentRunCost'
  | 'humanReviewCost'
  | 'fixedAndPlatformCost'
  | 'errorCost'
  | 'riskReserve'
  | 'netSaving'
  | 'cumulativeNetSaving';

interface LineDefinition {
  key: LineKey;
  label: string;
  isCost?: boolean;
  isSaving?: boolean;
  isCumulative?: boolean;
}

const PL_LINES: LineDefinition[] = [
  { key: 'baselineCost', label: 'Baseline cost' },
  { key: 'agentRunCost', label: 'Agent run cost', isCost: true },
  { key: 'humanReviewCost', label: 'Human review cost', isCost: true },
  { key: 'fixedAndPlatformCost', label: 'Fixed and platform cost', isCost: true },
  { key: 'errorCost', label: 'Error cost', isCost: true },
  { key: 'riskReserve', label: 'Risk reserve', isCost: true },
  { key: 'netSaving', label: 'Net saving', isSaving: true },
  { key: 'cumulativeNetSaving', label: 'Cumulative net saving', isCumulative: true },
];

export function PLTable({ result, currency, exchangeRate }: PLTableProps) {
  const [horizon, setHorizon] = useState<12 | 36>(12);
  const rows: MonthlyPLRow[] = result.monthly.slice(0, horizon);

  const getTotal = (line: LineDefinition): number => {
    if (line.isCumulative) {
      return rows[rows.length - 1]?.cumulativeNetSaving ?? 0;
    }
    return rows.reduce((acc, r) => acc + r[line.key], 0);
  };

  const getValueClass = (val: number, line: LineDefinition): string => {
    if (line.isSaving || line.isCumulative) {
      if (val > 0.0001) return 'text-emerald-700 font-semibold';
      if (val < -0.0001) return 'text-red-700 font-semibold';
      return 'text-slate-700 font-semibold';
    }
    if (line.isCost) {
      return 'text-slate-700';
    }
    return 'text-slate-900 font-medium';
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
          <button
            type="button"
            onClick={() => setHorizon(12)}
            className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
              horizon === 12
                ? 'bg-white text-blue-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            12 months
          </button>
          <button
            type="button"
            onClick={() => setHorizon(36)}
            className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
              horizon === 36
                ? 'bg-white text-blue-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            36 months
          </button>
        </div>

        <button
          type="button"
          onClick={() => exportPLToCsv(result, horizon, currency, exchangeRate)}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          Export CSV ({horizon}m)
        </button>
      </div>

      <div
        tabIndex={0}
        role="region"
        aria-labelledby="pl-table-caption"
        className="pl-table-wrapper"
      >
        <table className="pl-table text-xs">
          <caption id="pl-table-caption" className="sr-only">
            Monthly profit and loss statement for {result.agentName} over {horizon} months
          </caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="min-w-[190px] border-r border-slate-200 px-3 py-2.5 text-left font-semibold text-slate-900"
              >
                P&amp;L Line ({currency})
              </th>
              <th
                scope="col"
                className="min-w-[110px] border-r border-slate-200 bg-slate-100 px-3 py-2.5 text-right font-semibold text-slate-900"
              >
                Total ({horizon}m)
              </th>
              {rows.map((r) => (
                <th
                  key={r.month}
                  scope="col"
                  className="min-w-[96px] px-3 py-2.5 text-right font-medium text-slate-700"
                >
                  M{r.month}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr className="text-slate-500">
              <th scope="row" className="px-3 py-2 font-normal text-slate-500">
                Adoption / Automated tasks
              </th>
              <td className="border-r border-slate-200 bg-slate-50/70 px-3 py-2 text-right font-medium text-slate-700">
                {formatNumber(
                  rows.reduce((s, r) => s + r.automatedTasks, 0),
                  0
                )}
              </td>
              {rows.map((r) => (
                <td key={r.month} className="px-3 py-2 text-right">
                  {formatPercent(r.adoptionPct, 0)}
                </td>
              ))}
            </tr>

            {PL_LINES.map((line) => {
              const total = getTotal(line);
              const isHighlight = line.isSaving || line.isCumulative;
              return (
                <tr
                  key={line.key}
                  className={isHighlight ? 'pl-row-highlight border-t border-slate-200' : ''}
                >
                  <th
                    scope="row"
                    className={`px-3 py-2.5 ${
                      isHighlight ? 'font-semibold text-slate-900' : 'font-medium text-slate-800'
                    }`}
                  >
                    {line.label}
                  </th>
                  <td
                    className={`border-r border-slate-200 bg-slate-50/70 px-3 py-2.5 text-right ${getValueClass(
                      total,
                      line
                    )}`}
                  >
                    {formatMoney(total, currency, exchangeRate, 0)}
                  </td>
                  {rows.map((r) => {
                    const val = r[line.key];
                    return (
                      <td
                        key={r.month}
                        className={`px-3 py-2.5 text-right ${getValueClass(val, line)}`}
                      >
                        {formatMoney(val, currency, exchangeRate, 0)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
