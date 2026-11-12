import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ListChecks, Clock, Activity, CheckCircle2, AlertOctagon, Zap, Timer, RefreshCw, Users, ShieldCheck, BellRing, ArrowRight,
} from 'lucide-react';
import { AnalyticsAPI, IncidentAPI, errMsg } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, PageLoader, PriorityBadge, StatCard, StatusBadge, Spinner, EmptyState } from '../../components/ui';
import { ChartCard, TrendChart, CategoryBarChart, PriorityChart, ResolutionDonut } from '../../components/Charts';
import IncidentMap, { MapLegend } from '../../components/IncidentMap';
import { fmtMinutes, timeAgo } from '../../utils/format';

export default function StaffDashboard() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const base = `/${user.role}`;
  const navigate = useNavigate();
  const [s, setS] = useState(null);
  const [mapItems, setMapItems] = useState([]);
  const [escalations, setEscalations] = useState([]);
  const [checking, setChecking] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);

  const load = useCallback(() => {
    Promise.all([AnalyticsAPI.summary(), IncidentAPI.map({ status: 'open' }), IncidentAPI.recentEscalations()])
      .then(([a, m, e]) => { setS(a.data); setMapItems(m.data); setEscalations(e.data); setUpdatedAt(new Date()); })
      .catch((err) => toast.error(errMsg(err)));
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, [load]);

  const runCheck = async () => {
    setChecking(true);
    try { const r = await IncidentAPI.runEscalations(); toast.success(r.message); load(); } catch (e) { toast.error(errMsg(e)); } finally { setChecking(false); }
  };

  if (!s) return <PageLoader label="Loading dashboard..." />;
  const t = s.totals;
  const go = (q) => navigate(`${base}/incidents${q}`);

  return (
    <div className="space-y-6">
      <PageHeader
        title={isAdmin ? 'Administrator Dashboard' : 'Security Command Center'}
        subtitle={`Live campus incident overview${updatedAt ? ` · updated ${timeAgo(updatedAt)}` : ''}`}
        actions={(
          <>
            <button className="btn-outline" onClick={load}><RefreshCw className="h-4 w-4" /> Refresh</button>
            <button className="btn-dark" onClick={runCheck} disabled={checking}>{checking ? <Spinner className="h-4 w-4" /> : <Zap className="h-4 w-4" />} Run escalation check</button>
          </>
        )}
      />

      {t.critical > 0 && (
        <button onClick={() => go('?priority=Critical&status=open')} className="flex w-full items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-red-600 to-red-700 p-4 text-left text-white shadow-lg shadow-red-600/20">
          <span className="flex items-center gap-3">
            <span className="relative flex h-3 w-3"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" /><span className="relative inline-flex h-3 w-3 rounded-full bg-white" /></span>
            <span><b>{t.critical} critical incident{t.critical > 1 ? 's' : ''}</b> need{t.critical === 1 ? 's' : ''} attention{t.escalated ? ` · ${t.escalated} auto-escalated` : ''}</span>
          </span>
          <ArrowRight className="h-5 w-5" />
        </button>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total incidents" value={t.total} icon={ListChecks} tone="brand" hint={`${t.today} today · ${t.sos} via SOS`} onClick={() => go('')} />
        <StatCard label="Pending" value={t.pending} icon={Clock} tone="red" hint="Awaiting acknowledgement" onClick={() => go('?status=Reported')} />
        <StatCard label="Active" value={t.active} icon={Activity} tone="indigo" hint="Being handled" onClick={() => go('?status=open')} />
        <StatCard label="Resolved" value={t.resolved} icon={CheckCircle2} tone="green" hint="Resolved or closed" onClick={() => go('?status=done')} />
        <StatCard label="Critical (open)" value={t.critical} icon={AlertOctagon} tone="orange" hint={`${t.criticalAll} critical in total`} onClick={() => go('?priority=Critical&status=open')} />
      </div>

      {isAdmin && s.users && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Students" value={s.users.students} icon={Users} tone="slate" onClick={() => navigate('/admin/users?role=student')} />
          <StatCard label="Security staff" value={s.users.security} icon={ShieldCheck} tone="slate" onClick={() => navigate('/admin/users?role=security')} />
          <StatCard label="Simulated contact alerts" value={s.simulatedAlerts} icon={BellRing} tone="slate" />
          <StatCard label="Auto-escalations" value={s.autoEscalations} icon={Zap} tone="slate" />
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="card p-5 xl:col-span-2">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-semibold text-navy">Open incident locations</h3>
              <p className="text-xs text-slate-500">{mapItems.length} active incidents with shared (simulated) coordinates</p>
            </div>
            <Link to={`${base}/map`} className="text-sm font-semibold text-brand-600 hover:underline">Full map</Link>
          </div>
          <IncidentMap incidents={mapItems} height={360} zoom={16} linkBase={`${base}/incidents`} />
          <div className="mt-3"><MapLegend /></div>
        </div>
        <div className="card flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h3 className="font-semibold text-navy">Recent reports</h3>
            <Link to={`${base}/incidents`} className="text-sm font-semibold text-brand-600 hover:underline">All</Link>
          </div>
          <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto thin-scroll" style={{ maxHeight: 440 }}>
            {s.recent.map((i) => (
              <li key={i._id}>
                <Link to={`${base}/incidents/${i.incidentId}`} className="block px-5 py-3 hover:bg-slate-50">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-brand-600">{i.incidentId}{i.isSOS ? ' · SOS' : ''}</span>
                    <span className="text-xs text-slate-400">{timeAgo(i.createdAt)}</span>
                  </div>
                  <p className="truncate text-sm font-medium text-slate-800">{i.title}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5"><PriorityBadge priority={i.priority} /><StatusBadge status={i.status} /></div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Emergency activity" subtitle="Incidents reported vs resolved per month"><TrendChart data={s.monthly} /></ChartCard>
        <ChartCard title="Incidents by category"><CategoryBarChart data={s.byCategory} /></ChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard title="Priority distribution"><PriorityChart data={s.byPriority} /></ChartCard>
        <ChartCard title="Resolution rate"><ResolutionDonut data={s.resolvedVsUnresolved} /></ChartCard>
        <div className="card p-5">
          <h3 className="font-semibold text-navy">Response performance</h3>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-brand-50 p-4"><Timer className="h-5 w-5 text-brand-600" /><p className="mt-2 text-2xl font-bold text-navy">{fmtMinutes(s.avgResponseMinutes)}</p><p className="text-xs text-slate-500">Avg. time to acknowledge</p></div>
            <div className="rounded-xl bg-green-50 p-4"><CheckCircle2 className="h-5 w-5 text-success" /><p className="mt-2 text-2xl font-bold text-navy">{fmtMinutes(s.avgResolutionMinutes)}</p><p className="text-xs text-slate-500">Avg. time to resolve</p></div>
          </div>
          <h4 className="mt-5 text-sm font-semibold text-navy">Escalation feed</h4>
          {escalations.length ? (
            <ul className="mt-2 space-y-2">
              {escalations.slice(0, 4).map((e) => (
                <li key={e._id}>
                  <Link to={`${base}/incidents/${e.incidentId}`} className="flex items-start justify-between gap-2 rounded-lg p-2 text-xs hover:bg-slate-50">
                    <span><b className="font-mono text-brand-600">{e.incidentId}</b> <span className="text-slate-600">{e.escalationStatus}{e.level ? ` (L${e.level})` : ''}</span></span>
                    <span className="shrink-0 text-slate-400">{timeAgo(e.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <EmptyState title="No escalations" />}
        </div>
      </div>
    </div>
  );
}
