import type {
  AgentInput,
  AgentMetrics,
  AgentPLResult,
  Currency,
  MonthlyPLRow,
  SensitivitySettings,
  TornadoItem,
  ValidationWarning,
} from './types';

export const DEFAULT_SENSITIVITY: SensitivitySettings = {
  volumeMultiplier: 1.0,
  tokenPriceMultiplier: 1.0,
  reviewRateDelta: 0,
  errorRateDelta: 0,
  adoptionSpeedMultiplier: 1.0,
};

export const HORIZON_MONTHS = 36;

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function convertCurrency(
  amountUsd: number,
  currency: Currency,
  exchangeRate: number
): number {
  const safeRate = exchangeRate > 0 ? exchangeRate : 1.35;
  return currency === 'SGD' ? amountUsd * safeRate : amountUsd;
}

export function fromCurrencyInput(
  displayAmount: number,
  currency: Currency,
  exchangeRate: number
): number {
  const safeRate = exchangeRate > 0 ? exchangeRate : 1.35;
  return currency === 'SGD' ? displayAmount / safeRate : displayAmount;
}

/**
 * Interpolates the 12-month adoption ramp under an adoption speed multiplier.
 * At 1.0x speed, month m (1..12) returns ramp[m - 1] exactly.
 */
function getAdjustedAdoptionPct(
  ramp: number[],
  month: number,
  speedMultiplier: number
): number {
  const safeRamp = ramp.length === 12 ? ramp : Array(12).fill(100);
  if (month > 12 && speedMultiplier >= 1) {
    return clamp(safeRamp[11], 0, 100);
  }
  const t = clamp((month - 1) * speedMultiplier, 0, 11);
  const lo = Math.floor(t);
  const hi = Math.min(11, Math.ceil(t));
  const frac = t - lo;
  const interpolated = safeRamp[lo] * (1 - frac) + safeRamp[hi] * frac;
  return clamp(interpolated, 0, 100);
}

/**
 * Applies sensitivity levers to an AgentInput without mutating the original.
 */
export function applySensitivity(
  agent: AgentInput,
  sensitivity: SensitivitySettings = DEFAULT_SENSITIVITY
): AgentInput {
  const adjustedRamp = Array.from({ length: 12 }, (_, idx) =>
    getAdjustedAdoptionPct(agent.adoptionRamp, idx + 1, sensitivity.adoptionSpeedMultiplier)
  );

  return {
    ...agent,
    tasksPerMonth: Math.max(0, agent.tasksPerMonth * sensitivity.volumeMultiplier),
    inputTokenPricePerMillion: Math.max(
      0,
      agent.inputTokenPricePerMillion * sensitivity.tokenPriceMultiplier
    ),
    outputTokenPricePerMillion: Math.max(
      0,
      agent.outputTokenPricePerMillion * sensitivity.tokenPriceMultiplier
    ),
    reviewRate: clamp(agent.reviewRate + sensitivity.reviewRateDelta, 0, 100),
    agentErrorRate: clamp(agent.agentErrorRate + sensitivity.errorRateDelta, 0, 100),
    adoptionRamp: adjustedRamp,
  };
}

/**
 * Computes unit economics and a 36-month P&L statement for a single agent.
 */
export function calculateAgentPL(
  rawAgent: AgentInput,
  sensitivity: SensitivitySettings = DEFAULT_SENSITIVITY
): AgentPLResult {
  const agent = applySensitivity(rawAgent, sensitivity);

  // Baseline unit cost: human minutes scaled by rework rate
  const effectiveBaselineMinutesPerTask =
    agent.humanMinutesPerTask * (1 + clamp(agent.baselineErrorRate, 0, 100) / 100);
  const baselineCostPerTask =
    (effectiveBaselineMinutesPerTask / 60) * Math.max(0, agent.loadedHourlyCost);

  // Agent token & tool run cost per task
  const inputTokenCostPerCall =
    (Math.max(0, agent.inputTokensPerTask) / 1_000_000) *
    Math.max(0, agent.inputTokenPricePerMillion);
  const outputTokenCostPerCall =
    (Math.max(0, agent.outputTokensPerTask) / 1_000_000) *
    Math.max(0, agent.outputTokenPricePerMillion);
  const calls = Math.max(0, agent.modelCallsPerTask);
  const agentRunCostPerTask =
    (inputTokenCostPerCall + outputTokenCostPerCall) * calls +
    Math.max(0, agent.toolCostPerTask);

  // Human-in-the-loop review cost per automated task
  const reviewFraction = clamp(agent.reviewRate, 0, 100) / 100;
  const reviewMinutesPerAutomatedTask = reviewFraction * Math.max(0, agent.reviewMinutesPerTask);
  const humanReviewCostPerTask =
    (reviewMinutesPerAutomatedTask / 60) * Math.max(0, agent.loadedHourlyCost);

  // Error cost & risk reserve per automated task
  const errorCostPerTask =
    (clamp(agent.agentErrorRate, 0, 100) / 100) * Math.max(0, agent.costPerError);
  const riskReservePerTask =
    agentRunCostPerTask * (clamp(agent.riskReserveRate, 0, 100) / 100);

  const variableAgentCostPerTask =
    agentRunCostPerTask + humanReviewCostPerTask + errorCostPerTask + riskReservePerTask;

  const ongoingMonthlyFixed =
    Math.max(0, agent.monthlyPlatformCost) +
    Math.max(0, agent.monthlyMonitoringCost) +
    Math.max(0, agent.monthlySupportCost);
  const oneTimeFixed =
    Math.max(0, agent.buildCost) + Math.max(0, agent.integrationCost);

  const monthly: MonthlyPLRow[] = [];
  let cumulativeNetSaving = 0;

  for (let m = 1; m <= HORIZON_MONTHS; m++) {
    const adoptionPct = getAdjustedAdoptionPct(
      rawAgent.adoptionRamp,
      m,
      sensitivity.adoptionSpeedMultiplier
    );
    const automatedTasks = agent.tasksPerMonth * (adoptionPct / 100);

    const baselineCost = automatedTasks * baselineCostPerTask;
    const agentRunCost = automatedTasks * agentRunCostPerTask;
    const humanReviewCost = automatedTasks * humanReviewCostPerTask;
    const fixedAndPlatformCost =
      m === 1 ? oneTimeFixed + ongoingMonthlyFixed : ongoingMonthlyFixed;
    const errorCost = automatedTasks * errorCostPerTask;
    const riskReserve = automatedTasks * riskReservePerTask;

    const totalAgentCost =
      agentRunCost + humanReviewCost + fixedAndPlatformCost + errorCost + riskReserve;
    const netSaving = baselineCost - totalAgentCost;
    cumulativeNetSaving += netSaving;

    const netMinutesSavedPerTask =
      effectiveBaselineMinutesPerTask - reviewMinutesPerAutomatedTask;
    const hoursReleased = (automatedTasks * netMinutesSavedPerTask) / 60;

    monthly.push({
      month: m,
      adoptionPct,
      automatedTasks,
      baselineCost,
      agentRunCost,
      humanReviewCost,
      fixedAndPlatformCost,
      errorCost,
      riskReserve,
      totalAgentCost,
      netSaving,
      cumulativeNetSaving,
      hoursReleased,
    });
  }

  const metrics = summarizeMonthlyPL(
    monthly,
    baselineCostPerTask,
    variableAgentCostPerTask,
    ongoingMonthlyFixed,
    agent.adoptionRamp[11] ?? 100
  );

  return {
    agentId: rawAgent.id,
    agentName: rawAgent.name,
    monthly,
    metrics,
  };
}

function summarizeMonthlyPL(
  monthly: MonthlyPLRow[],
  baselineCostPerTask: number,
  variableAgentCostPerTask: number,
  ongoingMonthlyFixed: number,
  steadyStateAdoptionPct: number
): AgentMetrics {
  const totalBaselineCost36m = monthly.reduce((acc, r) => acc + r.baselineCost, 0);
  const totalAgentCost36m = monthly.reduce((acc, r) => acc + r.totalAgentCost, 0);
  const totalNetSaving36m = monthly.reduce((acc, r) => acc + r.netSaving, 0);
  const totalAutomatedTasks36m = monthly.reduce((acc, r) => acc + r.automatedTasks, 0);
  const totalHoursReleased36m = monthly.reduce((acc, r) => acc + r.hoursReleased, 0);

  const agentCostPerTask =
    totalAutomatedTasks36m > 0 ? totalAgentCost36m / totalAutomatedTasks36m : 0;

  const avgMonthlyNetSaving = totalNetSaving36m / HORIZON_MONTHS;
  const steadyStateMonthlyNetSaving = monthly[HORIZON_MONTHS - 1]?.netSaving ?? 0;
  const monthlyHoursReleasedSteadyState = monthly[HORIZON_MONTHS - 1]?.hoursReleased ?? 0;

  const paybackRow = monthly.find((r) => r.cumulativeNetSaving >= 0);
  const paybackPeriodMonths = paybackRow ? paybackRow.month : null;

  const roi3YearPct =
    totalAgentCost36m > 0 ? (totalNetSaving36m / totalAgentCost36m) * 100 : 0;

  const unitContribution = baselineCostPerTask - variableAgentCostPerTask;
  const steadyAdoptionFraction = clamp(steadyStateAdoptionPct, 0, 100) / 100;
  const breakEvenVolume =
    unitContribution > 0 && steadyAdoptionFraction > 0
      ? Math.ceil(ongoingMonthlyFixed / (unitContribution * steadyAdoptionFraction))
      : null;

  return {
    baselineCostPerTask,
    agentCostPerTask,
    variableAgentCostPerTask,
    avgMonthlyNetSaving,
    steadyStateMonthlyNetSaving,
    paybackPeriodMonths,
    roi3YearPct,
    breakEvenVolume,
    totalHoursReleased36m,
    monthlyHoursReleasedSteadyState,
    totalBaselineCost36m,
    totalAgentCost36m,
    totalNetSaving36m,
  };
}

/**
 * Rolls up multiple agents into a single consolidated portfolio P&L.
 */
export function calculatePortfolioPL(
  agents: AgentInput[],
  sensitivity: SensitivitySettings = DEFAULT_SENSITIVITY
): AgentPLResult {
  if (agents.length === 0) {
    const emptyMonthly: MonthlyPLRow[] = Array.from({ length: HORIZON_MONTHS }, (_, i) => ({
      month: i + 1,
      adoptionPct: 0,
      automatedTasks: 0,
      baselineCost: 0,
      agentRunCost: 0,
      humanReviewCost: 0,
      fixedAndPlatformCost: 0,
      errorCost: 0,
      riskReserve: 0,
      totalAgentCost: 0,
      netSaving: 0,
      cumulativeNetSaving: 0,
      hoursReleased: 0,
    }));
    return {
      agentId: 'portfolio',
      agentName: 'All Agents (Portfolio)',
      monthly: emptyMonthly,
      metrics: summarizeMonthlyPL(emptyMonthly, 0, 0, 0, 0),
    };
  }

  const agentResults = agents.map((a) => calculateAgentPL(a, sensitivity));
  const monthly: MonthlyPLRow[] = [];
  let cumulativeNetSaving = 0;

  for (let i = 0; i < HORIZON_MONTHS; i++) {
    let automatedTasks = 0;
    let baselineCost = 0;
    let agentRunCost = 0;
    let humanReviewCost = 0;
    let fixedAndPlatformCost = 0;
    let errorCost = 0;
    let riskReserve = 0;
    let hoursReleased = 0;
    let totalPotentialTasks = 0;

    for (let aIdx = 0; aIdx < agentResults.length; aIdx++) {
      const row = agentResults[aIdx].monthly[i];
      automatedTasks += row.automatedTasks;
      baselineCost += row.baselineCost;
      agentRunCost += row.agentRunCost;
      humanReviewCost += row.humanReviewCost;
      fixedAndPlatformCost += row.fixedAndPlatformCost;
      errorCost += row.errorCost;
      riskReserve += row.riskReserve;
      hoursReleased += row.hoursReleased;
      totalPotentialTasks += agents[aIdx].tasksPerMonth * sensitivity.volumeMultiplier;
    }

    const totalAgentCost =
      agentRunCost + humanReviewCost + fixedAndPlatformCost + errorCost + riskReserve;
    const netSaving = baselineCost - totalAgentCost;
    cumulativeNetSaving += netSaving;
    const adoptionPct =
      totalPotentialTasks > 0 ? clamp((automatedTasks / totalPotentialTasks) * 100, 0, 100) : 0;

    monthly.push({
      month: i + 1,
      adoptionPct,
      automatedTasks,
      baselineCost,
      agentRunCost,
      humanReviewCost,
      fixedAndPlatformCost,
      errorCost,
      riskReserve,
      totalAgentCost,
      netSaving,
      cumulativeNetSaving,
      hoursReleased,
    });
  }

  const totalAutomatedTasks36m = monthly.reduce((acc, r) => acc + r.automatedTasks, 0);
  const totalBaselineCost36m = monthly.reduce((acc, r) => acc + r.baselineCost, 0);
  const baselineCostPerTask =
    totalAutomatedTasks36m > 0 ? totalBaselineCost36m / totalAutomatedTasks36m : 0;

  const totalVariable36m = monthly.reduce(
    (acc, r) => acc + r.agentRunCost + r.humanReviewCost + r.errorCost + r.riskReserve,
    0
  );
  const variableAgentCostPerTask =
    totalAutomatedTasks36m > 0 ? totalVariable36m / totalAutomatedTasks36m : 0;

  const ongoingMonthlyFixed = agents.reduce(
    (acc, a) =>
      acc +
      Math.max(0, a.monthlyPlatformCost) +
      Math.max(0, a.monthlyMonitoringCost) +
      Math.max(0, a.monthlySupportCost),
    0
  );

  const steadyAdoptionPct = monthly[HORIZON_MONTHS - 1]?.adoptionPct ?? 0;

  return {
    agentId: 'portfolio',
    agentName: 'All Agents (Portfolio)',
    monthly,
    metrics: summarizeMonthlyPL(
      monthly,
      baselineCostPerTask,
      variableAgentCostPerTask,
      ongoingMonthlyFixed,
      steadyAdoptionPct
    ),
  };
}

/**
 * Ranks individual agent P&L results by 3-year ROI descending.
 */
export function rankAgentsByROI(results: AgentPLResult[]): AgentPLResult[] {
  return [...results].sort((a, b) => b.metrics.roi3YearPct - a.metrics.roi3YearPct);
}

/**
 * Computes one-at-a-time tornado sensitivity on 3-year net saving across the 5 key levers.
 */
export function calculateTornadoSensitivity(
  agents: AgentInput[],
  baseSensitivity: SensitivitySettings = DEFAULT_SENSITIVITY
): TornadoItem[] {
  const baseNetSaving36m = calculatePortfolioPL(agents, baseSensitivity).metrics.totalNetSaving36m;

  const levers: Array<{
    lever: string;
    lowLabel: string;
    highLabel: string;
    low: SensitivitySettings;
    high: SensitivitySettings;
  }> = [
    {
      lever: 'Task volume',
      lowLabel: '-25%',
      highLabel: '+25%',
      low: { ...baseSensitivity, volumeMultiplier: baseSensitivity.volumeMultiplier * 0.75 },
      high: { ...baseSensitivity, volumeMultiplier: baseSensitivity.volumeMultiplier * 1.25 },
    },
    {
      lever: 'Token price',
      lowLabel: '-50%',
      highLabel: '+50%',
      low: { ...baseSensitivity, tokenPriceMultiplier: baseSensitivity.tokenPriceMultiplier * 0.5 },
      high: { ...baseSensitivity, tokenPriceMultiplier: baseSensitivity.tokenPriceMultiplier * 1.5 },
    },
    {
      lever: 'Human review rate',
      lowLabel: '-15 pp',
      highLabel: '+15 pp',
      low: { ...baseSensitivity, reviewRateDelta: baseSensitivity.reviewRateDelta - 15 },
      high: { ...baseSensitivity, reviewRateDelta: baseSensitivity.reviewRateDelta + 15 },
    },
    {
      lever: 'Agent error rate',
      lowLabel: '-5 pp',
      highLabel: '+5 pp',
      low: { ...baseSensitivity, errorRateDelta: baseSensitivity.errorRateDelta - 5 },
      high: { ...baseSensitivity, errorRateDelta: baseSensitivity.errorRateDelta + 5 },
    },
    {
      lever: 'Adoption speed',
      lowLabel: '0.75x',
      highLabel: '1.25x',
      low: {
        ...baseSensitivity,
        adoptionSpeedMultiplier: baseSensitivity.adoptionSpeedMultiplier * 0.75,
      },
      high: {
        ...baseSensitivity,
        adoptionSpeedMultiplier: baseSensitivity.adoptionSpeedMultiplier * 1.25,
      },
    },
  ];

  return levers
    .map((item) => {
      const lowNetSaving36m = calculatePortfolioPL(agents, item.low).metrics.totalNetSaving36m;
      const highNetSaving36m = calculatePortfolioPL(agents, item.high).metrics.totalNetSaving36m;
      return {
        lever: item.lever,
        lowLabel: item.lowLabel,
        highLabel: item.highLabel,
        lowNetSaving36m,
        highNetSaving36m,
        baseNetSaving36m,
        lowDelta: lowNetSaving36m - baseNetSaving36m,
        highDelta: highNetSaving36m - baseNetSaving36m,
        swing: Math.abs(highNetSaving36m - lowNetSaving36m),
      };
    })
    .sort((a, b) => b.swing - a.swing);
}

/**
 * Validates an agent's inputs and returns finance and operational warnings.
 */
export function validateAgentInput(agent: AgentInput): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  if (!agent.name.trim()) {
    warnings.push({
      field: 'name',
      severity: 'error',
      message: 'Agent name is required.',
    });
  }

  if (agent.tasksPerMonth <= 0) {
    warnings.push({
      field: 'tasksPerMonth',
      severity: 'warning',
      message: 'Task volume is zero, so no baseline savings will be generated.',
    });
  }

  if (agent.reviewRate > 50) {
    warnings.push({
      field: 'reviewRate',
      severity: 'warning',
      message:
        'Human review rate is above 50%. This agent is behaving as an assistant rather than an autonomous worker.',
    });
  }

  if (agent.agentErrorRate > agent.baselineErrorRate && agent.agentErrorRate > 0) {
    warnings.push({
      field: 'agentErrorRate',
      severity: 'warning',
      message:
        'Agent error rate exceeds the baseline human error rate. Check quality controls and error costs.',
    });
  }

  if (agent.modelCallsPerTask <= 0) {
    warnings.push({
      field: 'modelCallsPerTask',
      severity: 'warning',
      message: 'Model calls per task is zero, so LLM token costs are excluded.',
    });
  }

  const pl = calculateAgentPL(agent);
  if (pl.metrics.variableAgentCostPerTask >= pl.metrics.baselineCostPerTask && agent.tasksPerMonth > 0) {
    warnings.push({
      field: 'unitEconomics',
      severity: 'error',
      message:
        'Variable agent cost per task meets or exceeds the baseline cost per task. This agent cannot break even at any volume.',
    });
  }

  return warnings;
}
