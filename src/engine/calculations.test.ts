import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SENSITIVITY,
  applySensitivity,
  calculateAgentPL,
  calculatePortfolioPL,
  calculateTornadoSensitivity,
  convertCurrency,
  fromCurrencyInput,
  rankAgentsByROI,
  validateAgentInput,
} from './calculations';
import { DEMO_AGENTS } from './demoData';
import type { AgentInput } from './types';

describe('Agentic P&L Calculation Engine', () => {
  it('reconciles every monthly P&L line and cumulative net saving across 36 months', () => {
    for (const agent of DEMO_AGENTS) {
      const result = calculateAgentPL(agent);
      expect(result.monthly).toHaveLength(36);

      let runningCumulative = 0;
      for (const row of result.monthly) {
        const expectedTotalAgentCost =
          row.agentRunCost +
          row.humanReviewCost +
          row.fixedAndPlatformCost +
          row.errorCost +
          row.riskReserve;

        expect(row.totalAgentCost).toBeCloseTo(expectedTotalAgentCost, 8);
        expect(row.netSaving).toBeCloseTo(row.baselineCost - row.totalAgentCost, 8);

        runningCumulative += row.netSaving;
        expect(row.cumulativeNetSaving).toBeCloseTo(runningCumulative, 8);
      }

      expect(result.metrics.totalNetSaving36m).toBeCloseTo(runningCumulative, 8);
      expect(result.monthly[35].cumulativeNetSaving).toBeCloseTo(
        result.metrics.totalNetSaving36m,
        8
      );
    }
  });

  it('calculates exact unit economics for a controlled test agent', () => {
    const testAgent: AgentInput = {
      id: 'test-1',
      name: 'Test Agent',
      description: 'Controlled test',
      tasksPerMonth: 1000,
      humanMinutesPerTask: 12,
      loadedHourlyCost: 60, // $1/min -> $12/task before rework
      baselineErrorRate: 0, // $12/task
      inputTokensPerTask: 1_000_000,
      outputTokensPerTask: 0,
      inputTokenPricePerMillion: 2,
      outputTokenPricePerMillion: 0,
      modelCallsPerTask: 1,
      toolCostPerTask: 0.5, // $2.50 run cost per task
      reviewRate: 10, // 10%
      reviewMinutesPerTask: 6, // 0.1 * 6 / 60 * 60 = $0.60 review cost per task
      buildCost: 5000,
      integrationCost: 1000,
      monthlyPlatformCost: 200,
      monthlyMonitoringCost: 100,
      monthlySupportCost: 100, // $400/mo ongoing; $6400 in Month 1
      agentErrorRate: 2, // 2%
      costPerError: 50, // $1.00 error cost per task
      adoptionRamp: Array(12).fill(100),
      riskReserveRate: 20, // 20% of $2.50 = $0.50 per task
    };

    const res = calculateAgentPL(testAgent);
    expect(res.metrics.baselineCostPerTask).toBeCloseTo(12, 8);
    expect(res.metrics.variableAgentCostPerTask).toBeCloseTo(2.5 + 0.6 + 1.0 + 0.5, 8); // 4.60

    // Month 1: 1000 * 12 = 12000 baseline; 1000 * 4.60 + 6400 = 11000 agent cost -> +1000 net saving
    expect(res.monthly[0].baselineCost).toBeCloseTo(12000, 8);
    expect(res.monthly[0].fixedAndPlatformCost).toBeCloseTo(6400, 8);
    expect(res.monthly[0].netSaving).toBeCloseTo(1000, 8);
    expect(res.metrics.paybackPeriodMonths).toBe(1);

    // Month 2: 1000 * 12 - (4600 + 400) = 7000
    expect(res.monthly[1].netSaving).toBeCloseTo(7000, 8);
    expect(res.monthly[1].cumulativeNetSaving).toBeCloseTo(8000, 8);

    // Break-even volume: 400 / (12 - 4.6) = 54.05 -> ceil = 55
    expect(res.metrics.breakEvenVolume).toBe(55);
  });

  it('reconciles portfolio roll-up as the exact sum of individual agents', () => {
    const portfolio = calculatePortfolioPL(DEMO_AGENTS);
    const individual = DEMO_AGENTS.map((a) => calculateAgentPL(a));

    let runningCumulative = 0;
    for (let i = 0; i < 36; i++) {
      const sumBaseline = individual.reduce((s, r) => s + r.monthly[i].baselineCost, 0);
      const sumAgentRun = individual.reduce((s, r) => s + r.monthly[i].agentRunCost, 0);
      const sumReview = individual.reduce((s, r) => s + r.monthly[i].humanReviewCost, 0);
      const sumFixed = individual.reduce((s, r) => s + r.monthly[i].fixedAndPlatformCost, 0);
      const sumError = individual.reduce((s, r) => s + r.monthly[i].errorCost, 0);
      const sumRisk = individual.reduce((s, r) => s + r.monthly[i].riskReserve, 0);
      const sumNet = individual.reduce((s, r) => s + r.monthly[i].netSaving, 0);

      expect(portfolio.monthly[i].baselineCost).toBeCloseTo(sumBaseline, 8);
      expect(portfolio.monthly[i].agentRunCost).toBeCloseTo(sumAgentRun, 8);
      expect(portfolio.monthly[i].humanReviewCost).toBeCloseTo(sumReview, 8);
      expect(portfolio.monthly[i].fixedAndPlatformCost).toBeCloseTo(sumFixed, 8);
      expect(portfolio.monthly[i].errorCost).toBeCloseTo(sumError, 8);
      expect(portfolio.monthly[i].riskReserve).toBeCloseTo(sumRisk, 8);
      expect(portfolio.monthly[i].netSaving).toBeCloseTo(sumNet, 8);

      runningCumulative += sumNet;
      expect(portfolio.monthly[i].cumulativeNetSaving).toBeCloseTo(runningCumulative, 8);
    }

    expect(portfolio.metrics.totalNetSaving36m).toBeCloseTo(runningCumulative, 8);
  });

  it('ranks agents by 3-year ROI descending', () => {
    const results = DEMO_AGENTS.map((a) => calculateAgentPL(a));
    const ranked = rankAgentsByROI(results);
    expect(ranked[0].metrics.roi3YearPct).toBeGreaterThanOrEqual(ranked[1].metrics.roi3YearPct);
    expect(ranked[1].metrics.roi3YearPct).toBeGreaterThanOrEqual(ranked[2].metrics.roi3YearPct);
  });

  it('computes tornado sensitivity sorted by swing descending', () => {
    const tornado = calculateTornadoSensitivity(DEMO_AGENTS, DEFAULT_SENSITIVITY);
    expect(tornado).toHaveLength(5);
    for (let i = 0; i < tornado.length - 1; i++) {
      expect(tornado[i].swing).toBeGreaterThanOrEqual(tornado[i + 1].swing);
    }
  });

  it('applies sensitivity multipliers and deltas with clamping', () => {
    const adjusted = applySensitivity(DEMO_AGENTS[0], {
      volumeMultiplier: 1.5,
      tokenPriceMultiplier: 0.5,
      reviewRateDelta: 100,
      errorRateDelta: -50,
      adoptionSpeedMultiplier: 1.2,
    });
    expect(adjusted.tasksPerMonth).toBe(DEMO_AGENTS[0].tasksPerMonth * 1.5);
    expect(adjusted.reviewRate).toBe(100);
    expect(adjusted.agentErrorRate).toBe(0);
  });

  it('flags assistant warning when review rate exceeds 50%', () => {
    const highReviewAgent: AgentInput = {
      ...DEMO_AGENTS[0],
      reviewRate: 60,
    };
    const warnings = validateAgentInput(highReviewAgent);
    expect(warnings.some((w) => w.field === 'reviewRate' && w.severity === 'warning')).toBe(true);
  });

  it('converts between USD and SGD cleanly without drift', () => {
    const usd = 1000;
    const sgd = convertCurrency(usd, 'SGD', 1.35);
    expect(sgd).toBeCloseTo(1350, 8);
    expect(fromCurrencyInput(sgd, 'SGD', 1.35)).toBeCloseTo(usd, 8);
  });
});
