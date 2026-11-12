import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { RefreshCw, Lock } from 'lucide-react';
import { CategoryAPI, IncidentAPI, errMsg } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import IncidentMap, { MapLegend } from '../../components/IncidentMap';
import { PageHeader, PriorityBadge, StatusBadge, Spinner } from '../../components/ui';
import { PRIORITIES } from '../../utils/constants';
import { timeAgo } from '../../utils/format';

export default function MapPage() {
  const { user } = useAuth();
  const base = `/${user.role}/incidents`;
  const [items, setItems] = useState(null);
  const [categories, setCategories] = useState([]);
  const [f, setF] = useState({ status: 'open', priority: '', category: '' });

  const load = useCallback(() => {
    IncidentAPI.map(f).then((r) => setItems(r.data)).catch((e) => { toast.error(errMsg(e)); setItems([]); });
  }, [f]);
  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, [load]);
  useEffect(() => { CategoryAPI.list().then((r) => setCategories(r.data)).catch(() => {}); }, []);

  return (
    <div>
      <PageHeader
        title="Incident Location Map"
        subtitle="Live view of incidents where students chose to share their (simulated) location."
        actions={<button className="btn-outline" onClick={load}><RefreshCw className="h-4 w-4" /> Refresh</button>}
      />
      <div className="card mb-4 grid gap-3 p-4 sm:grid-cols-3">
        <select className="input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} aria-label="Status">
          <option value="open">Open incidents</option>
          <option value="done">Resolved / closed</option>
          <option value="">All incidents</option>
        </select>
        <select className="input" value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })} aria-label="Priority">
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
        </select>
        <select className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} aria-label="Category">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
        </select>
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="card p-4 xl:col-span-2">
          {items ? <IncidentMap incidents={items} height={560} zoom={17} linkBase={base} /> : <div className="flex h-[560px] items-center justify-center"><Spinner className="h-8 w-8 text-brand-600" /></div>}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <MapLegend />
            <span className="inline-flex items-center gap-1 text-xs text-slate-400"><Lock className="h-3 w-3" /> Visible to security and admin only</span>
          </div>
        </div>
        <div className="card">
          <div className="border-b border-slate-100 px-5 py-4"><h3 className="font-semibold text-navy">{items?.length ?? 0} incidents on the map</h3></div>
          <ul className="divide-y divide-slate-100 overflow-y-auto thin-scroll" style={{ maxHeight: 560 }}>
            {(items || []).map((i) => (
              <li key={i._id}>
                <Link to={`${base}/${i.incidentId}`} className="block px-5 py-3 hover:bg-slate-50">
                  <div className="flex justify-between text-xs"><span className="font-mono font-semibold text-brand-600">{i.incidentId}</span><span className="text-slate-400">{timeAgo(i.createdAt)}</span></div>
                  <p className="truncate text-sm font-medium text-slate-800">{i.title}</p>
                  <p className="font-mono text-[11px] text-slate-400">{i.latitude.toFixed(5)}, {i.longitude.toFixed(5)} · {i.location}</p>
                  <div className="mt-1 flex gap-1.5"><PriorityBadge priority={i.priority} /><StatusBadge status={i.status} /></div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
