---
marp: true
theme: default
paginate: true
header: "AEGIS Agentic P&L Calculator | User Training"
footer: "Ian Loe, Tactics Solutions"
---

# AEGIS Agentic P&L Calculator
## Practitioner Training & Input Sourcing Workshop

**Audience:** Finance Partners, Operations Leads, AI Product Owners  
**Duration:** 60 to 90 Minutes  
**Author:** Ian Loe, Tactics Solutions

<!--
Speaker Notes: Welcome participants. Explain that this session teaches both how to use the AEGIS Agentic P&L Calculator and how to source accurate, auditable inputs from Finance, Operations, and Engineering.
-->

---

## Workshop Agenda & Objectives

By the end of this session, you will be able to:
1. Source all **19 input parameters** per agent from real operational and finance data
2. Avoid the most common financial modelling mistakes (token double-counting, base vs loaded labour cost, unrealistic Month 1 ramps)
3. Audit the **12-month and 36-month P&L Statement** and executive KPIs
4. Stress-test assumptions via **Sensitivity** and **Conservative / Base / Optimistic** scenarios
5. Record governance-ready **Past Assessments** and generate **AI Insights**

---

## Core Concept: P&L for a Digital Workforce

Each **agent** is treated as a digital worker performing a defined task at monthly volume:

- **Baseline Cost:** What the automated volume would cost if handled by humans
- **Agent-Side Costs:**
  1. Agent run cost (LLM tokens + model calls + external tool/API fees)
  2. Human review cost (Human-in-the-Loop escalation)
  3. Fixed & platform cost (Month 1 build/integration + ongoing hosting/gov/support)
  4. Error cost (uncaught errors $\times$ cost per error)
  5. Risk reserve (% of agent run cost held back for incidents and drift)
- **Net Saving** = Baseline Cost minus Total Agent-Side Cost

---

## Global Controls & Accounting Conventions

- **Scope Toggle:** Switch between **Portfolio** (all agents combined) and **Selected Agent**
- **Currency Toggle (`SGD` / `USD`):** All inputs convert cleanly at the configured FX rate (default `1 USD = 1.35 SGD`)
- **Accounting Formatting:**
  - Negative numbers / deficits appear in **red and brackets**, e.g. `(SGD 12,450)`
  - Positive savings appear in **green**
  - Tabular numerals ensure vertical alignment across all tables
- **Exports:** Download 12m/36m CSV or click **Print summary** for a one-page A4 board pack

---

## Who Owns Which Input? (Data Collection Map)

| Data Domain | Primary Owner | Source System / Artefact |
| :--- | :--- | :--- |
| Task volume & handling time | Operations Lead | ERP / CRM / ServiceNow logs, time-motion study |
| Loaded hourly cost & FX | Finance / HR | Payroll schedule, employer CPF/tax & overhead |
| Tokens, calls, & tool API fees | AI Engineering | Pilot LLM traces (OpenRouter / Langfuse), rate cards |
| Review rate & error cost | Risk / QA / Ops | UAT sign-off logs, credit-note & incident history |
| Build, integration & platform | IT / Engineering | Vendor SOW, cloud quotes, governance budget |

---

## Inputs 1 & 2: Role, Volume & Human Baseline

1. **Task volume per month:** Use the **trailing 6-month average** (not peak month)
2. **Human minutes / task:** Active handling time from start to close (median, not best-case)
3. **Loaded hourly cost:** Never use raw base wage. Include employer taxes, benefits, and seat overhead:

$$\text{Loaded Hourly Cost} = \frac{\text{Annual Gross Pay} + \text{Employer Taxes/CPF} + \text{Benefits} + \text{Overhead}}{\text{Productive Annual Hours (1,800 to 1,920)}}$$

4. **Baseline rework / error rate (%):** Scales human handling time (`1 + ReworkRate / 100`). Typical manual processes sit between `2%` and `6%`.

---

## Input 3: Agent Model & Tooling

**Critical Rule:** Enter tokens **per single model call**, because the engine multiplies by `Model calls / task`:

$$\text{AgentRunCost/Task} = \left(\frac{\text{InTokens}}{10^6}\times\text{InPrice} + \frac{\text{OutTokens}}{10^6}\times\text{OutPrice}\right)\times\text{Calls} + \text{ToolCost}$$

- **Input & Output tokens / call:** Pull from pilot telemetry (1 A4 page $\approx$ 500 to 700 tokens)
- **Token prices / 1M:** Check OpenRouter / OpenAI / Anthropic / Gemini pricing in your active currency
- **Model calls / task:** Count average loop steps (e.g. classify + extract + verify = `3`)
- **Tool / API cost / task:** Include OCR, vector search, enrichment APIs, or RPA minutes

---

## Input 4: Human-in-the-Loop (HITL) Review

- **Tasks needing review (%):** Share of agent tasks routed to a human for approval or exception handling
- **Minutes per review:** Average time for the reviewer to inspect sources and approve or correct

> **The 50% Autonomous Worker Rule:**  
> If `Tasks needing review (%)` exceeds **50%**, the app displays a warning that the deployment is behaving as a **human assistant** rather than an **autonomous worker**.

**Pitfall to avoid:** Do not assume `0%` review in regulated finance or legal workflows, and do not assume a 30-second review if staff must read an entire PDF.

---

## Input 5: Fixed & Platform Costs

- **One-time Build Cost** & **Integration Cost:** Recognised in **Month 1**
  - Include internal engineering, QA, InfoSec sign-off, and legacy ERP/CRM connector work
- **Ongoing Monthly Costs** (Months 1 to 36):
  - **Monthly platform:** Hosting, container runtime, vector DB, API gateway
  - **Monitoring & governance:** Tracing, guardrails, audit logs, compliance checks
  - **Support & maintenance:** Ongoing prompt tuning, schema updates, model upgrades

**Pitfall to avoid:** Treating AI agents as "build once and forget" with zero monthly support.

---

## Input 6: Quality, Risk Reserve & Adoption Ramp

- **Agent error rate (%):** Uncaught errors that escape human review
- **Cost / error:** Financial impact per incident (SLA penalty, rework, credit note, write-off)
- **Risk reserve (%):** Buffer held back as a percentage of **Agent run cost** (typically `10%` to `20%`) for rate spikes or model drift
- **Adoption ramp (Months 1 to 12):**
  - Choose `Fast (3m)`, `Standard (6m)`, or `Gradual (12m)` presets, or enter custom monthly percentages
  - Months 13 to 36 continue at the Month 12 rate

---

## Reading the P&L Statement & Executive KPIs

Every month reconciles exactly:

$$\text{NetSaving}(m) = \text{BaselineCost}(m) - \text{TotalAgentCost}(m)$$

$$\text{CumulativeNetSaving}(m) = \sum_{k=1}^{m} \text{NetSaving}(k)$$

**Six Executive KPI Cards:**
1. **Cost per task:** Baseline vs All-in 36-month Agent cost (plus steady-state variable run rate)
2. **Net saving per month:** 36-month average and Month 36 steady state
3. **Payback period:** First month where cumulative net saving $\ge 0$
4. **3-year ROI:** $\text{Total 36m Net Saving} / \text{Total 36m Agent Cost} \times 100$
5. **Break-even volume:** Minimum monthly tasks to cover ongoing monthly fixed costs
6. **Capacity released:** Net human hours freed over 36 months and per month

---

## Stress-Testing: Sensitivity & Scenarios

### Charts & Sensitivity (`/analytics`)
- **Tornado Chart:** Ranks which lever has the largest impact on 3-year net saving (Volume $\pm 25\%$, Token price $\pm 50\%$, Review rate $\pm 15\text{ pp}$, Error rate $\pm 5\text{ pp}$, Adoption speed $0.75\text{x}$ to $1.25\text{x}$)
- **Live Sliders:** Test downside combinations and watch the **Cumulative Cash Flow** break-even point shift in real time

### Scenarios (`/scenarios`)
- Save up to **3 named snapshots**: **Conservative**, **Base**, and **Optimistic**
- Compare 3-year net saving, ROI, payback, and capacity released side by side

---

## Governance: Vault, AI Insights & Print Summary

- **Saved & History (`/vault`):**
  - Sign in with your administrator-provisioned account (public registration is disabled to prevent bot signups)
  - Save workspace configurations and record frozen **Past Assessments** in PostgreSQL
- **AI Insights (`/insights`):**
  - Configure **OpenRouter** (default) or OpenAI, Anthropic, Gemini, Ollama, or OpenAI-compatible endpoints (API keys encrypted with AES-256-GCM)
  - Generate board summaries, risk critiques, and cost-optimisation plans
- **User Manual (`/manual`):** Full mathematical reference built directly into the app

---

## Hands-On Lab & Executive Sign-Off Checklist

**30-Minute Group Lab:**
1. Model one real workflow from your team in `/agents`
2. Verify there are no red unit-economics errors in `/statement`
3. Build **Conservative**, **Base**, and **Optimistic** cases in `/scenarios`
4. Record your assessment in `/vault` and generate an **Executive Board Summary** in `/insights`

**Sign-Off Checklist Before CFO Review:**
- [ ] Loaded labour cost verified with Finance (not raw base pay)
- [ ] Tokens entered **per call** and multiplied by realistic `Model calls / task`
- [ ] Year 1 adoption ramp reflects staged rollout (not 100% in Month 1)
- [ ] Payback and ROI remain acceptable under the **Conservative** case
- [ ] Assessment saved to Vault and A4 summary exported via **Print summary**
