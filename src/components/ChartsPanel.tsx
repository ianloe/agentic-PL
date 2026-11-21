import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { convertCurrency } from '../engine/calculations';
import type { AgentPLResult, Currency, TornadoItem } from '../engine/types';
import { formatCompactMoney, formatMoney } from '../utils/format';

interface ChartsPanelProps {
  result: AgentPLResult;
  tornado: TornadoItem[];
  currency: Currency;
  exchangeRate: number;
}

export function ChartsPanel({ result, tornado, currency, exchangeRate }: ChartsPanelProps) {
  const c = (usd: number) => Number(convertCurrency(usd, currency, exchangeRate).toFixed(2));

  const cashFlowData = result.monthly.map((r) => ({
    month: `M${r.month}`,
    monthNum: r.month,
    cumulativeNetSaving: c(r.cumulativeNetSaving),
    netSaving: c(r.netSaving),
  }));

  const costData = result.monthly.map((r) => ({
    month: `M${r.month}`,
    baselineCost: c(r.baselineCost),
    agentRunCost: c(r.agentRunCost),
    humanReviewCost: c(r.humanReviewCost),
    fixedAndPlatformCost: c(r.fixedAndPlatformCost),
    errorCost: c(r.errorCost),
    riskReserve: c(r.riskReserve),
  }));

  const tornadoData = tornado.map((t) => ({
    lever: t.lever,
    lowDelta: c(t.lowDelta),
    highDelta: c(t.highDelta),
    lowLabel: t.lowLabel,
    highLabel: t.highLabel,
  }));

  const paybackMonth = result.metrics.paybackPeriodMonths;
  const paybackPoint =
    paybackMonth !== null ? cashFlowData.find((d) => d.monthNum === paybackMonth) : undefined;

  const formatAxis = (displayVal: number) => {
    const usdEquiv = currency === 'SGD' ? displayVal / exchangeRate : displayVal;
    return formatCompactMoney(usdEquiv, currency, exchangeRate);
  };

  const formatTooltipMoney = (displayVal: number) => {
    const usdEquiv = currency === 'SGD' ? displayVal / exchangeRate : displayVal;
    return formatMoney(usdEquiv, currency, exchangeRate, 0);
  };

  return (
    <div className="space-y-6">
      {/* 1. Cumulative Cash Flow with Break-Even */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Cumulative Cash Flow (36 Months)
            </h3>
            <p className="text-xs text-slate-500">
              Cumulative net saving over time ({currency}). Break-even is marked where the curve crosses zero.
            </p>
          </div>
          {paybackMonth !== null && (
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-900">
              Break-even: Month {paybackMonth}
            </span>
          )}
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cashFlowData} margin={{ top: 10, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#475569' }} interval={2} />
              <YAxis tickFormatter={formatAxis} tick={{ fontSize: 11, fill: '#475569' }} width={76} />
              <Tooltip
                formatter={(value) => [formatTooltipMoney(Number(value)), 'Cumulative Net Saving']}
                contentStyle={{ fontSize: 12, borderRadius: 6, borderColor: '#cbd5e1' }}
              />
              <ReferenceLine y={0} stroke="#64748b" strokeDasharray="4 4" />
              {paybackPoint && (
                <ReferenceLine
                  x={paybackPoint.month}
                  stroke="#1e3a8a"
                  strokeDasharray="3 3"
                  label={{
                    value: `Payback M${paybackPoint.monthNum}`,
                    position: 'top',
                    fill: '#1e3a8a',
                    fontSize: 11,
                  }}
                />
              )}
              <Area
                type="monotone"
                dataKey="cumulativeNetSaving"
                stroke="#1e3a8a"
                strokeWidth={2}
                fill="#dbeafe"
                fillOpacity={0.55}
              />
              {paybackPoint && (
                <ReferenceDot
                  x={paybackPoint.month}
                  y={paybackPoint.cumulativeNetSaving}
                  r={5}
                  fill="#1e3a8a"
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Stacked Bar of Cost Composition by Month */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-slate-900">
            Monthly Cost Composition vs Baseline
          </h3>
          <p className="text-xs text-slate-500">
            Stacked agent-side costs compared against the equivalent human baseline cost ({currency}).
          </p>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={costData} margin={{ top: 10, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#475569' }} interval={2} />
              <YAxis tickFormatter={formatAxis} tick={{ fontSize: 11, fill: '#475569' }} width={76} />
              <Tooltip
                formatter={(value, name) => [formatTooltipMoney(Number(value)), String(name)]}
                contentStyle={{ fontSize: 12, borderRadius: 6, borderColor: '#cbd5e1' }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="agentRunCost" name="Agent run" stackId="cost" fill="#1e3a8a" />
              <Bar dataKey="humanReviewCost" name="Human review" stackId="cost" fill="#3b82f6" />
              <Bar dataKey="fixedAndPlatformCost" name="Fixed & platform" stackId="cost" fill="#64748b" />
              <Bar dataKey="errorCost" name="Error cost" stackId="cost" fill="#dc2626" />
              <Bar dataKey="riskReserve" name="Risk reserve" stackId="cost" fill="#f59e0b" />
              <Line
                type="monotone"
                dataKey="baselineCost"
                name="Baseline cost"
                stroke="#0f172a"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Tornado Chart of Sensitivity */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-slate-900">
            Sensitivity Tornado (Impact on 3-Year Net Saving)
          </h3>
          <p className="text-xs text-slate-500">
            Change in 36-month portfolio net saving ({currency}) when each lever is varied individually.
          </p>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={tornadoData}
              layout="vertical"
              margin={{ top: 5, right: 24, left: 24, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tickFormatter={formatAxis} tick={{ fontSize: 11, fill: '#475569' }} />
              <YAxis
                type="category"
                dataKey="lever"
                width={120}
                tick={{ fontSize: 11, fill: '#0f172a' }}
              />
              <Tooltip
                formatter={(value, name) => [formatTooltipMoney(Number(value)), String(name)]}
                contentStyle={{ fontSize: 12, borderRadius: 6, borderColor: '#cbd5e1' }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine x={0} stroke="#475569" />
              <Bar dataKey="lowDelta" name="Low case delta" fill="#94a3b8" radius={[2, 2, 2, 2]} />
              <Bar dataKey="highDelta" name="High case delta" fill="#1e3a8a" radius={[2, 2, 2, 2]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
