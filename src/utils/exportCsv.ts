import { convertCurrency } from '../engine/calculations';
import type { AgentPLResult, Currency } from '../engine/types';

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function exportPLToCsv(
  result: AgentPLResult,
  horizon: 12 | 36,
  currency: Currency,
  exchangeRate: number
): void {
  const rows = result.monthly.slice(0, horizon);
  const c = (usd: number) => convertCurrency(usd, currency, exchangeRate).toFixed(2);

  const headers = [
    'Month',
    'Adoption (%)',
    'Automated Tasks',
    `Baseline Cost (${currency})`,
    `Agent Run Cost (${currency})`,
    `Human Review Cost (${currency})`,
    `Fixed & Platform Cost (${currency})`,
    `Error Cost (${currency})`,
    `Risk Reserve (${currency})`,
    `Total Agent Cost (${currency})`,
    `Net Saving (${currency})`,
    `Cumulative Net Saving (${currency})`,
    'Hours Released',
  ];

  const csvRows = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((r) =>
      [
        r.month,
        r.adoptionPct.toFixed(1),
        Math.round(r.automatedTasks),
        c(r.baselineCost),
        c(r.agentRunCost),
        c(r.humanReviewCost),
        c(r.fixedAndPlatformCost),
        c(r.errorCost),
        c(r.riskReserve),
        c(r.totalAgentCost),
        c(r.netSaving),
        c(r.cumulativeNetSaving),
        r.hoursReleased.toFixed(1),
      ]
        .map(escapeCsvCell)
        .join(',')
    ),
  ];

  const sum = (fn: (r: (typeof rows)[number]) => number) =>
    rows.reduce((acc, r) => acc + fn(r), 0);

  const totalRow = [
    `Total (${horizon}m)`,
    '',
    Math.round(sum((r) => r.automatedTasks)),
    c(sum((r) => r.baselineCost)),
    c(sum((r) => r.agentRunCost)),
    c(sum((r) => r.humanReviewCost)),
    c(sum((r) => r.fixedAndPlatformCost)),
    c(sum((r) => r.errorCost)),
    c(sum((r) => r.riskReserve)),
    c(sum((r) => r.totalAgentCost)),
    c(sum((r) => r.netSaving)),
    c(rows[rows.length - 1]?.cumulativeNetSaving ?? 0),
    sum((r) => r.hoursReleased).toFixed(1),
  ].join(',');

  csvRows.push(totalRow);

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeName = result.agentName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  link.href = url;
  link.download = `agentic-pl-${safeName}-${horizon}m-${currency}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
