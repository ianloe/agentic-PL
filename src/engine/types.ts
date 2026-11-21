export type Currency = 'SGD' | 'USD';

export interface AgentInput {
  id: string;
  name: string;
  description: string;
  tasksPerMonth: number;

  // Baseline (human / legacy process)
  humanMinutesPerTask: number;
  loadedHourlyCost: number; // Stored in USD internally
  baselineErrorRate: number; // Percentage 0-100

  // Agent run parameters
  inputTokensPerTask: number;
  outputTokensPerTask: number;
  inputTokenPricePerMillion: number; // Stored in USD internally
  outputTokenPricePerMillion: number; // Stored in USD internally
  modelCallsPerTask: number;
  toolCostPerTask: number; // Stored in USD internally

  // Human-in-the-loop
  reviewRate: number; // Percentage 0-100
  reviewMinutesPerTask: number;

  // Fixed and platform costs (Stored in USD internally)
  buildCost: number; // One-time, Month 1
  integrationCost: number; // One-time, Month 1
  monthlyPlatformCost: number;
  monthlyMonitoringCost: number;
  monthlySupportCost: number;

  // Quality and adoption
  agentErrorRate: number; // Percentage 0-100
  costPerError: number; // Stored in USD internally
  adoptionRamp: number[]; // 12 numbers (0-100) for Months 1-12

  // Risk reserve
  riskReserveRate: number; // Percentage 0-100 of agent run cost
}

export interface SensitivitySettings {
  volumeMultiplier: number; // e.g. 1.0 = 100%
  tokenPriceMultiplier: number; // e.g. 1.0 = 100%
  reviewRateDelta: number; // percentage points added to reviewRate
  errorRateDelta: number; // percentage points added to agentErrorRate
  adoptionSpeedMultiplier: number; // e.g. 1.0 = 100% speed
}

export interface MonthlyPLRow {
  month: number; // 1..36
  adoptionPct: number; // 0..100
  automatedTasks: number;
  baselineCost: number;
  agentRunCost: number;
  humanReviewCost: number;
  fixedAndPlatformCost: number;
  errorCost: number;
  riskReserve: number;
  totalAgentCost: number; // agentRunCost + humanReviewCost + fixedAndPlatformCost + errorCost + riskReserve
  netSaving: number; // baselineCost - totalAgentCost
  cumulativeNetSaving: number;
  hoursReleased: number;
}

export interface AgentMetrics {
  baselineCostPerTask: number;
  agentCostPerTask: number; // All-in 36-month cost per automated task
  variableAgentCostPerTask: number; // Steady-state variable cost per task
  avgMonthlyNetSaving: number;
  steadyStateMonthlyNetSaving: number;
  paybackPeriodMonths: number | null; // null if not achieved within 36 months
  roi3YearPct: number;
  breakEvenVolume: number | null; // null if unit contribution <= 0
  totalHoursReleased36m: number;
  monthlyHoursReleasedSteadyState: number;
  totalBaselineCost36m: number;
  totalAgentCost36m: number;
  totalNetSaving36m: number;
}

export interface AgentPLResult {
  agentId: string;
  agentName: string;
  monthly: MonthlyPLRow[]; // 36 months
  metrics: AgentMetrics;
}

export interface TornadoItem {
  lever: string;
  lowLabel: string;
  highLabel: string;
  lowNetSaving36m: number;
  highNetSaving36m: number;
  baseNetSaving36m: number;
  lowDelta: number;
  highDelta: number;
  swing: number;
}

export interface SavedScenario {
  id: string;
  name: string; // e.g. "Conservative", "Base", "Optimistic"
  savedAt: string;
  agents: AgentInput[];
  sensitivity: SensitivitySettings;
  exchangeRate: number;
}

export interface ValidationWarning {
  field: string;
  severity: 'warning' | 'error';
  message: string;
}
