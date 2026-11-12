import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, MapPin, Calendar, User, Phone, Zap, Gauge, Lightbulb, BellRing, ClipboardList, Flag, UserCheck, ShieldOff, Siren, RefreshCw, StickyNote,
} from 'lucide-react';
import { CategoryAPI, IncidentAPI, UserAPI, errMsg } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { CategoryIcon, ConfirmDialog, EmptyState, Field, PageLoader, PriorityBadge, Spinner, StatusBadge } from '../../components/ui';
import Timeline, { StatusProgress } from '../../components/Timeline';
import IncidentMap from '../../components/IncidentMap';
import { PRIORITIES } from '../../utils/constants';
import { fmtDateTime, timeAgo } from '../../utils/format';

const ESC_STYLE = {
  'Immediate Attention': 'bg-red-600 text-white ring-red-600',
  'Auto-Escalated': 'bg-orange-500 text-white ring-orange-500',
  Analyzed: 'bg-blue-50 text-blue-700 ring-blue-200',
  Acknowledged: 'bg-amber-50 text-amber-700 ring-amber-200',
  Resolved: 'bg-green-50 text-green-700 ring-green-200',
};

function Section({ title, icon: Icon, children, action }) {
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold text-navy">{Icon && <Icon className="h-4 w-4 text-brand-600" />}{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function StaffControls({ data, onUpdated }) {
  const { incident, allowedStatuses } = data;
  const [officers, setOfficers] = useState([]);
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState(incident.priority);
  const [reason, setReason] = useState('');
  const [assignee, setAssignee] = useState(incident.assignedTo?._id || '');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState('');

  useEffect(() => { UserAPI.officers().then((r) => setOfficers(r.data)).catch(() => {}); }, []);
  useEffect(() => { setPriority(incident.priority); setAssignee(incident.assignedTo?._id || ''); setStatus(''); }, [incident.priority, incident.assignedTo, incident.status]);

  const run = async (kind, fn, success) => {
    setBusy(kind);
    try {
      const r = await fn();
      toast.success(r.message || success);
      onUpdated();
      return true;
    } catch (e) {
      toast.error(errMsg(e));
      return false;
    } finally {
      setBusy('');
    }
  };

  const needsNotes = ['Resolved', 'Closed'].includes(status);

  return (
    <div className="space-y-6">
      <Section title="Update status" icon={ClipboardList}>
        {allowedStatuses.length ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {allowedStatuses.map((s) => (
                <button key={s} onClick={() => setStatus(s)} className={`btn-sm btn border ${status === s ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>{s}</button>
              ))}
            </div>
            <Field label={`Response notes${needsNotes ? ' (required)' : ' (optional)'}`} htmlFor="notes">
              <textarea id="notes" rows={3} maxLength={1000} className="input" placeholder="e.g. Patrol unit 2 dispatched to the main gate" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            <button
              className="btn-primary w-full"
              disabled={!status || busy === 'status' || (needsNotes && !notes.trim())}
              onClick={() => setConfirm(true)}
            >
              {busy === 'status' && <Spinner className="h-4 w-4" />} Update to {status || '...'}
            </button>
          </div>
        ) : <p className="text-sm text-slate-500">This incident is closed. No further status changes are possible.</p>}
      </Section>

      <Section title="Priority classification" icon={Flag}>
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-1.5">
            {PRIORITIES.map((p) => (
              <button key={p} onClick={() => setPriority(p)} className={`rounded-lg border px-1 py-2 text-xs font-semibold ${priority === p ? 'border-navy bg-navy text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{p}</button>
            ))}
          </div>
          {priority !== incident.priority && (
            <>
              <input className="input" placeholder="Reason for manual change (required)" value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} />
              <button
                className="btn-dark w-full"
                disabled={!reason.trim() || busy === 'priority'}
                onClick={async () => { if (await run('priority', () => IncidentAPI.priority(incident.incidentId, { priority, reason }))) setReason(''); }}
              >
                {busy === 'priority' && <Spinner className="h-4 w-4" />} Change {incident.priority} to {priority}
              </button>
            </>
          )}
          {incident.priorityOverridden && <p className="text-xs text-slate-500">Priority was changed manually from the automatic rating.</p>}
        </div>
      </Section>

      <Section title="Assign responder" icon={UserCheck}>
        <div className="flex gap-2">
          <select className="input" value={assignee} onChange={(e) => setAssignee(e.target.value)} aria-label="Assign officer">
            <option value="">Unassigned</option>
            {officers.map((o) => <option key={o._id} value={o._id}>{o.name} ({o.openAssignments} open)</option>)}
          </select>
          <button
            className="btn-outline"
            disabled={busy === 'assign' || assignee === (incident.assignedTo?._id || '')}
            onClick={() => run('assign', () => IncidentAPI.assign(incident.incidentId, { assignedTo: assignee || null }))}
          >
            {busy === 'assign' ? <Spinner className="h-4 w-4" /> : 'Save'}
          </button>
        </div>
      </Section>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        loading={busy === 'status'}
        tone="primary"
        title="Confirm status update"
        confirmLabel="Update status"
        message={`Change ${incident.incidentId} from "${incident.status}" to "${status}"? The student will be notified and the change will be recorded in the incident history.`}
        onConfirm={async () => { if (await run('status', () => IncidentAPI.status(incident.incidentId, { status, notes }))) { setNotes(''); setConfirm(false); } else setConfirm(false); }}
      />
    </div>
  );
}

export default function IncidentDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const staff = user.role !== 'student';
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [category, setCategory] = useState(null);

  const load = useCallback(() => {
    IncidentAPI.get(id).then((r) => setData(r.data)).catch((e) => setError(errMsg(e)));
  }, [id]);

  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);
  useEffect(() => {
    if (!data) return;
    CategoryAPI.list().then((r) => setCategory(r.data.find((c) => c.key === data.incident.category))).catch(() => {});
  }, [data?.incident.category]); // eslint-disable-line react-hooks/exhaustive-deps

  const back = `/${user.role}/incidents`;
  if (error) return <div className="card"><EmptyState title="Unable to open incident" message={error} action={<Link to={back} className="btn-primary">Back to incidents</Link>} /></div>;
  if (!data) return <PageLoader />;

  const { incident: i, history, escalations, notifications, nextAction } = data;
  const latestEsc = escalations[0];

  return (
    <div className="space-y-6">
      <div>
        <Link to={back} className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-brand-600"><ArrowLeft className="h-4 w-4" /> Back to incidents</Link>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4">
            <CategoryIcon icon={category?.icon} color={category?.color} size="lg" />
            <div>
              <p className="flex flex-wrap items-center gap-2 font-mono text-sm font-semibold text-brand-600">
                {i.incidentId}
                {i.isSOS && <span className="badge bg-red-600 font-sans text-white ring-red-600"><Siren className="h-3 w-3" /> SOS</span>}
                {i.escalationLevel > 0 && <span className="badge bg-orange-500 font-sans text-white ring-orange-500"><Zap className="h-3 w-3" /> Escalated L{i.escalationLevel}</span>}
              </p>
              <h1 className="text-xl font-bold text-navy sm:text-2xl">{i.title}</h1>
              <p className="text-sm text-slate-500">{i.categoryName} · reported {timeAgo(i.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PriorityBadge priority={i.priority} />
            <StatusBadge status={i.status} />
            <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" onClick={load} aria-label="Refresh"><RefreshCw className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      <div className="card p-5"><StatusProgress status={i.status} /></div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {staff && (
            <div className={`card overflow-hidden ${i.priority === 'Critical' && i.status === 'Reported' ? 'ring-2 ring-red-500' : ''}`}>
              <div className="flex flex-wrap items-center justify-between gap-2 bg-navy px-5 py-3 text-white">
                <h2 className="flex items-center gap-2 font-semibold"><Zap className="h-4 w-4 text-warning" /> Escalation engine recommendation</h2>
                {latestEsc && <span className={`badge ${ESC_STYLE[latestEsc.escalationStatus]}`}>{latestEsc.escalationStatus}</span>}
              </div>
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <div><p className="text-xs uppercase text-slate-500">Response category</p><p className="font-semibold text-slate-800">{i.responseCategory}</p></div>
                <div><p className="text-xs uppercase text-slate-500">Escalation level</p><p className="font-semibold text-slate-800">{i.escalationLevel ? `Level ${i.escalationLevel}` : 'Not escalated'}</p></div>
                <div className="sm:col-span-2"><p className="text-xs uppercase text-slate-500">Recommended action</p><p className="text-slate-800">{i.recommendedAction}</p></div>
                <div className="flex gap-3 rounded-xl bg-brand-50 p-3 sm:col-span-2">
                  <Lightbulb className="h-5 w-5 shrink-0 text-brand-600" />
                  <div><p className="text-xs font-semibold uppercase text-brand-700">Next step</p><p className="text-sm text-brand-900">{nextAction}</p></div>
                </div>
                {latestEsc?.nextSteps?.length > 0 && (
                  <div className="sm:col-span-2">
                    <p className="mb-1 text-xs uppercase text-slate-500">Response checklist</p>
                    <ol className="list-inside list-decimal space-y-1 text-sm text-slate-700">{latestEsc.nextSteps.map((s) => <li key={s}>{s}</li>)}</ol>
                  </div>
                )}
              </div>
            </div>
          )}

          <Section title="Incident details" icon={ClipboardList}>
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{i.description}</p>
            {i.notes && (
              <div className="mt-4 flex gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600"><StickyNote className="h-4 w-4 shrink-0 text-slate-400" /> {i.notes}</div>
            )}
            <dl className="mt-5 grid gap-4 border-t border-slate-100 pt-5 text-sm sm:grid-cols-2">
              <div className="flex gap-2"><MapPin className="h-4 w-4 text-slate-400" /><div><dt className="text-xs text-slate-500">Location</dt><dd className="font-medium">{i.location || '-'}</dd></div></div>
              <div className="flex gap-2"><Calendar className="h-4 w-4 text-slate-400" /><div><dt className="text-xs text-slate-500">Incident date & time</dt><dd className="font-medium">{fmtDateTime(i.incidentDate)}</dd></div></div>
              <div className="flex gap-2"><UserCheck className="h-4 w-4 text-slate-400" /><div><dt className="text-xs text-slate-500">Assigned responder</dt><dd className="font-medium">{i.assignedTo?.name || 'Not yet assigned'}</dd></div></div>
              <div className="flex gap-2"><Gauge className="h-4 w-4 text-slate-400" /><div><dt className="text-xs text-slate-500">Last updated</dt><dd className="font-medium">{fmtDateTime(i.updatedAt)}</dd></div></div>
            </dl>
          </Section>

          <Section title="Shared location" icon={MapPin}>
            {i.locationShared ? (
              <>
                <p className="mb-3 font-mono text-sm text-slate-600">Lat {i.latitude.toFixed(6)} · Lng {i.longitude.toFixed(6)} <span className="font-sans text-xs text-slate-400">(simulated)</span></p>
                <IncidentMap single incidents={[i]} height={280} />
              </>
            ) : (
              <p className="flex items-center gap-2 text-sm text-slate-500"><ShieldOff className="h-4 w-4" /> The student chose not to share coordinates for this report.</p>
            )}
          </Section>

          {staff && (
            <Section title="Priority reasoning" icon={Gauge}>
              <ul className="list-inside list-disc space-y-1 text-sm text-slate-600">{(i.priorityReasons || []).map((r, k) => <li key={k}>{r}</li>)}</ul>
            </Section>
          )}

          <Section title="Incident history" icon={ClipboardList}>
            <Timeline items={history} />
          </Section>
        </div>

        <div className="space-y-6">
          {staff && (
            <Section title="Reporter" icon={User}>
              <p className="font-semibold text-slate-800">{i.studentId?.name}</p>
              <p className="font-mono text-sm text-slate-500">{i.studentId?.studentId}</p>
              <p className="text-sm text-slate-500">{i.studentId?.department}</p>
              <p className="mt-2 flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-slate-400" /><span className="font-mono">{i.studentId?.phone}</span></p>
            </Section>
          )}
          {staff && <StaffControls data={data} onUpdated={load} />}

          <Section title="Contact notifications" icon={BellRing}>
            {notifications.length ? (
              <ul className="space-y-3">
                {notifications.map((n) => (
                  <li key={n._id} className="rounded-xl border border-slate-100 p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <b className="text-slate-800">{n.contactName}</b>
                      <span className={`badge ${n.notificationStatus === 'Delivered' ? 'bg-green-50 text-green-700 ring-green-200' : 'bg-blue-50 text-blue-700 ring-blue-200'}`}>{n.notificationStatus}</span>
                    </div>
                    <p className="text-xs text-slate-500">{n.channel} · {n.contactPhone}</p>
                    <p className="mt-1 text-xs text-slate-400">Sent {fmtDateTime(n.createdAt)}{n.deliveredAt ? ` · Delivered ${fmtDateTime(n.deliveredAt)}` : ''}</p>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-slate-500">No trusted-contact alerts were simulated for this incident.</p>}
            <p className="mt-3 text-xs text-slate-400">Simulation only. No real SMS was sent.</p>
          </Section>

          {staff && escalations.length > 0 && (
            <Section title="Escalation log" icon={Zap}>
              <ul className="space-y-3">
                {escalations.map((e) => (
                  <li key={e._id} className="text-sm">
                    <div className="flex items-center justify-between gap-2"><span className={`badge ${ESC_STYLE[e.escalationStatus]}`}>{e.escalationStatus}</span><span className="text-xs text-slate-400">{timeAgo(e.createdAt)}</span></div>
                    <p className="mt-1 text-xs text-slate-600">{e.reasons?.[0]}</p>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
