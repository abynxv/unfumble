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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertCircle,
  ArrowLeft,
  Activity,
  Loader2,
  Lock,
  Trash2,
  Users,
  ImageIcon,
  CheckCircle2,
  XCircle,
  Clock,
  Cpu,
} from 'lucide-react';

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

  const statusBadgeVariant = (s: string) => {
    switch (s) {
      case 'completed': return 'default';
      case 'processing': return 'secondary';
      case 'failed': return 'destructive';
      default: return 'outline';
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col font-sans">

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-background border-b border-border shadow-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center size-8 bg-primary text-primary-foreground rounded-md text-sm font-bold">U</span>
              <span className="text-xl font-bold tracking-tighter">unfumble</span>
            </div>
            <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-semibold border-primary/40 text-primary">
              Admin
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="mr-1.5 size-3.5" />
              Dashboard
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>Sign out</Button>
          </div>
        </div>
      </header>

      {/* ── Access Denied ──────────────────────────────────────── */}
      {accessDenied && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-12 text-center">
          <div className="size-16 rounded-full bg-muted flex items-center justify-center">
            <Lock className="size-7 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Access denied</h2>
          <p className="text-sm text-muted-foreground">You don't have admin privileges.</p>
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="mt-2">
            Go to Dashboard
          </Button>
        </div>
      )}

      {!accessDenied && (
        <main className="flex-1 mx-auto max-w-6xl w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* ── Stats ────────────────────────────────────────── */}
          {stats && (
            <section className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Overview</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {([
                  { label: 'Users',      value: stats.total_users,              icon: <Users className="size-4" />,        color: 'text-primary' },
                  { label: 'Total',      value: stats.total_generations,        icon: <ImageIcon className="size-4" />,    color: 'text-foreground' },
                  { label: 'Completed',  value: stats.completed_generations,    icon: <CheckCircle2 className="size-4" />, color: 'text-emerald-600' },
                  { label: 'Failed',     value: stats.failed_generations,       icon: <XCircle className="size-4" />,      color: 'text-destructive' },
                  { label: 'Pending',    value: stats.pending_generations,      icon: <Clock className="size-4" />,        color: 'text-amber-500' },
                  { label: 'Processing', value: stats.processing_generations,   icon: <Loader2 className="size-4" />,      color: 'text-blue-500' },
                ] as { label: string; value: number; icon: React.ReactNode; color: string }[]).map(s => (
                  <Card key={s.label} className="bg-card">
                    <CardContent className="pt-4 pb-3 px-4 flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{s.label}</span>
                        <span className={s.color}>{s.icon}</span>
                      </div>
                      <span className="text-2xl font-extrabold tracking-tight text-foreground">{s.value}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* ── Health ───────────────────────────────────────── */}
          {hfHealth && (
            <section className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">System Health</h3>
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium">
                  <span className={`size-2.5 rounded-full ${hfHealth.huggingface_api === 'healthy' ? 'bg-emerald-500' : 'bg-destructive'} animate-pulse`} />
                  <Activity className="size-3.5 text-muted-foreground" />
                  <span>HuggingFace API</span>
                  <Badge variant={hfHealth.huggingface_api === 'healthy' ? 'default' : 'destructive'} className="text-[10px] px-1.5 py-0">
                    {hfHealth.huggingface_api}
                  </Badge>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm">
                  <Cpu className="size-3.5 text-muted-foreground" />
                  <code className="text-xs text-muted-foreground font-mono">{hfHealth.model_id}</code>
                </div>
              </div>
            </section>
          )}

          {/* ── Generations Table ─────────────────────────────── */}
          <section className="flex flex-col gap-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between border-b py-3 px-5">
                <div className="flex items-center gap-2.5">
                  <CardTitle className="text-base font-semibold">Generations</CardTitle>
                  <span className="text-sm text-muted-foreground font-medium">({total})</span>
                </div>
                <select
                  value={statusFilter}
                  onChange={e => handleFilter(e.target.value)}
                  className="text-sm font-medium text-muted-foreground bg-muted border border-border rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 cursor-pointer transition-all"
                >
                  <option value="">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>
              </CardHeader>

              <CardContent className="p-0">
                {generations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                    <div className="size-12 rounded-full bg-muted flex items-center justify-center">
                      <ImageIcon className="size-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">No generations found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/40">
                          <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 py-3">ID</th>
                          <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 py-3">User</th>
                          <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 py-3">Style</th>
                          <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 py-3">Status</th>
                          <th className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 py-3">Created</th>
                          <th className="w-12 px-3 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {generations.map(gen => (
                          <tr key={gen.id} className="group transition-colors hover:bg-muted/30">
                            <td className="px-5 py-3 font-mono text-xs text-muted-foreground">#{gen.id}</td>
                            <td className="px-5 py-3 font-mono text-xs text-muted-foreground" title={gen.user_id}>
                              {gen.user_id.slice(0, 8)}…
                            </td>
                            <td className="px-5 py-3">
                              <Badge variant="secondary" className="capitalize text-xs font-medium">
                                {gen.style.replace(/_/g, ' ')}
                              </Badge>
                            </td>
                            <td className="px-5 py-3">
                              <Badge variant={statusBadgeVariant(gen.status) as any} className="capitalize text-xs">
                                {gen.status}
                              </Badge>
                            </td>
                            <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(gen.created_at).toLocaleDateString('en-US', {
                                month: 'short', day: 'numeric',
                                hour: '2-digit', minute: '2-digit',
                              })}
                            </td>
                            <td className="px-3 py-3">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleDelete(gen.id)}
                                title="Delete"
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

        </main>
      )}
    </div>
  );
}
