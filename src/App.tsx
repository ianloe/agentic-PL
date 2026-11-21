import { Printer, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AgentInputPanel } from './components/AgentInputPanel';
import { ChartsPanel } from './components/ChartsPanel';
import { MetricCards } from './components/MetricCards';
import { PLTable } from './components/PLTable';
import { PortfolioRanking } from './components/PortfolioRanking';
import { PrintSummary } from './components/PrintSummary';
import { ScenariosPanel } from './components/ScenariosPanel';
import { SensitivityPanel } from './components/SensitivityPanel';
import {
  DEFAULT_SENSITIVITY,
  calculateAgentPL,
  calculatePortfolioPL,
  calculateTornadoSensitivity,
} from './engine/calculations';
import { createBlankAgent } from './engine/demoData';
import type { AgentInput, Currency, SavedScenario, SensitivitySettings } from './engine/types';
import { getDefaultState, loadPersistedState, savePersistedState } from './utils/storage';

type TabKey = 'pl' | 'charts' | 'sensitivity' | 'scenarios';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'pl', label: 'P&L Statement' },
  { key: 'charts', label: 'Charts' },
  { key: 'sensitivity', label: 'Sensitivity' },
  { key: 'scenarios', label: 'Scenarios' },
];

export function App() {
  const [initial] = useState(() => loadPersistedState());
  const [agents, setAgents] = useState<AgentInput[]>(initial.agents);
  const [selectedAgentId, setSelectedAgentId] = useState<string>(initial.selectedAgentId);
  const [viewScope, setViewScope] = useState<'agent' | 'portfolio'>(initial.viewScope);
  const [currency, setCurrency] = useState<Currency>(initial.currency);
  const [exchangeRate, setExchangeRate] = useState<number>(initial.exchangeRate);
  const [sensitivity, setSensitivity] = useState<SensitivitySettings>(initial.sensitivity);
  const [scenarios, setScenarios] = useState<SavedScenario[]>(initial.scenarios);
  const [activeTab, setActiveTab] = useState<TabKey>('pl');

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
    setActiveTab('pl');
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
    <div className="min-h-screen bg-slate-50/60 text-slate-900">
      {/* Screen Header */}
      <header className="no-print border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
              Agentic P&amp;L Calculator
            </h1>
            <p className="text-xs text-slate-500">
              Digital workforce unit economics and 36-month profit &amp; loss model
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Scope Switch */}
            <div
              role="group"
              aria-label="Analysis scope"
              className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5"
            >
              <button
                type="button"
                onClick={() => setViewScope('portfolio')}
                className={`rounded px-2.5 py-1 text-xs font-medium ${
                  viewScope === 'portfolio'
                    ? 'bg-white text-blue-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Portfolio ({agents.length})
              </button>
              <button
                type="button"
                onClick={() => setViewScope('agent')}
                className={`rounded px-2.5 py-1 text-xs font-medium ${
                  viewScope === 'agent'
                    ? 'bg-white text-blue-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Selected Agent
              </button>
            </div>

            {/* Currency Toggle & FX Rate */}
            <div className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1">
              <div role="group" aria-label="Display currency" className="inline-flex">
                <button
                  type="button"
                  onClick={() => setCurrency('SGD')}
                  className={`rounded px-2 py-0.5 text-xs font-semibold ${
                    currency === 'SGD'
                      ? 'bg-blue-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  SGD
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency('USD')}
                  className={`rounded px-2 py-0.5 text-xs font-semibold ${
                    currency === 'USD'
                      ? 'bg-blue-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  USD
                </button>
              </div>
              <label className="flex items-center gap-1 border-l border-slate-200 pl-2 text-[11px] text-slate-600">
                <span>1 USD =</span>
                <input
                  type="number"
                  min={0.1}
                  step={0.01}
                  aria-label="USD to SGD exchange rate"
                  value={exchangeRate}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val > 0) setExchangeRate(val);
                  }}
                  className="w-14 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs tabular-nums text-slate-900 focus:border-blue-800 focus:outline-none"
                />
                <span>SGD</span>
              </label>
            </div>

            {/* Print & Reset */}
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Printer className="h-3.5 w-3.5" aria-hidden="true" />
              Print summary
            </button>

            <button
              type="button"
              onClick={handleResetAll}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Reset
            </button>
          </div>
        </div>
      </header>

      {/* Main Two-Column Workspace */}
      <main className="no-print mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Panel: Inputs */}
          <aside aria-label="Agent assumptions" className="lg:col-span-4">
            <AgentInputPanel
              agents={agents}
              selectedAgentId={selectedAgent.id}
              onSelectAgent={(id) => {
                setSelectedAgentId(id);
                setViewScope('agent');
              }}
              onUpdateAgent={handleUpdateAgent}
              onAddAgent={handleAddAgent}
              onDuplicateAgent={handleDuplicateAgent}
              onRemoveAgent={handleRemoveAgent}
              currency={currency}
              exchangeRate={exchangeRate}
            />
          </aside>

          {/* Right Panel: Results */}
          <section aria-label="Financial results" className="space-y-6 lg:col-span-8">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {activeResult.agentName}
                </h2>
                <p className="text-xs text-slate-500">
                  {viewScope === 'portfolio'
                    ? `Consolidated P&L across ${agents.length} digital workforce agents`
                    : selectedAgent.description}
                </p>
              </div>
            </div>

            <MetricCards
              metrics={activeResult.metrics}
              currency={currency}
              exchangeRate={exchangeRate}
            />

            {viewScope === 'portfolio' && (
              <PortfolioRanking
                agentResults={agentResults}
                currency={currency}
                exchangeRate={exchangeRate}
                onSelectAgent={(id) => {
                  setSelectedAgentId(id);
                  setViewScope('agent');
                }}
              />
            )}

            {/* Tabs */}
            <div className="rounded-lg border border-slate-200 bg-white">
              <div
                role="tablist"
                aria-label="Results views"
                className="flex overflow-x-auto border-b border-slate-200 px-2"
              >
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    id={`tab-${tab.key}`}
                    aria-selected={activeTab === tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className="tab-btn px-4 py-3 text-xs font-semibold text-slate-600 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-4">
                <div
                  role="tabpanel"
                  aria-labelledby="tab-pl"
                  hidden={activeTab !== 'pl'}
                >
                  {activeTab === 'pl' && (
                    <PLTable
                      result={activeResult}
                      currency={currency}
                      exchangeRate={exchangeRate}
                    />
                  )}
                </div>

                <div
                  role="tabpanel"
                  aria-labelledby="tab-charts"
                  hidden={activeTab !== 'charts'}
                >
                  {activeTab === 'charts' && (
                    <ChartsPanel
                      result={activeResult}
                      tornado={tornado}
                      currency={currency}
                      exchangeRate={exchangeRate}
                    />
                  )}
                </div>

                <div
                  role="tabpanel"
                  aria-labelledby="tab-sensitivity"
                  hidden={activeTab !== 'sensitivity'}
                >
                  {activeTab === 'sensitivity' && (
                    <SensitivityPanel
                      sensitivity={sensitivity}
                      onChange={setSensitivity}
                      baseMetrics={baseUnadjustedResult.metrics}
                      adjustedMetrics={activeResult.metrics}
                      currency={currency}
                      exchangeRate={exchangeRate}
                    />
                  )}
                </div>

                <div
                  role="tabpanel"
                  aria-labelledby="tab-scenarios"
                  hidden={activeTab !== 'scenarios'}
                >
                  {activeTab === 'scenarios' && (
                    <ScenariosPanel
                      scenarios={scenarios}
                      onSaveScenario={handleSaveScenario}
                      onLoadScenario={handleLoadScenario}
                      onDuplicateScenario={handleDuplicateScenario}
                      onDeleteScenario={handleDeleteScenario}
                      currency={currency}
                      exchangeRate={exchangeRate}
                    />
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Print-only A4 Executive Summary */}
      <PrintSummary
        activeResult={activeResult}
        agentResults={agentResults}
        viewScope={viewScope}
        currency={currency}
        exchangeRate={exchangeRate}
      />
    </div>
  );
}

export default App;
