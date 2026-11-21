import { DEFAULT_SENSITIVITY } from '../engine/calculations';
import { DEMO_AGENTS } from '../engine/demoData';
import type { AgentInput, Currency, SavedScenario, SensitivitySettings } from '../engine/types';

const STORAGE_KEY = 'agentic_pl_calculator_v1';

export interface PersistedState {
  agents: AgentInput[];
  selectedAgentId: string;
  viewScope: 'agent' | 'portfolio';
  currency: Currency;
  exchangeRate: number;
  sensitivity: SensitivitySettings;
  scenarios: SavedScenario[];
}

export function getDefaultState(): PersistedState {
  return {
    agents: DEMO_AGENTS,
    selectedAgentId: DEMO_AGENTS[0].id,
    viewScope: 'portfolio',
    currency: 'SGD',
    exchangeRate: 1.35,
    sensitivity: DEFAULT_SENSITIVITY,
    scenarios: [],
  };
}

export function loadPersistedState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultState();
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    const agents =
      Array.isArray(parsed.agents) && parsed.agents.length > 0
        ? parsed.agents.slice(0, 10)
        : DEMO_AGENTS;
    const selectedAgentId =
      parsed.selectedAgentId && agents.some((a) => a.id === parsed.selectedAgentId)
        ? parsed.selectedAgentId
        : agents[0].id;

    return {
      agents,
      selectedAgentId,
      viewScope: parsed.viewScope === 'agent' ? 'agent' : 'portfolio',
      currency: parsed.currency === 'USD' ? 'USD' : 'SGD',
      exchangeRate:
        typeof parsed.exchangeRate === 'number' && parsed.exchangeRate > 0
          ? parsed.exchangeRate
          : 1.35,
      sensitivity: {
        ...DEFAULT_SENSITIVITY,
        ...(parsed.sensitivity ?? {}),
      },
      scenarios: Array.isArray(parsed.scenarios) ? parsed.scenarios.slice(0, 3) : [],
    };
  } catch {
    return getDefaultState();
  }
}

export function savePersistedState(state: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}
