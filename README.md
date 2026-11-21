# Agentic P&L Calculator

A client-side single-page application for executives and finance leaders to model the unit economics and 36-month profit and loss (P&L) statement of an AI agent workforce.

## Features

- **Digital Workforce Modelling (up to 10 agents):** Configure task volume, human baseline handling time and loaded hourly cost, LLM token usage and pricing, model calls, tool/API fees, human-in-the-loop review rates, fixed and ongoing platform costs, error rates, 12-month adoption ramps, and risk reserves.
- **Monthly P&L Statement (12 and 36 months):** Tracks Baseline cost, Agent run cost, Human review cost, Fixed and platform cost, Error cost, Risk reserve, Net saving, and Cumulative net saving with accounting-style formatting.
- **Executive KPI Cards & Charts:** Cost per task (baseline vs agent), monthly net saving, payback period, 3-year ROI, break-even volume, capacity released in hours, cumulative cash flow with break-even marker, stacked monthly cost composition, and a sensitivity tornado chart.
- **Live Sensitivity & Scenario Comparison:** Real-time stress-testing sliders (volume, token price, review rate, error rate, adoption speed) and side-by-side comparison for up to 3 saved scenarios (`Conservative`, `Base`, `Optimistic`).
- **Portfolio Roll-Up & ROI Ranking:** Consolidates all agents into a single P&L and ranks them by 3-year ROI.
- **Currency & Offline Persistence:** Toggle between `SGD` and `USD` with a configurable exchange rate (default `1 USD = 1.35 SGD`). All state is persisted locally in `localStorage`.
- **Export & Print:** Download the 12-month or 36-month P&L as CSV, or print a clean one-page A4 executive summary.

## Tech Stack

- React 19, TypeScript, Vite
- Tailwind CSS v4
- Recharts
- Vitest (unit tests for the calculation engine)

## Project Structure

```text
src/
  engine/
    types.ts              # Core data model types
    calculations.ts       # Pure P&L, portfolio, sensitivity, and validation functions
    calculations.test.ts  # Unit tests and arithmetic reconciliation checks
    demoData.ts           # Preloaded demo agents (Invoice, Triage, Contract Review)
  components/
    AgentInputPanel.tsx   # Agent selector, input forms, and validation warnings
    PLTable.tsx           # 12/36-month P&L table with sticky headers and CSV export
    MetricCards.tsx       # Executive KPI summary cards
    ChartsPanel.tsx       # Cash flow, cost composition, and tornado charts
    SensitivityPanel.tsx  # Live sensitivity sliders
    ScenariosPanel.tsx    # Save/compare/load up to 3 named scenarios
    PortfolioRanking.tsx  # Agent ranking table by 3-year ROI
    PrintSummary.tsx      # One-page A4 print layout
    Toggletip.tsx         # Accessible field-level help tooltips
  utils/
    format.ts             # SGD/USD accounting formatters
    exportCsv.ts          # CSV generator
    storage.ts            # localStorage persistence
```

## Running with Docker Compose

The repository includes a complete `docker-compose.yml` stack with PostgreSQL 16 (`db`), the Express API (`api`), and the Nginx-served React frontend (`web`):

```bash
docker compose up --build -d
```

- Web app: `http://localhost:8080`
- API health check: `http://localhost:4000/api/health`
- PostgreSQL: `localhost:5432` (persisted in the `pgdata` volume)

## Running Locally

```bash
npm install
npm run dev
```

Run unit tests:

```bash
npm test
```

Build for production:

```bash
npm run build
```

## Formula Reference

All monetary inputs are stored internally in USD and converted to SGD on display using the configured exchange rate (`SGD = USD * exchangeRate`, default `1.35`).

### 1. Monthly Volume & Adoption

For month $m \in \{1, \dots, 36\}$, the adoption percentage `adoptionPct(m)` comes from the 12-month adoption ramp (with Months 13 to 36 continuing at the Month 12 rate), adjusted by the sensitivity adoption speed multiplier:

$$\text{AutomatedTasks}(m) = \text{TasksPerMonth} \times \text{VolumeMultiplier} \times \frac{\text{AdoptionPct}(m)}{100}$$

### 2. Baseline Cost

Human baseline cost per task scales handling time by the baseline rework/error rate:

$$\text{EffectiveBaselineMinutes} = \text{HumanMinutesPerTask} \times \left(1 + \frac{\text{BaselineErrorRate}}{100}\right)$$

$$\text{BaselineCostPerTask} = \frac{\text{EffectiveBaselineMinutes}}{60} \times \text{LoadedHourlyCost}$$

$$\text{BaselineCost}(m) = \text{AutomatedTasks}(m) \times \text{BaselineCostPerTask}$$

### 3. Agent Run Cost

Token and external tool cost per task:

$$\text{TokenCostPerCall} = \frac{\text{InputTokens}}{1{,}000{,}000} \times \text{InputPrice} + \frac{\text{OutputTokens}}{1{,}000{,}000} \times \text{OutputPrice}$$

$$\text{AgentRunCostPerTask} = (\text{TokenCostPerCall} \times \text{ModelCallsPerTask}) + \text{ToolCostPerTask}$$

$$\text{AgentRunCost}(m) = \text{AutomatedTasks}(m) \times \text{AgentRunCostPerTask}$$

### 4. Human Review Cost (Human-in-the-Loop)

$$\text{ReviewMinutesPerTask} = \frac{\text{ReviewRate}}{100} \times \text{ReviewMinutesPerReview}$$

$$\text{HumanReviewCostPerTask} = \frac{\text{ReviewMinutesPerTask}}{60} \times \text{LoadedHourlyCost}$$

$$\text{HumanReviewCost}(m) = \text{AutomatedTasks}(m) \times \text{HumanReviewCostPerTask}$$

### 5. Fixed and Platform Cost

One-time build and integration costs are recognised in Month 1; recurring platform, monitoring, and support costs apply every month:

$$\text{OngoingMonthlyFixed} = \text{MonthlyPlatform} + \text{MonthlyMonitoring} + \text{MonthlySupport}$$

$$\text{FixedAndPlatformCost}(m) = \begin{cases} \text{BuildCost} + \text{IntegrationCost} + \text{OngoingMonthlyFixed}, & m = 1 \\ \text{OngoingMonthlyFixed}, & m > 1 \end{cases}$$

### 6. Error Cost and Risk Reserve

$$\text{ErrorCost}(m) = \text{AutomatedTasks}(m) \times \frac{\text{AgentErrorRate}}{100} \times \text{CostPerError}$$

$$\text{RiskReserve}(m) = \text{AgentRunCost}(m) \times \frac{\text{RiskReserveRate}}{100}$$

### 7. Net Saving and Cumulative Net Saving

$$\text{TotalAgentCost}(m) = \text{AgentRunCost}(m) + \text{HumanReviewCost}(m) + \text{FixedAndPlatformCost}(m) + \text{ErrorCost}(m) + \text{RiskReserve}(m)$$

$$\text{NetSaving}(m) = \text{BaselineCost}(m) - \text{TotalAgentCost}(m)$$

$$\text{CumulativeNetSaving}(m) = \sum_{k=1}^{m} \text{NetSaving}(k)$$

### 8. Key Executive Metrics

- **All-in Agent Cost per Task (36m):** $\frac{\sum_{m=1}^{36} \text{TotalAgentCost}(m)}{\sum_{m=1}^{36} \text{AutomatedTasks}(m)}$
- **3-Year ROI (%):** $\frac{\sum_{m=1}^{36} \text{NetSaving}(m)}{\sum_{m=1}^{36} \text{TotalAgentCost}(m)} \times 100$
- **Payback Period (months):** First month $m \in \{1, \dots, 36\}$ where $\text{CumulativeNetSaving}(m) \ge 0$.
- **Break-even Volume (tasks/month):** $\left\lceil \frac{\text{OngoingMonthlyFixed}}{(\text{BaselineCostPerTask} - \text{VariableAgentCostPerTask}) \times (\text{SteadyStateAdoptionPct} / 100)} \right\rceil$
- **Hours of Capacity Released:** $\sum_{m=1}^{36} \text{AutomatedTasks}(m) \times \frac{\text{EffectiveBaselineMinutes} - \text{ReviewMinutesPerTask}}{60}$
