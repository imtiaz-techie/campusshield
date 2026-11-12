import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { BellRing, Search, RefreshCw } from 'lucide-react';
import { NotificationAPI, errMsg } from '../../services/api';
import { EmptyState, PageHeader, Pagination, Skeleton } from '../../components/ui';
import { fmtDateTime } from '../../utils/format';

/** Security view of all simulated trusted-contact notifications. */
export default function ContactAlerts() {
  const [items, setItems] = useState(null);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    NotificationAPI.list({ type: 'Emergency Alert', incidentId: search, page, limit: 20 })
      .then((r) => { setItems(r.data); setMeta(r.meta); })
      .catch((e) => { toast.error(errMsg(e)); setItems([]); });
  }, [page, search]);
  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <PageHeader title="Emergency Contact Alerts" subtitle="History of simulated notifications sent to students' trusted contacts." actions={<button className="btn-outline" onClick={load}><RefreshCw className="h-4 w-4" /> Refresh</button>} />
      <form className="card mb-4 flex gap-2 p-4" onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(q.trim()); }}>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Filter by incident ID" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button className="btn-primary">Search</button>
      </form>
      <div className="card overflow-hidden">
        {!items ? <div className="space-y-3 p-5">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div> : items.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50"><tr><th className="table-th">Incident</th><th className="table-th">Student</th><th className="table-th">Contact</th><th className="table-th">Channel</th><th className="table-th">Status</th><th className="table-th">Sent</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((n) => (
                    <tr key={n._id}>
                      <td className="table-td"><Link to={`/security/incidents/${n.incidentId}`} className="font-mono text-xs font-semibold text-brand-600">{n.incidentId}</Link></td>
                      <td className="table-td text-xs">{n.recipientUser?.name}<br /><span className="font-mono text-slate-400">{n.recipientUser?.studentId}</span></td>
                      <td className="table-td text-xs"><b>{n.contactName}</b><br /><span className="font-mono text-slate-400">{n.contactPhone}</span></td>
                      <td className="table-td text-xs">{n.channel}</td>
                      <td className="table-td"><span className={`badge ${n.notificationStatus === 'Delivered' ? 'bg-green-50 text-green-700 ring-green-200' : 'bg-blue-50 text-blue-700 ring-blue-200'}`}>{n.notificationStatus}</span></td>
                      <td className="table-td whitespace-nowrap text-xs text-slate-500">{fmtDateTime(n.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination meta={meta} onPage={setPage} />
          </>
        ) : <EmptyState icon={BellRing} title="No contact alerts" message="Simulated alerts appear here when students send reports." />}
      </div>
    </div>
  );
}
