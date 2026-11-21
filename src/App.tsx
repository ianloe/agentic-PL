import { ArrowRight } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { AegisShell } from './components/AegisShell';
import { AIInsightsPanel } from './components/AIInsightsPanel';
import { AdminPanel } from './components/AdminPanel';
import { AgentInputPanel } from './components/AgentInputPanel';
import { ChartsPanel } from './components/ChartsPanel';
import { MetricCards } from './components/MetricCards';
import { PLTable } from './components/PLTable';
import { PortfolioRanking } from './components/PortfolioRanking';
import { PrintSummary } from './components/PrintSummary';
import { ScenariosPanel } from './components/ScenariosPanel';
import { SensitivityPanel } from './components/SensitivityPanel';
import { UserManualPanel } from './components/UserManualPanel';
import { WorkspaceVaultPanel } from './components/WorkspaceVaultPanel';
import {
  DEFAULT_SENSITIVITY,
  calculateAgentPL,
  calculatePortfolioPL,
  calculateTornadoSensitivity,
} from './engine/calculations';
import { createBlankAgent } from './engine/demoData';
import type { AgentInput, Currency, SavedScenario, SensitivitySettings } from './engine/types';
import {
  type AuthUser,
  type PastAssessmentRecord,
  type StoredConfigPayload,
  type StoredConfigurationRecord,
  deleteAssessment,
  deleteConfiguration,
  fetchAssessments,
  fetchConfigurations,
  fetchCurrentUser,
  loginUser,
  saveAssessment,
  saveConfiguration,
  setAuthToken,
} from './utils/api';
import { getDefaultState, loadPersistedState, savePersistedState } from './utils/storage';

export function App() {
  const navigate = useNavigate();
  const [initial] = useState(() => loadPersistedState());
  const [agents, setAgents] = useState<AgentInput[]>(initial.agents);
  const [selectedAgentId, setSelectedAgentId] = useState<string>(initial.selectedAgentId);
  const [viewScope, setViewScope] = useState<'agent' | 'portfolio'>(initial.viewScope);
  const [currency, setCurrency] = useState<Currency>(initial.currency);
  const [exchangeRate, setExchangeRate] = useState<number>(initial.exchangeRate);
  const [sensitivity, setSensitivity] = useState<SensitivitySettings>(initial.sensitivity);
  const [scenarios, setScenarios] = useState<SavedScenario[]>(initial.scenarios);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [configurations, setConfigurations] = useState<StoredConfigurationRecord[]>([]);
  const [assessments, setAssessments] = useState<PastAssessmentRecord[]>([]);

  const loadVaultData = useCallback(async () => {
    try {
      const [cfgs, asms] = await Promise.all([fetchConfigurations(), fetchAssessments()]);
      setConfigurations(cfgs);
      setAssessments(asms);
    } catch {
      // Ignore network errors when running offline
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchCurrentUser()
      .then((u) => {
        if (!active) return;
        setUser(u);
        if (u) {
          loadVaultData();
        }
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadVaultData]);

  useEffect(() => {
    savePersistedState({
      agents,
      selectedAgentId,
      viewScope,
      currency,
      exchangeRate,
      sensitivity,
      scenarios,
    });
  }, [agents, selectedAgentId, viewScope, currency, exchangeRate, sensitivity, scenarios]);

  const selectedAgent = useMemo(
    () => agents.find((a) => a.id === selectedAgentId) ?? agents[0],
    [agents, selectedAgentId]
  );

  const agentResults = useMemo(
    () => agents.map((a) => calculateAgentPL(a, sensitivity)),
    [agents, sensitivity]
  );

  const portfolioResult = useMemo(
    () => calculatePortfolioPL(agents, sensitivity),
    [agents, sensitivity]
  );

  const baseUnadjustedResult = useMemo(() => {
    if (viewScope === 'portfolio') {
      return calculatePortfolioPL(agents, DEFAULT_SENSITIVITY);
    }
    return calculateAgentPL(selectedAgent, DEFAULT_SENSITIVITY);
  }, [agents, selectedAgent, viewScope]);

  const activeResult = useMemo(() => {
    if (viewScope === 'portfolio') return portfolioResult;
    return agentResults.find((r) => r.agentId === selectedAgent.id) ?? agentResults[0];
  }, [agentResults, portfolioResult, selectedAgent.id, viewScope]);

  const tornado = useMemo(
    () => calculateTornadoSensitivity(agents, sensitivity),
    [agents, sensitivity]
  );

  const handleUpdateAgent = (updated: AgentInput) => {
    setAgents((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  };

  const handleAddAgent = () => {
    if (agents.length >= 10) return;
    const created = createBlankAgent(agents.length + 1);
    setAgents((prev) => [...prev, created]);
    setSelectedAgentId(created.id);
  };

  const handleDuplicateAgent = (id: string) => {
    if (agents.length >= 10) return;
    const source = agents.find((a) => a.id === id);
    if (!source) return;
    const copy: AgentInput = {
      ...source,
      id: `agent-${Date.now()}`,
      name: `${source.name} (Copy)`,
      adoptionRamp: [...source.adoptionRamp],
    };
    setAgents((prev) => [...prev, copy]);
    setSelectedAgentId(copy.id);
  };

  const handleRemoveAgent = (id: string) => {
    if (agents.length <= 1) return;
    const next = agents.filter((a) => a.id !== id);
    setAgents(next);
    if (selectedAgentId === id) {
      setSelectedAgentId(next[0].id);
    }
  };

  const handleSaveScenario = (name: 'Conservative' | 'Base' | 'Optimistic') => {
    const snapshot: SavedScenario = {
      id: `scenario-${name.toLowerCase()}`,
      name,
      savedAt: new Date().toISOString(),
      agents: structuredClone(agents),
      sensitivity: { ...sensitivity },
      exchangeRate,
    };
    setScenarios((prev) => {
      const existingIdx = prev.findIndex((s) => s.name === name);
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = snapshot;
        return copy;
      }
      if (prev.length >= 3) return prev;
      return [...prev, snapshot];
    });
  };

  const handleLoadScenario = (id: string) => {
    const found = scenarios.find((s) => s.id === id);
    if (!found) return;
    setAgents(structuredClone(found.agents));
    setSelectedAgentId(found.agents[0]?.id ?? '');
    setSensitivity({ ...found.sensitivity });
    setExchangeRate(found.exchangeRate);
  };

  const handleDuplicateScenario = (id: string) => {
    const found = scenarios.find((s) => s.id === id);
    if (!found) return;
    setAgents(structuredClone(found.agents));
    setSelectedAgentId(found.agents[0]?.id ?? '');
    setSensitivity({ ...found.sensitivity });
    setExchangeRate(found.exchangeRate);
    navigate('/statement');
  };

  const handleDeleteScenario = (id: string) => {
    setScenarios((prev) => prev.filter((s) => s.id !== id));
  };

  const handleResetAll = () => {
    const defaults = getDefaultState();
    setAgents(defaults.agents);
    setSelectedAgentId(defaults.selectedAgentId);
    setViewScope(defaults.viewScope);
    setCurrency(defaults.currency);
    setExchangeRate(defaults.exchangeRate);
    setSensitivity(defaults.sensitivity);
    setScenarios([]);
  };

  return (
    <>
      <AegisShell
        agentCount={agents.length}
        selectedAgentName={selectedAgent.name || 'Unnamed agent'}
        viewScope={viewScope}
        onChangeScope={setViewScope}
        currency={currency}
        onChangeCurrency={setCurrency}
        exchangeRate={exchangeRate}
        onChangeExchangeRate={setExchangeRate}
        onPrint={() => window.print()}
        onReset={handleResetAll}
        user={user}
      >
        <Routes>
          <Route
            path="/"
            element={
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h1 className="text-lg font-bold tracking-tight text-slate-900">
                      Executive Overview
                    </h1>
                    <p className="text-xs text-slate-500">
                      {viewScope === 'portfolio'
                        ? `Consolidated 36-month economics across ${agents.length} digital workforce agents`
                        : selectedAgent.description}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to="/agents"
                      className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Configure agents
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                    <Link
                      to="/statement"
                      className="inline-flex items-center gap-1 rounded-md bg-blue-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-800"
                    >
                      View P&amp;L statement
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                </div>

                <MetricCards
                  metrics={activeResult.metrics}
                  currency={currency}
                  exchangeRate={exchangeRate}
                />

                <PortfolioRanking
                  agentResults={agentResults}
                  currency={currency}
                  exchangeRate={exchangeRate}
                  onSelectAgent={(id) => {
                    setSelectedAgentId(id);
                    setViewScope('agent');
                    navigate('/agents');
                  }}
                />

                <ChartsPanel
                  result={activeResult}
                  tornado={tornado}
                  currency={currency}
                  exchangeRate={exchangeRate}
                />
              </div>
            }
          />

          <Route
            path="/agents"
            element={
              <div className="space-y-5">
                <div>
                  <h1 className="text-lg font-bold tracking-tight text-slate-900">
                    Workforce &amp; Assumptions
                  </h1>
                  <p className="text-xs text-slate-500">
                    Configure up to 10 digital workforce agents, baseline labour costs, LLM token pricing, review rates, and adoption ramps.
                  </p>
                </div>

                <MetricCards
                  metrics={
                    (agentResults.find((r) => r.agentId === selectedAgent.id) ?? agentResults[0])
                      .metrics
                  }
                  currency={currency}
                  exchangeRate={exchangeRate}
                />

                <AgentInputPanel
                  agents={agents}
                  selectedAgentId={selectedAgent.id}
                  onSelectAgent={(id) => setSelectedAgentId(id)}
                  onUpdateAgent={handleUpdateAgent}
                  onAddAgent={handleAddAgent}
                  onDuplicateAgent={handleDuplicateAgent}
                  onRemoveAgent={handleRemoveAgent}
                  currency={currency}
                  exchangeRate={exchangeRate}
                />
              </div>
            }
          />

          <Route
            path="/statement"
            element={
              <div className="space-y-5">
                <div>
                  <h1 className="text-lg font-bold tracking-tight text-slate-900">
                    Profit &amp; Loss Statement
                  </h1>
                  <p className="text-xs text-slate-500">
                    Monthly P&amp;L statement for {activeResult.agentName} ({currency}).
                  </p>
                </div>

                <MetricCards
                  metrics={activeResult.metrics}
                  currency={currency}
                  exchangeRate={exchangeRate}
                />

                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <PLTable
                    result={activeResult}
                    currency={currency}
                    exchangeRate={exchangeRate}
                  />
                </div>
              </div>
            }
          />

          <Route
            path="/analytics"
            element={
              <div className="space-y-5">
                <div>
                  <h1 className="text-lg font-bold tracking-tight text-slate-900">
                    Charts &amp; Sensitivity Stress-Test
                  </h1>
                  <p className="text-xs text-slate-500">
                    Adjust operational levers live and inspect cash flow, cost composition, and sensitivity tornado impact.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                  <div className="xl:col-span-5">
                    <SensitivityPanel
                      sensitivity={sensitivity}
                      onChange={setSensitivity}
                      baseMetrics={baseUnadjustedResult.metrics}
                      adjustedMetrics={activeResult.metrics}
                      currency={currency}
                      exchangeRate={exchangeRate}
                    />
                  </div>
                  <div className="xl:col-span-7">
                    <ChartsPanel
                      result={activeResult}
                      tornado={tornado}
                      currency={currency}
                      exchangeRate={exchangeRate}
                    />
                  </div>
                </div>
              </div>
            }
          />

          <Route
            path="/insights"
            element={
              <div className="space-y-5">
                <div>
                  <h1 className="text-lg font-bold tracking-tight text-slate-900">
                    AI Insights &amp; Provider Configuration
                  </h1>
                  <p className="text-xs text-slate-500">
                    Connect your preferred AI provider to generate executive P&amp;L commentary and optimisation recommendations.
                  </p>
                </div>

                <AIInsightsPanel
                  user={user}
                  activeResult={activeResult}
                  agentResults={agentResults}
                  tornado={tornado}
                  viewScope={viewScope}
                  currency={currency}
                  exchangeRate={exchangeRate}
                />
              </div>
            }
          />

          <Route
            path="/scenarios"
            element={
              <div className="space-y-5">
                <div>
                  <h1 className="text-lg font-bold tracking-tight text-slate-900">
                    Scenario Comparison
                  </h1>
                  <p className="text-xs text-slate-500">
                    Save and compare Conservative, Base, and Optimistic portfolio models side by side.
                  </p>
                </div>

                <ScenariosPanel
                  scenarios={scenarios}
                  onSaveScenario={handleSaveScenario}
                  onLoadScenario={handleLoadScenario}
                  onDuplicateScenario={handleDuplicateScenario}
                  onDeleteScenario={handleDeleteScenario}
                  currency={currency}
                  exchangeRate={exchangeRate}
                />
              </div>
            }
          />

          <Route
            path="/vault"
            element={
              <div className="space-y-5">
                <div>
                  <h1 className="text-lg font-bold tracking-tight text-slate-900">
                    Saved Configurations &amp; Past Assessments
                  </h1>
                  <p className="text-xs text-slate-500">
                    Sign in to persist workspace configurations and audit-ready past assessments in PostgreSQL.
                  </p>
                </div>

                <WorkspaceVaultPanel
                  user={user}
                  authLoading={authLoading}
                  configurations={configurations}
                  assessments={assessments}
                  onLogin={async (email, password) => {
                    const res = await loginUser(email, password);
                    setUser(res.user);
                    await loadVaultData();
                  }}
                  onLogout={() => {
                    setAuthToken(null);
                    setUser(null);
                    setConfigurations([]);
                    setAssessments([]);
                  }}
                  onSaveConfiguration={async (name) => {
                    const payload: StoredConfigPayload = {
                      agents,
                      selectedAgentId,
                      viewScope,
                      currency,
                      exchangeRate,
                      sensitivity,
                      scenarios,
                    };
                    await saveConfiguration(name, payload);
                    await loadVaultData();
                  }}
                  onLoadConfiguration={(cfg) => {
                    setAgents(cfg.agents);
                    setSelectedAgentId(cfg.selectedAgentId || cfg.agents[0]?.id || '');
                    setViewScope(cfg.viewScope);
                    setCurrency(cfg.currency);
                    setExchangeRate(cfg.exchangeRate);
                    setSensitivity(cfg.sensitivity);
                    setScenarios(cfg.scenarios ?? []);
                    navigate('/');
                  }}
                  onDeleteConfiguration={async (id) => {
                    await deleteConfiguration(id);
                    await loadVaultData();
                  }}
                  onSaveAssessment={async (title) => {
                    await saveAssessment({
                      title,
                      scope: viewScope,
                      currency,
                      exchangeRate,
                      summaryMetrics: activeResult.metrics,
                      snapshot: {
                        agents,
                        selectedAgentId,
                        sensitivity,
                      },
                    });
                    await loadVaultData();
                  }}
                  onLoadAssessment={(a) => {
                    setAgents(a.snapshot_json.agents);
                    setSelectedAgentId(
                      a.snapshot_json.selectedAgentId || a.snapshot_json.agents[0]?.id || ''
                    );
                    setViewScope(a.scope);
                    setCurrency(a.currency);
                    setExchangeRate(a.exchange_rate);
                    setSensitivity(a.snapshot_json.sensitivity);
                    navigate('/statement');
                  }}
                  onDeleteAssessment={async (id) => {
                    await deleteAssessment(id);
                    await loadVaultData();
                  }}
                />
              </div>
            }
          />

          <Route
            path="/admin"
            element={
              <div className="space-y-5">
                <div>
                  <h1 className="text-lg font-bold tracking-tight text-slate-900">
                    User Administration
                  </h1>
                  <p className="text-xs text-slate-500">
                    Manually provision user and administrator accounts.
                  </p>
                </div>

                <AdminPanel currentUser={user} />
              </div>
            }
          />

          <Route
            path="/manual"
            element={
              <div className="space-y-5">
                <div>
                  <h1 className="text-lg font-bold tracking-tight text-slate-900">
                    User Manual &amp; Formula Reference
                  </h1>
                  <p className="text-xs text-slate-500">
                    Section-by-section guide and mathematical definitions for the Agentic P&amp;L Calculator.
                  </p>
                </div>

                <UserManualPanel />
              </div>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AegisShell>

      {/* Print-only A4 Executive Summary */}
      <PrintSummary
        activeResult={activeResult}
        agentResults={agentResults}
        viewScope={viewScope}
        currency={currency}
        exchangeRate={exchangeRate}
      />
    </>
  );
}

export default App;
