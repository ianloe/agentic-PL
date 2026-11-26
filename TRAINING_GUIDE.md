# AEGIS Agentic P&L: User Training & Data Gathering Guide

**Author:** Ian Loe, Tactics Solutions  
**Target Audience:** Finance Partners, Operations Leads, AI Product Owners, and Transformation Teams  
**Recommended Session Length:** 60 to 90 minutes (self-paced or instructor-led workshop)

---

## 1. Training Objectives

By the end of this training, participants will be able to:
1. Gather accurate, auditable baseline and AI operational data from Finance, Operations, and Engineering teams.
2. Enter all 19 input parameters per agent into **Workforce & Inputs** (`/agents`) without common estimation errors.
3. Interpret the 12-month and 36-month **P&L Statement** (`/statement`), unit economics, payback period, break-even volume, and 3-year ROI.
4. Stress-test assumptions using **Charts & Sensitivity** (`/analytics`) and compare **Conservative**, **Base**, and **Optimistic** cases (`/scenarios`).
5. Record governance-ready **Past Assessments** (`/vault`), generate **AI Insights** (`/insights`), and export CSV or one-page A4 executive summaries.

---

## 2. How to Source Every Input Parameter Accurately

The accuracy of an Agentic P&L depends entirely on the quality of its inputs. Use the parameter-by-parameter guide below to collect real numbers rather than guesses.

### Section 1: Agent Role & Volume

| Input Field | Where to Get It | How to Calculate / Verify | Common Pitfalls |
| :--- | :--- | :--- | :--- |
| **Agent name** | Business case or process catalogue | Use the specific workflow name (for example, `Invoice Processing`), not a generic label like `AI Bot`. | Naming by technology (`GPT Agent`) instead of business function. |
| **Description** | Standard Operating Procedure (SOP) | State the trigger, systems touched (ERP, CRM, ticketing), and completion criteria in 1 to 2 sentences. | Leaving it blank, which makes portfolio reviews harder for finance reviewers. |
| **Task volume per month** | ERP logs, CRM/ServiceNow ticket exports, or Ops MI dashboards | Take the **trailing 6-month average** of completed transactions per month, excluding test/duplicate records. Adjust only for confirmed seasonal growth. | Using peak-month volume instead of average monthly volume, which overstates savings. |

---

### Section 2: Human Baseline (Legacy Process)

| Input Field | Where to Get It | How to Calculate / Verify | Common Pitfalls |
| :--- | :--- | :--- | :--- |
| **Human minutes / task** | Time-motion studies, BPM/ticketing timestamps, or shadowing 3 to 5 staff across 20+ tasks | Measure **end-to-end active handling time** (reading, lookup, data entry, verification, closing) in minutes, not calendar elapsed time. | Using "best-case" time from a senior specialist rather than team median handling time. |
| **Loaded hourly cost** | Finance / HR compensation schedule | $\text{Loaded Hourly Cost} = \frac{\text{Annual Gross Salary} + \text{Employer Taxes/CPF} + \text{Benefits} + \text{Seat/IT Overhead}}{\text{Productive Annual Hours (typically } 1{,}800 \text{ to } 1{,}920\text{)}}$. In Singapore, a loaded multiplier is typically `1.25x` to `1.40x` base pay. | Using base hourly salary only, which understates true human baseline cost by 25% to 40%. |
| **Baseline rework / error rate (%)** | QA audit logs, credit-note/re-processing reports, or Operations exception logs | $\frac{\text{Tasks Reworked or Corrected}}{\text{Total Tasks Completed}} \times 100$. Typical manual data-entry processes sit between `2%` and `6%`. | Entering `0%`, which assumes human teams never make rework-inducing errors. |

---

### Section 3: Agent Model & Tooling

> **Important Formula Rule:** The calculator computes token cost per task as:  
> $(\text{InputTokens} \times \text{InputPrice} + \text{OutputTokens} \times \text{OutputPrice}) \times \text{ModelCallsPerTask} + \text{ToolCostPerTask}$.  
> Enter **average tokens per single model call**, not total tokens across all calls, because the engine multiplies by `Model calls / task`.

| Input Field | Where to Get It | How to Calculate / Verify | Common Pitfalls |
| :--- | :--- | :--- | :--- |
| **Input tokens / call** | Pilot LLM telemetry (Langfuse, OpenRouter logs, or provider usage dashboard) | Average prompt tokens per LLM request, including system prompt, retrieved context (RAG), and document text. As a rule of thumb, 1 A4 page of text is ~500 to 700 tokens. | Counting total workflow tokens here *and* setting `Model calls / task > 1`, which double-counts token spend. |
| **Output tokens / call** | Pilot LLM telemetry | Average completion tokens per LLM request (structured JSON, classification, or drafted reply). | Ignoring reasoning/thinking tokens on reasoning models if billed as output tokens. |
| **Input price / 1M** | Model provider pricing page (OpenRouter, OpenAI, Anthropic, Google) | Enter the list price per 1,000,000 input tokens in your active display currency (`SGD` or `USD`). | Mixing USD token prices while the app is toggled to SGD without checking conversion. |
| **Output price / 1M** | Model provider pricing page | Enter the list price per 1,000,000 output tokens. Output tokens are typically `3x` to `5x` more expensive than input tokens. | Using input price for both fields. |
| **Model calls / task** | Agent architecture trace | Count the average number of sequential or parallel LLM calls per task (for example: `1` classify + `1` extract + `1` verify = `3`). | Leaving at `0` (which excludes all LLM token costs) or `1` for multi-step agent loops. |
| **Tool / API cost / task** | Vendor invoices / API rate cards | Sum non-LLM per-task fees: OCR/document parsing, vector DB queries, enrichment APIs, SMS/email dispatch, or RPA bot minutes. | Forgetting OCR or third-party data lookup fees on document-heavy workflows. |

---

### Section 4: Human-in-the-Loop (HITL) Review

| Input Field | Where to Get It | How to Calculate / Verify | Common Pitfalls |
| :--- | :--- | :--- | :--- |
| **Tasks needing review (%)** | Pilot confidence-threshold testing or compliance policy | Percentage of automated tasks routed to a human for approval or exception handling. **Note:** If above `50%`, the app warns that the agent is acting as an assistant rather than an autonomous worker. | Assuming `0%` review in regulated finance or legal workflows where sign-off is mandatory. |
| **Minutes per review** | Pilot UAT timing | Average human minutes to inspect the agent's draft/extraction, verify source fields, and click approve or fix. Typically `20%` to `40%` of original human handling time. | Assuming review takes `0.5` minutes when reviewers still have to open and read an entire PDF. |

---

### Section 5: Fixed & Platform Costs

| Input Field | Where to Get It | How to Calculate / Verify | Common Pitfalls |
| :--- | :--- | :--- | :--- |
| **One-time build** | Engineering / Vendor Statement of Work (SOW) | Internal engineering sprint cost (loaded day rate $\times$ days) or vendor build fee for prompts, workflows, evaluations, and UAT. Recognised in **Month 1**. | Excluding internal PM, QA, and business-analyst time during build. |
| **Integration cost** | IT / Security / Middleware estimate | One-time cost to build ERP/CRM connectors, SSO/IAM, firewall rules, and InfoSec sign-off. Recognised in **Month 1**. | Underestimating legacy ERP integration effort, which often equals or exceeds the AI build cost. |
| **Monthly platform** | Cloud / Hosting / SaaS quotes | Monthly share of container hosting, vector database, orchestration platform, and API gateway fees allocated to this agent. | Leaving at `0` when dedicated cloud infrastructure is provisioned. |
| **Monitoring & gov (/mo)** | Observability & AI governance budget | Monthly cost of tracing/evals tooling, guardrail services, audit logging, and periodic compliance reviews. | Omitting governance costs, which are mandatory in enterprise deployments. |
| **Support & maintenance (/mo)** | IT Operations / Engineering capacity plan | Ongoing engineering hours/month for prompt drift fixes, model version upgrades, and schema changes $\times$ loaded hourly rate. | Treating AI agents as "build once and forget". |

---

### Section 6: Quality, Risk & Adoption Ramp

| Input Field | Where to Get It | How to Calculate / Verify | Common Pitfalls |
| :--- | :--- | :--- | :--- |
| **Agent error rate (%)** | Offline evaluation dataset + shadow-mode pilot | Percentage of tasks that pass through without human catch and result in a material business error. | Confusing "needs review %" with "un-caught error %". |
| **Cost / error** | Finance / Risk / Ops incident history | Average financial impact of one error: SLA penalty, rework escalation, write-off, credit note, or customer remediation cost. | Using `0` or underestimating high-severity workflows (such as legal contracts). |
| **Risk reserve (%)** | Finance / Risk controller policy | Percentage of **Agent run cost** held back each month (typically `10%` to `20%`) to buffer token price spikes, retry loops, or model drift. | Setting `0%` in early-stage deployments with uncalibrated prompt lengths. |
| **Adoption ramp (M1 to M12)** | Rollout / Change-management plan | Share of monthly volume routed to the agent during Year 1. Use `Gradual (12m)` for high-risk workflows, `Standard (6m)` for typical ops, or `Fast (3m)` for low-risk triage. Months 13 to 36 continue at Month 12's percentage. | Setting `100%` in Month 1, which overstates Year 1 savings and distorts payback. |

---

## 3. Hands-On Training Walkthrough (60-Minute Lab)

### Module 1: Set Scope and Currency
1. Open the application and check the top utility bar.
2. Select your reporting currency (**SGD** or **USD**) and confirm the exchange rate (default `1 USD = 1.35 SGD`).
3. Toggle between **Portfolio** (all agents combined) and **Selected Agent** (single workflow).

### Module 2: Model a New Agent (`/agents`)
1. Navigate to **Workforce & Inputs** in the left sidebar.
2. Click **Add agent** (or **Duplicate** an existing demo agent).
3. Enter your gathered numbers across Sections 1 to 6. Hover or click any `?` icon if you need a reminder of what a field represents.
4. Check the amber/red validation banner at the top:
   - Fix any **red** unit-economics error (where variable agent cost exceeds baseline cost).
   - Review any **amber** warning (such as `reviewRate > 50%`).

### Module 3: Audit the Monthly P&L (`/statement`)
1. Open **P&L Statement**.
2. Switch between **12 months** (Year 1 budget view) and **36 months** (3-year investment view).
3. Verify the accounting reconciliation on any column:
   - $\text{Net saving} = \text{Baseline cost} - (\text{Agent run} + \text{Human review} + \text{Fixed \& platform} + \text{Error cost} + \text{Risk reserve})$.
   - $\text{Cumulative net saving}$ at Month $m$ equals the running sum of $\text{Net saving}$ from Month 1 to Month $m$.
4. Click **Export CSV** to inspect the numbers in Excel if required by Finance.

### Module 4: Stress-Test Assumptions (`/analytics`)
1. Open **Charts & Sensitivity**.
2. Inspect the **Sensitivity Tornado** chart to see which single lever drives the largest swing in 3-year net saving.
3. Move the sliders to test downside scenarios (for example: `-25%` task volume, `+15 pp` human review rate, `0.75x` adoption speed).
4. Confirm whether the **Cumulative Cash Flow** curve still crosses zero within 36 months.

### Module 5: Build Conservative, Base, and Optimistic Scenarios (`/scenarios`)
1. With default sensitivity (`100%` / `0 pp` / `1.0x`), open **Scenarios** and click **Save Base**.
2. Return to **Charts & Sensitivity**, apply downside stress (for example, `80%` volume, `+10 pp` review rate, `0.75x` adoption speed), then return to **Scenarios** and click **Save Conservative**.
3. Apply upside assumptions (for example, `115%` volume, `75%` token price, `-5 pp` review rate) and click **Save Optimistic**.
4. Compare all 3 scenarios side by side, then click **Load** on **Base** (and **Reset levers** if needed) to restore your baseline.

### Module 6: Generate AI Insights & Save to Vault (`/insights` & `/vault`)
1. Sign in on **Saved & History** (`/vault`) using credentials provisioned by your administrator.
2. Save your current workspace under **Stored Configurations** so colleagues or future reviews can reload it.
3. Click **Record assessment** under **Past Assessments** to freeze a timestamped snapshot of your metrics.
4. Open **AI Insights** (`/insights`), configure your AI provider (OpenRouter is preselected by default), and run **Executive Board Summary** or **Payback & Risk Critique**.

---

## 4. Executive Sign-Off Checklist

Before presenting an Agentic P&L to a CFO or Investment Committee, confirm all five checks:
1. **Loaded labour cost verified:** Confirmed with Finance/HR (not raw base salary).
2. **No token double-counting:** `Input/Output tokens` are per call, multiplied by realistic `Model calls / task`.
3. **Realistic Year 1 ramp:** Month 1 adoption reflects pilot/shadow rollout, not `100%` day-one cutover.
4. **Downside resilience tested:** Under the **Conservative** scenario, payback and 3-year ROI remain acceptable.
5. **Audit trail saved:** Assessment recorded in **Saved & History** (`/vault`) and one-page A4 summary printed via **Print summary**.
