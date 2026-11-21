import { BookmarkPlus, History, LogIn, LogOut, Save, Trash2, UserPlus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type {
  AuthUser,
  PastAssessmentRecord,
  StoredConfigPayload,
  StoredConfigurationRecord,
} from '../utils/api';
import { formatMoney, formatPercent } from '../utils/format';

interface WorkspaceVaultPanelProps {
  user: AuthUser | null;
  authLoading: boolean;
  configurations: StoredConfigurationRecord[];
  assessments: PastAssessmentRecord[];
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string, name: string) => Promise<void>;
  onLogout: () => void;
  onSaveConfiguration: (name: string) => Promise<void>;
  onLoadConfiguration: (config: StoredConfigPayload) => void;
  onDeleteConfiguration: (id: string) => Promise<void>;
  onSaveAssessment: (title: string) => Promise<void>;
  onLoadAssessment: (assessment: PastAssessmentRecord) => void;
  onDeleteAssessment: (id: string) => Promise<void>;
}

export function WorkspaceVaultPanel({
  user,
  authLoading,
  configurations,
  assessments,
  onLogin,
  onRegister,
  onLogout,
  onSaveConfiguration,
  onLoadConfiguration,
  onDeleteConfiguration,
  onSaveAssessment,
  onLoadAssessment,
  onDeleteAssessment,
}: WorkspaceVaultPanelProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [configName, setConfigName] = useState('Q4 Baseline Model');
  const [assessmentTitle, setAssessmentTitle] = useState('Executive Assessment');

  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await onLogin(email, password);
      } else {
        await onRegister(email, password, name);
      }
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-xs text-slate-500">
        Checking session...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-slate-900">
          {mode === 'login' ? 'Sign in to Workspace Vault' : 'Create Workspace Account'}
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Store configurations and record past P&amp;L assessments in PostgreSQL. Local browser storage remains active offline.
        </p>

        <form onSubmit={handleAuthSubmit} className="mt-4 space-y-3">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-slate-700">Full name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Tan"
                className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900 focus:border-blue-800 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700">Email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="finance@company.com"
              className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900 focus:border-blue-800 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900 focus:border-blue-800 focus:outline-none"
            />
          </div>

          {error && (
            <p role="alert" className="rounded bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-blue-900 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
          >
            {mode === 'login' ? (
              <>
                <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                {submitting ? 'Signing in...' : 'Sign in'}
              </>
            ) : (
              <>
                <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                {submitting ? 'Creating account...' : 'Create account'}
              </>
            )}
          </button>
        </form>

        <div className="mt-4 border-t border-slate-100 pt-3 text-center">
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError(null);
            }}
            className="text-xs font-medium text-blue-900 hover:underline"
          >
            {mode === 'login'
              ? 'Need an account? Register here'
              : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Signed-in banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div>
          <p className="text-xs font-semibold text-slate-900">
            Signed in as {user.name} ({user.email})
          </p>
          <p className="text-[11px] text-slate-500">
            Configurations and past assessments are stored in PostgreSQL.
          </p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          Sign out
        </button>
      </div>

      {/* Stored Configurations */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">Stored Configurations</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Save your current agent assumptions, currency, exchange rate, and scenarios to reload later.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <input
            type="text"
            value={configName}
            onChange={(e) => setConfigName(e.target.value)}
            placeholder="Configuration name"
            className="flex-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-800 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => onSaveConfiguration(configName)}
            disabled={!configName.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-40"
          >
            <Save className="h-3.5 w-3.5" aria-hidden="true" />
            Save configuration
          </button>
        </div>

        <div className="mt-4 divide-y divide-slate-100">
          {configurations.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-400">
              No saved configurations yet.
            </p>
          ) : (
            configurations.map((cfg) => (
              <div key={cfg.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div>
                  <p className="text-xs font-medium text-slate-900">{cfg.name}</p>
                  <p className="text-[11px] text-slate-400">
                    {cfg.config_json.agents.length} agents · Updated{' '}
                    {new Date(cfg.updated_at).toLocaleString('en-GB')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onLoadConfiguration(cfg.config_json)}
                    className="rounded border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Load
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteConfiguration(cfg.id)}
                    aria-label={`Delete configuration ${cfg.name}`}
                    className="rounded border border-slate-200 p-1 text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Past Assessments */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-1.5">
          <History className="h-4 w-4 text-blue-900" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-slate-900">Past Assessments</h3>
        </div>
        <p className="mt-0.5 text-xs text-slate-500">
          Record point-in-time executive assessments with frozen metrics and assumptions for auditability.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <input
            type="text"
            value={assessmentTitle}
            onChange={(e) => setAssessmentTitle(e.target.value)}
            placeholder="Assessment title"
            className="flex-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-800 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => onSaveAssessment(assessmentTitle)}
            disabled={!assessmentTitle.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-40"
          >
            <BookmarkPlus className="h-3.5 w-3.5" aria-hidden="true" />
            Record assessment
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          {assessments.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-400">
              No past assessments recorded yet.
            </p>
          ) : (
            <table className="w-full text-left text-xs tabular-nums">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3 font-medium">Assessment</th>
                  <th className="py-2 px-2 font-medium">Scope</th>
                  <th className="py-2 px-2 text-right font-medium">3-Year Net Saving</th>
                  <th className="py-2 px-2 text-right font-medium">3-Year ROI</th>
                  <th className="py-2 px-2 text-right font-medium">Payback</th>
                  <th className="py-2 pl-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assessments.map((a) => {
                  const m = a.summary_metrics;
                  return (
                    <tr key={a.id}>
                      <td className="py-2.5 pr-3">
                        <p className="font-medium text-slate-900">{a.title}</p>
                        <p className="text-[11px] text-slate-400">
                          {new Date(a.created_at).toLocaleString('en-GB')}
                        </p>
                      </td>
                      <td className="py-2.5 px-2 capitalize text-slate-600">{a.scope}</td>
                      <td
                        className={`py-2.5 px-2 text-right font-semibold ${
                          m.totalNetSaving36m >= 0 ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {formatMoney(m.totalNetSaving36m, a.currency, a.exchange_rate, 0)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-medium text-slate-800">
                        {formatPercent(m.roi3YearPct, 1)}
                      </td>
                      <td className="py-2.5 px-2 text-right text-slate-700">
                        {m.paybackPeriodMonths !== null ? `${m.paybackPeriodMonths} mo` : '> 36 mo'}
                      </td>
                      <td className="py-2.5 pl-2 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onLoadAssessment(a)}
                            className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Restore
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteAssessment(a.id)}
                            aria-label={`Delete assessment ${a.title}`}
                            className="rounded border border-slate-200 p-1 text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
