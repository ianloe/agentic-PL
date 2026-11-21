# Agentic P&L Calculator: User Manual

**Author:** Ian Loe, Tactics Solutions

This manual explains how each section of the **Agentic P&L Calculator** works and documents the exact financial and operational mathematics behind every metric, chart, and P&L line item.

---

## 1. Navigation & Global Controls

The application is structured as a multi-page executive console with a persistent left navigation rail and a top utility bar.

### Top Utility Bar
- **Active Scope (`Portfolio` vs `Selected Agent`):**
  - **Portfolio:** Consolidates all configured agents (up to 10) into a single P&L statement, KPI summary, and ROI ranking.
  - **Selected Agent:** Isolates the currently selected agent so you can inspect its standalone unit economics.
- **Currency Toggle (`SGD` / `USD`) & Exchange Rate:**
  - Switch between Singapore Dollars (`SGD`) and US Dollars (`USD`) at any time.
  - All monetary inputs are stored internally in `USD` and converted to `SGD` using the configurable rate (`1 USD = 1.35 SGD` by default):

$$\text{DisplayAmount}_{\text{SGD}} = \text{Amount}_{\text{USD}} \times \text{ExchangeRate}$$

- **Print summary:** Formats a clean, one-page A4 executive summary for board packs or PDF export.
- **Reset:** Restores the 3 preloaded demo agents (Invoice Processing, Customer Enquiry Triage, Contract Review) and default sensitivity levers.

### Accounting Conventions
- **Negative numbers** (net costs or cumulative deficits before payback) are shown in red and in brackets, for example `(SGD 12,450)`.
- **Positive savings** are shown in green.
- All tables and KPI cards use tabular numerals so columns align vertically.

---

## 2. Executive Overview (`/`)

The **Executive Overview** provides a board-level summary of the active scope:
1. **Six KPI Cards:** Cost per task (Baseline vs Agent), Net saving per month, Payback period, 3-year ROI, Break-even volume, and Capacity released.
2. **Portfolio Ranking by 3-Year ROI:** Ranks every agent from highest to lowest 3-year ROI. Clicking any row opens that agent in **Workforce & Inputs**.
3. **Executive Charts:** Cumulative cash flow (with break-even marked), monthly cost composition vs baseline, and the sensitivity tornado chart.

---

## 3. Workforce & Inputs (`/agents`)

Configure up to **10 digital workforce agents**. You can add, duplicate, or remove agents, and each input includes an inline `?` toggletip explaining its meaning.

### Input Sections & Validation Rules

1. **Agent Role & Volume:** Name, workflow description, and total monthly task volume at 100% adoption.
2. **Human Baseline:** Average human minutes per task, loaded hourly cost (salary, benefits, payroll taxes, and overhead), and baseline rework/error rate (%).
3. **Agent Model & Tooling:** Average input tokens per call, output tokens per call, price per 1 million input/output tokens, number of model calls per task, and external tool/API cost per task.
4. **Human-in-the-Loop Review:** Percentage of agent-processed tasks escalated for human review, and minutes per review.
   - **Assistant Warning:** If the review rate exceeds **50%**, the calculator flags that the agent is behaving as an assistant rather than an autonomous worker.
5. **Fixed & Platform Costs:** One-time build and integration costs (recognised in Month 1) and recurring monthly platform, monitoring/governance, and support/maintenance costs.
6. **Quality, Risk & Adoption Ramp:**
   - Agent error rate (%) and average cost per error.
   - Risk reserve (% of agent run cost held back for incidents and model drift).
   - 12-month adoption ramp (% of monthly volume handled by the agent in Months 1 to 12; Months 13 to 36 continue at the Month 12 rate). Quick presets (`Fast 3m`, `Standard 6m`, `Gradual 12m`) are provided.
   - **Unit Economics Error:** If variable agent cost per task meets or exceeds baseline cost per task, the calculator warns that the agent cannot break even at any volume.

---

## 4. The Mathematics Behind the P&L

All calculations run over a **36-month horizon** ($m = 1, 2, \dots, 36$).

### 4.1 Automated Task Volume & Adoption Ramp

Let $\text{Ramp}[1 \dots 12]$ be the 12-month adoption percentages. Under a sensitivity adoption speed multiplier $s$ (default $s = 1.0$), the effective index is:

$$t(m) = \text{clamp}\big((m - 1) \times s,\; 0,\; 11\big)$$

The adoption percentage $\text{AdoptionPct}(m)$ is linearly interpolated between $\text{Ramp}[\lfloor t \rfloor]$ and $\text{Ramp}[\lceil t \rceil]$ (for $m > 12$ and $s \ge 1$, it uses $\text{Ramp}[11]$). With volume multiplier $v$ (default $v = 1.0$):

$$\text{AutomatedTasks}(m) = (\text{TasksPerMonth} \times v) \times \frac{\text{AdoptionPct}(m)}{100}$$

### 4.2 Baseline Cost

The baseline represents what the automated portion of monthly volume would cost under the legacy human process, accounting for rework:

$$\text{EffectiveBaselineMinutes} = \text{HumanMinutesPerTask} \times \left(1 + \frac{\text{BaselineErrorRate}}{100}\right)$$

$$\text{BaselineCostPerTask} = \frac{\text{EffectiveBaselineMinutes}}{60} \times \text{LoadedHourlyCost}$$

$$\text{BaselineCost}(m) = \text{AutomatedTasks}(m) \times \text{BaselineCostPerTask}$$

**Worked Example:** If a human takes `9` minutes at `USD 38/hr` with a `3.5%` rework rate:
- Effective minutes = $9 \times 1.035 = 9.315\text{ min}$
- Baseline cost per task = $(9.315 / 60) \times 38 = \text{USD } 5.90$

### 4.3 Agent Run Cost

With token price multiplier $p$ (default $p = 1.0$):

$$\text{TokenCostPerCall} = \frac{\text{InputTokens}}{1{,}000{,}000} \times (\text{InputPrice} \times p) + \frac{\text{OutputTokens}}{1{,}000{,}000} \times (\text{OutputPrice} \times p)$$

$$\text{AgentRunCostPerTask} = (\text{TokenCostPerCall} \times \text{ModelCallsPerTask}) + \text{ToolCostPerTask}$$

$$\text{AgentRunCost}(m) = \text{AutomatedTasks}(m) \times \text{AgentRunCostPerTask}$$

### 4.4 Human Review Cost (Human-in-the-Loop)

Let $\text{EffectiveReviewRate} = \text{clamp}(\text{ReviewRate} + \Delta_{\text{review}},\; 0,\; 100)$:

$$\text{ReviewMinutesPerTask} = \frac{\text{EffectiveReviewRate}}{100} \times \text{ReviewMinutesPerReview}$$

$$\text{HumanReviewCostPerTask} = \frac{\text{ReviewMinutesPerTask}}{60} \times \text{LoadedHourlyCost}$$

$$\text{HumanReviewCost}(m) = \text{AutomatedTasks}(m) \times \text{HumanReviewCostPerTask}$$

### 4.5 Fixed and Platform Cost

One-time build and integration costs are expensed in Month 1; ongoing platform, monitoring, and support costs apply every month:

$$\text{OngoingMonthlyFixed} = \text{MonthlyPlatform} + \text{MonthlyMonitoring} + \text{MonthlySupport}$$

$$\text{FixedAndPlatformCost}(m) = \begin{cases} \text{BuildCost} + \text{IntegrationCost} + \text{OngoingMonthlyFixed}, & m = 1 \\ \text{OngoingMonthlyFixed}, & m \in \{2, \dots, 36\} \end{cases}$$

### 4.6 Error Cost & Risk Reserve

Let $\text{EffectiveErrorRate} = \text{clamp}(\text{AgentErrorRate} + \Delta_{\text{error}},\; 0,\; 100)$:

$$\text{ErrorCost}(m) = \text{AutomatedTasks}(m) \times \frac{\text{EffectiveErrorRate}}{100} \times \text{CostPerError}$$

$$\text{RiskReserve}(m) = \text{AgentRunCost}(m) \times \frac{\text{RiskReserveRate}}{100}$$

### 4.7 Net Saving & Cumulative Net Saving (Reconciliation)

Every month reconciles exactly to the following identity:

$$\text{TotalAgentCost}(m) = \text{AgentRunCost}(m) + \text{HumanReviewCost}(m) + \text{FixedAndPlatformCost}(m) + \text{ErrorCost}(m) + \text{RiskReserve}(m)$$

$$\text{NetSaving}(m) = \text{BaselineCost}(m) - \text{TotalAgentCost}(m)$$

$$\text{CumulativeNetSaving}(m) = \sum_{k=1}^{m} \text{NetSaving}(k)$$

---

## 5. Key Executive Metrics

- **All-in Agent Cost per Task (36m):**

$$\text{AgentCostPerTask} = \frac{\sum_{m=1}^{36} \text{TotalAgentCost}(m)}{\sum_{m=1}^{36} \text{AutomatedTasks}(m)}$$

- **Variable Agent Cost per Task:**

$$\text{VariableAgentCostPerTask} = \text{AgentRunCostPerTask} + \text{HumanReviewCostPerTask} + \text{ErrorCostPerTask} + \text{RiskReservePerTask}$$

- **Net Saving per Month (36m Average) & Steady State (M36):**

$$\text{AvgMonthlyNetSaving} = \frac{1}{36} \sum_{m=1}^{36} \text{NetSaving}(m), \qquad \text{SteadyStateSaving} = \text{NetSaving}(36)$$

- **Payback Period (months):** The first month $m \in \{1, \dots, 36\}$ where $\text{CumulativeNetSaving}(m) \ge 0$. Displays `> 36 months` if cumulative savings remain negative at Month 36.
- **3-Year ROI (%):**

$$\text{ROI}_{3\text{Y}} = \frac{\sum_{m=1}^{36} \text{NetSaving}(m)}{\sum_{m=1}^{36} \text{TotalAgentCost}(m)} \times 100$$

- **Break-even Volume (tasks/month):** Minimum monthly task volume needed at steady-state adoption ($\text{AdoptionPct}(12)/100$) to cover ongoing monthly fixed costs:

$$\text{UnitContribution} = \text{BaselineCostPerTask} - \text{VariableAgentCostPerTask}$$

$$\text{BreakEvenVolume} = \left\lceil \frac{\text{OngoingMonthlyFixed}}{\text{UnitContribution} \times (\text{AdoptionPct}(12) / 100)} \right\rceil$$

  If $\text{UnitContribution} \le 0$ or steady-state adoption is $0\%$, break-even is reported as `Unreachable`.

- **Capacity Released (hours):**

$$\text{HoursReleased}(m) = \text{AutomatedTasks}(m) \times \frac{\text{EffectiveBaselineMinutes} - \text{ReviewMinutesPerTask}}{60}$$

---

## 6. P&L Statement (`/statement`)

Displays the full monthly P&L table with sticky row and column headers for easy horizontal scrolling:
- Toggle between **12 months** (Year 1) and **36 months** (3-Year).
- The **Total** column sums every flow line (`Baseline cost`, `Agent run cost`, `Human review cost`, `Fixed and platform cost`, `Error cost`, `Risk reserve`, `Net saving`) and shows the ending balance for `Cumulative net saving`.
- Click **Export CSV** to download the active 12-month or 36-month statement in your selected display currency.

---

## 7. Charts & Sensitivity (`/analytics`)

### Live Sensitivity Stress-Test
Adjust five operational levers in real time and compare **Unadjusted** vs **Stressed** 3-year net saving:
1. **Task volume multiplier** (`50%` to `150%`)
2. **Token price multiplier** (`25%` to `200%`)
3. **Human review rate shift** (`-30 pp` to `+30 pp`)
4. **Agent error rate shift** (`-10 pp` to `+20 pp`)
5. **Adoption ramp speed** (`0.50x` to `1.50x`)

### Charts
1. **Cumulative Cash Flow (36 Months):** Area chart of $\text{CumulativeNetSaving}(m)$ with a dashed zero line and the break-even month highlighted.
2. **Monthly Cost Composition vs Baseline:** Stacked bar chart of all five agent-side cost categories overlaid with the `Baseline cost` line.
3. **Sensitivity Tornado:** Varies each of the 5 levers one at a time around the active settings and sorts them from largest to smallest 3-year net saving swing:
   - Task volume: $\pm 25\%$
   - Token price: $\pm 50\%$
   - Human review rate: $\pm 15\text{ pp}$
   - Agent error rate: $\pm 5\text{ pp}$
   - Adoption speed: $0.75\text{x}$ vs $1.25\text{x}$

---

## 8. Portfolio Roll-Up

In **Portfolio** scope, every monthly line item is the exact sum across all active agents:

$$\text{PortfolioLine}(m) = \sum_{i=1}^{N} \text{Agent}_{i}\text{.Line}(m)$$

Portfolio metrics (`AgentCostPerTask`, `ROI`, `PaybackPeriod`, `BreakEvenVolume`, `HoursReleased`) are then computed from the consolidated portfolio cash flows using the same formulas in Section 5.

---

## 9. AI Insights (`/insights`)

Signed-in users can configure their own LLM provider to generate executive commentary grounded in their active P&L numbers:
- Supported providers: **OpenAI**, **Anthropic (Claude)**, **Google Gemini**, **Ollama (Local)**, and **OpenAI-Compatible** endpoints.
- API keys are encrypted at rest in PostgreSQL using **AES-256-GCM** and are never sent back to the browser in plaintext.
- Includes one-click prompts (**Executive Board Summary**, **Payback & Risk Critique**, **Cost Optimisation Plan**, **Portfolio Prioritisation**) and custom prompt support.

---

## 10. Scenarios (`/scenarios`)

Save up to **3 named snapshots** (`Conservative`, `Base`, `Optimistic`) in local browser storage and compare their 3-year net saving, ROI, payback period, average monthly saving, agent cost per task, and capacity released side by side.

---

## 11. Saved & History (`/vault`) and Admin Users (`/admin`)

- **Saved & History (`/vault`):** Sign in to save full workspace configurations to PostgreSQL (`stored_configurations`) and record frozen point-in-time executive assessments (`past_assessments`) for auditability.
- **Bot Prevention & Admin Provisioning (`/admin`):** Public self-registration is disabled (`HTTP 403`). Administrators see **Admin Users** in the left navigation rail to manually create users, assign `User` or `Admin` roles, and remove accounts. Initial administrator credentials can be configured via `.env` (`ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`).
