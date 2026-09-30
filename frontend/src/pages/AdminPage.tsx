/**
 * Admin Dashboard — system stats, HF health, and full generations table.
 * Backend enforces admin access; frontend just handles 403.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  adminDeleteGeneration,
  adminListGenerations,
  checkHFHealth,
  getAdminStats,
  type AdminStats,
  type Generation,
} from '../services/api';

const IconTrash = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
  </svg>
);

export default function AdminPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats]               = useState<AdminStats | null>(null);
  const [generations, setGenerations]   = useState<Generation[]>([]);
  const [total, setTotal]               = useState(0);
  const [hfHealth, setHfHealth]         = useState<{ huggingface_api: string; model_id: string } | null>(null);
  const [loading, setLoading]           = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError]               = useState('');

  useEffect(() => {
    if (!authLoading && !user) navigate('/login', { replace: true });
  }, [user, authLoading, navigate]);

  useEffect(() => { if (user) load(); }, [user]);

  const load = async () => {
    setLoading(true);
    try {
      const [s, g, h] = await Promise.all([
        getAdminStats(),
        adminListGenerations(0, 50),
        checkHFHealth().catch(() => null),
      ]);
      setStats(s);
      setGenerations(g.generations);
      setTotal(g.total);
      setHfHealth(h);
    } catch (err: any) {
      if (err.response?.status === 403) setAccessDenied(true);
      else setError('Failed to load admin data.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = async (val: string) => {
    setStatusFilter(val);
    try {
      const data = await adminListGenerations(0, 50, val || undefined);
      setGenerations(data.generations);
      setTotal(data.total);
    } catch { /* silent */ }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this generation?')) return;
    try {
      await adminDeleteGeneration(id);
      setGenerations(prev => prev.filter(g => g.id !== id));
      setTotal(prev => prev - 1);
      const s = await getAdminStats();
      setStats(s);
    } catch { /* silent */ }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const badgeClass = (s: string) =>
    s === 'completed'  ? 'badge badge-completed'  :
    s === 'processing' ? 'badge badge-processing' :
    s === 'failed'     ? 'badge badge-failed'     :
    'badge badge-pending';

  if (authLoading || loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="admin-page">

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="admin-header">
        <div className="header-brand">
          <div className="brand-mark" />
          AI Profile Studio
          <span className="badge badge-admin">Admin</span>
        </div>
        <div className="header-actions">
          <button onClick={() => navigate('/dashboard')} className="btn-ghost">Dashboard</button>
          <button onClick={handleLogout} className="btn-ghost" id="logout-button">Sign out</button>
        </div>
      </header>

      {/* ── Access Denied ──────────────────────────────────────── */}
      {accessDenied && (
        <div className="access-denied">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          <p className="access-denied-title">Access denied</p>
          <p className="access-denied-sub">You don't have admin privileges.</p>
          <button onClick={() => navigate('/dashboard')} className="btn-secondary" style={{ width: 'auto', marginTop: 8 }}>
            Go to Dashboard
          </button>
        </div>
      )}

      {!accessDenied && (
        <main className="admin-main">

          {/* Error */}
          {error && <div className="alert alert-error">{error}</div>}

          {/* ── Stats ────────────────────────────────────────── */}
          {stats && (
            <section>
              <p className="panel-section-title" style={{ marginBottom: 12 }}>Overview</p>
              <div className="stats-row">
                {([
                  { label: 'Users',      value: stats.total_users },
                  { label: 'Total',      value: stats.total_generations },
                  { label: 'Completed',  value: stats.completed_generations },
                  { label: 'Failed',     value: stats.failed_generations },
                  { label: 'Pending',    value: stats.pending_generations },
                  { label: 'Processing', value: stats.processing_generations },
                ] as { label: string; value: number }[]).map(s => (
                  <div key={s.label} className="stat-box">
                    <span className="stat-value">{s.value}</span>
                    <span className="stat-label">{s.label}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Health ───────────────────────────────────────── */}
          {hfHealth && (
            <section>
              <p className="panel-section-title" style={{ marginBottom: 12 }}>System health</p>
              <div className="health-row">
                <div className="health-chip">
                  <span className={`health-dot ${hfHealth.huggingface_api === 'healthy' ? 'ok' : 'err'}`} />
                  <span>HuggingFace API</span>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>{hfHealth.huggingface_api}</span>
                </div>
                <div className="health-chip">
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                    {hfHealth.model_id}
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* ── Generations Table ─────────────────────────────── */}
          <section>
            <div className="admin-card">
              <div className="admin-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="section-title">Generations</span>
                  <span className="section-sub">({total})</span>
                </div>
                <select
                  value={statusFilter}
                  onChange={e => handleFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              {generations.length === 0 ? (
                <div className="history-empty" style={{ padding: '48px 0' }}>
                  <span>No generations found</span>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>User</th>
                        <th>Style</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {generations.map(gen => (
                        <tr key={gen.id}>
                          <td className="td-muted">#{gen.id}</td>
                          <td className="td-muted" title={gen.user_id}>{gen.user_id.slice(0, 8)}…</td>
                          <td><span className="style-pill">{gen.style}</span></td>
                          <td><span className={badgeClass(gen.status)}>{gen.status}</span></td>
                          <td className="td-muted">
                            {new Date(gen.created_at).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </td>
                          <td>
                            <button
                              onClick={() => handleDelete(gen.id)}
                              className="btn-icon danger"
                              title="Delete"
                            >
                              <IconTrash />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

        </main>
      )}
    </div>
  );
}
