import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Save, Zap, Activity, Search, RefreshCw } from 'lucide-react';
import { AdminAPI, IncidentAPI, errMsg } from '../../services/api';
import { EmptyState, Field, PageHeader, PageLoader, Skeleton, Spinner, Toggle } from '../../components/ui';
import { fmtDateTime } from '../../utils/format';

const ROLE_DOT = { admin: 'bg-purple-500', security: 'bg-amber-500', student: 'bg-blue-500', system: 'bg-slate-400' };

export default function Settings() {
  const [s, setS] = useState(null);
  const [busy, setBusy] = useState('');
  const [log, setLog] = useState(null);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');

  useEffect(() => { AdminAPI.settings().then((r) => setS(r.data)).catch((e) => toast.error(errMsg(e))); }, []);
  const loadLog = useCallback(() => {
    AdminAPI.activity({ q, role, limit: 80 }).then((r) => setLog(r.data)).catch((e) => { toast.error(errMsg(e)); setLog([]); });
  }, [q, role]);
  useEffect(() => { const t = setTimeout(loadLog, 300); return () => clearTimeout(t); }, [loadLog]);

  const save = async (e) => {
    e.preventDefault();
    const m = Number(s.escalationMinutes);
    if (!Number.isInteger(m) || m < 1 || m > 1440) { toast.error('Escalation time must be a whole number between 1 and 1440 minutes'); return; }
    setBusy('save');
    try {
      const r = await AdminAPI.saveSettings({ escalationMinutes: m, autoEscalation: s.autoEscalation, notifyContactsOnSOS: s.notifyContactsOnSOS, securityHotline: s.securityHotline });
      setS(r.data); toast.success('Settings saved'); loadLog();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(''); }
  };

  const runNow = async () => {
    setBusy('run');
    try { const r = await IncidentAPI.runEscalations(); toast.success(r.message); loadLog(); } catch (err) { toast.error(errMsg(err)); } finally { setBusy(''); }
  };

  if (!s) return <PageLoader />;

  return (
    <div className="space-y-6">
      <PageHeader title="System Settings & Activity" subtitle="Set up the escalation workflow and review system activity." />
      <div className="grid gap-6 lg:grid-cols-5">
        <form className="card space-y-5 p-6 lg:col-span-2" onSubmit={save}>
          <h2 className="flex items-center gap-2 font-semibold text-navy"><Zap className="h-4 w-4 text-brand-600" /> Escalation workflow</h2>
          <Toggle checked={s.autoEscalation} onChange={(v) => setS({ ...s, autoEscalation: v })} label="Automatic escalation" description="Escalate critical incidents that are not acknowledged within the time limit." />
          <Field label="Escalation time (minutes per level)" hint="After this many minutes in 'Reported', a critical incident moves up one level (max 3 levels).">
            <input type="number" min={1} max={1440} className="input" value={s.escalationMinutes} onChange={(e) => setS({ ...s, escalationMinutes: e.target.value })} />
          </Field>
          <Toggle checked={s.notifyContactsOnSOS} onChange={(v) => setS({ ...s, notifyContactsOnSOS: v })} label="Simulate trusted-contact alerts on SOS" description="Create simulated SMS records for each student's trusted contacts." />
          <Field label="Security hotline shown to students"><input className="input" maxLength={40} value={s.securityHotline} onChange={(e) => setS({ ...s, securityHotline: e.target.value })} /></Field>
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" disabled={busy === 'save'}>{busy === 'save' ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />} Save settings</button>
            <button type="button" className="btn-outline" onClick={runNow} disabled={busy === 'run'}>{busy === 'run' ? <Spinner className="h-4 w-4" /> : <Zap className="h-4 w-4" />} Run escalation check now</button>
          </div>
          <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-600">
            <p className="font-semibold text-slate-700">Escalation levels</p>
            <ol className="mt-1 list-inside list-decimal space-y-0.5">
              <li>Duty Supervisor</li><li>Chief Security Officer</li><li>Proctor Office &amp; External Emergency Services (simulated)</li>
            </ol>
          </div>
        </form>

        <div className="card flex flex-col lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
            <h2 className="flex items-center gap-2 font-semibold text-navy"><Activity className="h-4 w-4 text-brand-600" /> System activity</h2>
            <button className="btn-ghost btn-sm" onClick={loadLog}><RefreshCw className="h-3.5 w-3.5" /> Refresh</button>
          </div>
          <div className="grid gap-2 border-b border-slate-100 p-4 sm:grid-cols-3">
            <div className="relative sm:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input className="input pl-9" placeholder="Search action, user or details" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <select className="input" value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role">
              <option value="">All roles</option><option value="student">Students</option><option value="security">Security</option><option value="admin">Admins</option>
            </select>
          </div>
          <div className="max-h-[560px] flex-1 overflow-y-auto thin-scroll">
            {!log ? <div className="space-y-2 p-5">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div> : log.length ? (
              <ul className="divide-y divide-slate-100">
                {log.map((a) => (
                  <li key={a._id} className="flex gap-3 px-5 py-3">
                    <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${ROLE_DOT[a.role] || ROLE_DOT.system}`} />
                    <div className="min-w-0 flex-1 text-sm">
                      <p><b className="text-slate-800">{a.userName}</b> <span className="text-slate-600">{a.action.toLowerCase()}</span></p>
                      {a.details && <p className="truncate text-xs text-slate-500">{a.details}</p>}
                    </div>
                    <span className="shrink-0 text-xs text-slate-400">{fmtDateTime(a.createdAt)}</span>
                  </li>
                ))}
              </ul>
            ) : <EmptyState title="No activity found" />}
          </div>
        </div>
      </div>
    </div>
  );
}
