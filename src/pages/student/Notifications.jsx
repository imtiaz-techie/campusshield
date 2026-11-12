import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { BellRing, CheckCheck, MessageSquare, Zap, Info, Bell, RefreshCw } from 'lucide-react';
import { NotificationAPI, errMsg } from '../../services/api';
import { EmptyState, PageHeader, PageLoader, Pagination } from '../../components/ui';
import { fmtDateTime, timeAgo } from '../../utils/format';

const TYPE_META = {
  'Emergency Alert': { icon: BellRing, tone: 'bg-red-50 text-red-600', label: 'Contact alert (simulated)' },
  'Status Update': { icon: MessageSquare, tone: 'bg-blue-50 text-blue-600', label: 'Status update' },
  Escalation: { icon: Zap, tone: 'bg-orange-50 text-orange-600', label: 'Escalation' },
  System: { icon: Info, tone: 'bg-slate-100 text-slate-600', label: 'System' },
};
const DELIVERY = {
  Queued: 'bg-slate-100 text-slate-600 ring-slate-200',
  Sent: 'bg-blue-50 text-blue-700 ring-blue-200',
  Delivered: 'bg-green-50 text-green-700 ring-green-200',
  Failed: 'bg-red-50 text-red-700 ring-red-200',
};

export default function Notifications() {
  const [items, setItems] = useState(null);
  const [meta, setMeta] = useState(null);
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    NotificationAPI.list({ type, page, limit: 20 })
      .then((r) => { setItems(r.data); setMeta(r.meta); })
      .catch((e) => { toast.error(errMsg(e)); setItems([]); });
  }, [type, page]);

  useEffect(() => { load(); }, [load]);
  // Refresh so simulated "Sent" alerts move to "Delivered"
  useEffect(() => { const t = setInterval(load, 10000); return () => clearInterval(t); }, [load]);

  const markAll = async () => {
    try { await NotificationAPI.readAll(); toast.success('All marked as read'); load(); } catch (e) { toast.error(errMsg(e)); }
  };
  const markOne = async (n) => {
    if (n.read) return;
    try { await NotificationAPI.read(n._id); setItems((xs) => xs.map((x) => (x._id === n._id ? { ...x, read: true } : x))); } catch { /* ignore */ }
  };

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Status updates on your reports, plus the history of simulated alerts sent to your trusted contacts."
        actions={(
          <>
            <button className="btn-outline" onClick={load}><RefreshCw className="h-4 w-4" /> Refresh</button>
            <button className="btn-primary" onClick={markAll} disabled={!meta?.unread}><CheckCheck className="h-4 w-4" /> Mark all read</button>
          </>
        )}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {['', 'Emergency Alert', 'Status Update', 'Escalation', 'System'].map((t) => (
          <button key={t || 'all'} onClick={() => { setType(t); setPage(1); }} className={`btn-sm btn ${type === t ? 'bg-navy text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
            {t ? TYPE_META[t].label : 'All'}
          </button>
        ))}
      </div>
      <div className="card">
        {!items ? <PageLoader /> : items.length ? (
          <>
            <ul className="divide-y divide-slate-100">
              {items.map((n) => {
                const m = TYPE_META[n.notificationType] || TYPE_META.System;
                const Icon = m.icon;
                return (
                  <li key={n._id} onMouseEnter={() => markOne(n)} className={`flex gap-4 px-5 py-4 ${n.read ? '' : 'bg-brand-50/40'}`}>
                    <span className={`h-fit rounded-xl p-2.5 ${m.tone}`}><Icon className="h-5 w-5" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800">{n.notificationType === 'Emergency Alert' ? `To ${n.contactName}` : m.label}</span>
                        {n.notificationType === 'Emergency Alert' && <span className="text-xs text-slate-500">{n.channel} · {n.contactPhone}</span>}
                        {!n.read && <span className="h-2 w-2 rounded-full bg-brand-600" aria-label="Unread" />}
                      </div>
                      <p className="mt-0.5 text-sm text-slate-600">{n.message}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <span title={fmtDateTime(n.createdAt)}>{timeAgo(n.createdAt)}</span>
                        {n.incidentId && <Link to={`/student/incidents/${n.incidentId}`} className="font-mono font-semibold text-brand-600 hover:underline">{n.incidentId}</Link>}
                        <span className={`badge ${DELIVERY[n.notificationStatus]}`}>{n.notificationStatus}</span>
                        {n.deliveredAt && <span>Delivered {fmtDateTime(n.deliveredAt)}</span>}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <Pagination meta={meta} onPage={setPage} />
          </>
        ) : <EmptyState icon={Bell} title="No notifications" message="Updates about your reports and contact alerts will show up here." />}
      </div>
    </div>
  );
}
