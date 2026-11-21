import { Shield, Trash2, UserPlus } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  type AdminUserRecord,
  type AuthUser,
  createAdminUser,
  deleteAdminUser,
  fetchAdminUsers,
  updateAdminUserRole,
} from '../utils/api';

interface AdminPanelProps {
  currentUser: AuthUser | null;
}

export function AdminPanel({ currentUser }: AdminPanelProps) {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [submitting, setSubmitting] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchAdminUsers();
      setUsers(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser?.role !== 'admin') return;
    let active = true;
    fetchAdminUsers()
      .then((list) => {
        if (active) setUsers(list);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load users.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [currentUser]);

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
        <Shield className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
        <h2 className="mt-3 text-sm font-semibold text-slate-900">Administrator Access Only</h2>
        <p className="mt-1 text-xs text-slate-500">
          Sign in with an administrator account on the Saved &amp; History page to manage users.
        </p>
      </div>
    );
  }

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createAdminUser({ email, name, password, role });
      setEmail('');
      setName('');
      setPassword('');
      setRole('user');
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleRole = async (u: AdminUserRecord) => {
    setError(null);
    try {
      const nextRole = u.role === 'admin' ? 'user' : 'admin';
      await updateAdminUserRole(u.id, nextRole);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user role.');
    }
  };

  const handleDeleteUser = async (u: AdminUserRecord) => {
    setError(null);
    try {
      await deleteAdminUser(u.id);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Add User Form */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-blue-900" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-slate-900">Provision New User</h2>
        </div>
        <p className="mt-0.5 text-xs text-slate-500">
          Public registration is disabled. Manually create user or administrator accounts here.
        </p>

        <form onSubmit={handleCreateUser} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="block text-xs font-medium text-slate-700">Email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-800 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">Full name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Tan"
              className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-800 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">Initial password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-800 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value === 'admin' ? 'admin' : 'user')}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-800 focus:outline-none"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-blue-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
            >
              <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
              {submitting ? 'Creating...' : 'Add user'}
            </button>
          </div>
        </form>

        {error && (
          <p role="alert" className="mt-3 rounded bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}
      </div>

      {/* Users Table */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">
          Registered Users ({users.length})
        </h2>

        {loading ? (
          <p className="py-6 text-center text-xs text-slate-400">Loading users...</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs tabular-nums">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3 font-medium">User</th>
                  <th className="py-2 px-3 font-medium">Role</th>
                  <th className="py-2 px-3 font-medium">Created</th>
                  <th className="py-2 pl-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isSelf = u.id === currentUser.id;
                  return (
                    <tr key={u.id}>
                      <td className="py-2.5 pr-3">
                        <p className="font-medium text-slate-900">
                          {u.name} {isSelf && <span className="text-slate-400">(You)</span>}
                        </p>
                        <p className="text-[11px] text-slate-500">{u.email}</p>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            u.role === 'admin'
                              ? 'bg-blue-50 text-blue-900 ring-1 ring-blue-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {u.role === 'admin' ? 'Admin' : 'User'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {new Date(u.created_at).toLocaleDateString('en-GB')}
                      </td>
                      <td className="py-2.5 pl-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => handleToggleRole(u)}
                            className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {u.role === 'admin' ? 'Set as User' : 'Make Admin'}
                          </button>
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => handleDeleteUser(u)}
                            aria-label={`Delete user ${u.email}`}
                            className="rounded border border-slate-200 p-1 text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
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
          </div>
        )}
      </div>
    </div>
  );
}
