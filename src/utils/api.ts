import type { AgentInput, AgentMetrics, Currency, SavedScenario, SensitivitySettings } from '../engine/types';

const TOKEN_KEY = 'agentic_pl_auth_token';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface StoredConfigPayload {
  agents: AgentInput[];
  selectedAgentId: string;
  viewScope: 'agent' | 'portfolio';
  currency: Currency;
  exchangeRate: number;
  sensitivity: SensitivitySettings;
  scenarios: SavedScenario[];
}

export interface StoredConfigurationRecord {
  id: string;
  name: string;
  config_json: StoredConfigPayload;
  updated_at: string;
}

export interface PastAssessmentRecord {
  id: string;
  title: string;
  scope: 'agent' | 'portfolio';
  currency: Currency;
  exchange_rate: number;
  summary_metrics: AgentMetrics;
  snapshot_json: {
    agents: AgentInput[];
    selectedAgentId: string;
    sensitivity: SensitivitySettings;
  };
  created_at: string;
}

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) ?? {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`/api${path}`, {
    ...options,
    headers,
  });

  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  return data;
}

export async function registerUser(
  email: string,
  password: string,
  name: string
): Promise<{ token: string; user: AuthUser }> {
  const data = await apiFetch<{ token: string; user: AuthUser }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
  setAuthToken(data.token);
  return data;
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ token: string; user: AuthUser }> {
  const data = await apiFetch<{ token: string; user: AuthUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setAuthToken(data.token);
  return data;
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  if (!getAuthToken()) return null;
  try {
    const data = await apiFetch<{ user: AuthUser }>('/auth/me');
    return data.user;
  } catch {
    setAuthToken(null);
    return null;
  }
}

export async function fetchConfigurations(): Promise<StoredConfigurationRecord[]> {
  const data = await apiFetch<{ configurations: StoredConfigurationRecord[] }>('/configurations');
  return data.configurations;
}

export async function saveConfiguration(
  name: string,
  config: StoredConfigPayload,
  id?: string
): Promise<StoredConfigurationRecord> {
  const data = await apiFetch<{ configuration: StoredConfigurationRecord }>('/configurations', {
    method: 'POST',
    body: JSON.stringify({ id, name, config }),
  });
  return data.configuration;
}

export async function deleteConfiguration(id: string): Promise<void> {
  await apiFetch(`/configurations/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function fetchAssessments(): Promise<PastAssessmentRecord[]> {
  const data = await apiFetch<{ assessments: PastAssessmentRecord[] }>('/assessments');
  return data.assessments;
}

export async function saveAssessment(payload: {
  title: string;
  scope: 'agent' | 'portfolio';
  currency: Currency;
  exchangeRate: number;
  summaryMetrics: AgentMetrics;
  snapshot: {
    agents: AgentInput[];
    selectedAgentId: string;
    sensitivity: SensitivitySettings;
  };
}): Promise<PastAssessmentRecord> {
  const data = await apiFetch<{ assessment: PastAssessmentRecord }>('/assessments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.assessment;
}

export async function deleteAssessment(id: string): Promise<void> {
  await apiFetch(`/assessments/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
