import {
  BarChart3,
  BookOpen,
  Bot,
  Database,
  FileSpreadsheet,
  GitCompare,
  LayoutDashboard,
  Menu,
  Printer,
  RotateCcw,
  Shield,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import type { Currency } from '../engine/types';
import type { AuthUser } from '../utils/api';

interface AegisShellProps {
  children: ReactNode;
  agentCount: number;
  selectedAgentName: string;
  viewScope: 'agent' | 'portfolio';
  onChangeScope: (scope: 'agent' | 'portfolio') => void;
  currency: Currency;
  onChangeCurrency: (currency: Currency) => void;
  exchangeRate: number;
  onChangeExchangeRate: (rate: number) => void;
  onPrint: () => void;
  onReset: () => void;
  user: AuthUser | null;
}

const NAV_ITEMS = [
  { to: '/', label: 'Executive Overview', icon: LayoutDashboard, end: true },
  { to: '/agents', label: 'Workforce & Inputs', icon: Bot, end: false },
  { to: '/statement', label: 'P&L Statement', icon: FileSpreadsheet, end: false },
  { to: '/analytics', label: 'Charts & Sensitivity', icon: BarChart3, end: false },
  { to: '/insights', label: 'AI Insights', icon: Sparkles, end: false },
  { to: '/scenarios', label: 'Scenarios', icon: GitCompare, end: false },
  { to: '/vault', label: 'Saved & History', icon: Database, end: false },
  { to: '/manual', label: 'User Manual', icon: BookOpen, end: false },
];

export function AegisShell({
  children,
  agentCount,
  selectedAgentName,
  viewScope,
  onChangeScope,
  currency,
  onChangeCurrency,
  exchangeRate,
  onChangeExchangeRate,
  onPrint,
  onReset,
  user,
}: AegisShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const navContent = (
    <div className="flex h-full flex-col justify-between bg-slate-950 text-slate-200">
      <div>
        {/* Aegis-style Brand Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight text-white">Agentic P&amp;L</p>
              <p className="text-[10px] font-medium tracking-wider text-slate-400 uppercase">
                Tactics Solutions
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close navigation"
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav aria-label="Primary" className="space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileNavOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600/20 text-white ring-1 ring-blue-500/40'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          {user?.role === 'admin' && (
            <NavLink
              to="/admin"
              onClick={() => setMobileNavOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600/20 text-white ring-1 ring-blue-500/40'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
                }`
              }
            >
              <Shield className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Admin Users</span>
            </NavLink>
          )}
        </nav>
      </div>

      {/* Sidebar Footer: Account & Attribution */}
      <div className="border-t border-slate-800 p-4 text-xs">
        <NavLink
          to="/vault"
          onClick={() => setMobileNavOpen(false)}
          className="flex items-center gap-2.5 rounded-lg bg-slate-900 px-3 py-2.5 text-slate-200 hover:bg-slate-800"
        >
          <User className="h-4 w-4 shrink-0 text-blue-400" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-white">
              {user ? user.name : 'Guest Workspace'}
            </p>
            <p className="truncate text-[11px] text-slate-400">
              {user ? user.email : 'Click to sign in & sync'}
            </p>
          </div>
        </NavLink>
        <p className="mt-3 text-[11px] text-slate-500">
          Created by Ian Loe, Tactics Solutions
        </p>
      </div>
    </div>
  );

  return (
    <div className="no-print flex min-h-screen bg-slate-50 text-slate-900">
      {/* Desktop Left Sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block">{navContent}</aside>

      {/* Mobile Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/60"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative z-10 w-64 max-w-[80vw]">{navContent}</aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Utility Bar */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xs">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open navigation"
                className="rounded-md border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-50 lg:hidden"
              >
                <Menu className="h-4 w-4" aria-hidden="true" />
              </button>
              <div>
                <p className="text-xs font-medium text-slate-500">Active Scope</p>
                <p className="text-sm font-semibold text-slate-900">
                  {viewScope === 'portfolio'
                    ? `Consolidated Portfolio (${agentCount} agents)`
                    : selectedAgentName}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Scope Switch */}
              <div
                role="group"
                aria-label="Analysis scope"
                className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5"
              >
                <button
                  type="button"
                  onClick={() => onChangeScope('portfolio')}
                  className={`rounded px-2.5 py-1 text-xs font-medium ${
                    viewScope === 'portfolio'
                      ? 'bg-white text-blue-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Portfolio ({agentCount})
                </button>
                <button
                  type="button"
                  onClick={() => onChangeScope('agent')}
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
                    onClick={() => onChangeCurrency('SGD')}
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
                    onClick={() => onChangeCurrency('USD')}
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
                      if (val > 0) onChangeExchangeRate(val);
                    }}
                    className="w-14 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs tabular-nums text-slate-900 focus:border-blue-800 focus:outline-none"
                  />
                  <span>SGD</span>
                </label>
              </div>

              <button
                type="button"
                onClick={onPrint}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                Print summary
              </button>

              <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Reset
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">{children}</main>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs text-slate-500 sm:px-6">
            <span>Agentic P&amp;L Calculator</span>
            <span>Created by Ian Loe, Tactics Solutions</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
