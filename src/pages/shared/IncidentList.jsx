import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Search, Siren, FileSearch, RefreshCw, Zap, MapPin } from 'lucide-react';
import { CategoryAPI, IncidentAPI, errMsg } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { CategoryIcon, EmptyState, PageHeader, Pagination, PriorityBadge, Skeleton, StatusBadge } from '../../components/ui';
import { PRIORITIES, STATUSES } from '../../utils/constants';
import { fmtDateTime, timeAgo } from '../../utils/format';

export default function IncidentList() {
  const { user } = useAuth();
  const staff = user.role !== 'student';
  const base = `/${user.role}/incidents`;
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState(null);
  const [meta, setMeta] = useState(null);
  const [q, setQ] = useState(params.get('q') || '');

  const filters = {
    q: params.get('q') || '',
    category: params.get('category') || '',
    status: params.get('status') || '',
    priority: params.get('priority') || '',
    assigned: params.get('assigned') || '',
    sort: params.get('sort') || '-createdAt',
    page: Number(params.get('page')) || 1,
  };
  const key = JSON.stringify(filters);

  const update = (patch) => {
    const next = { ...filters, page: 1, ...patch };
    const clean = Object.fromEntries(Object.entries(next).filter(([k, v]) => v && !(k === 'page' && v === 1) && !(k === 'sort' && v === '-createdAt')));
    setParams(clean);
  };

  const load = useCallback(() => {
    IncidentAPI.list({ ...JSON.parse(key), limit: 15 })
      .then((r) => { setItems(r.data); setMeta(r.meta); })
      .catch((e) => { toast.error(errMsg(e)); setItems([]); });
  }, [key]);

  useEffect(() => { setItems(null); load(); }, [load]);
  useEffect(() => {
    if (!staff) return undefined;
    const t = setInterval(load, 20000); // live refresh for security dashboard
    return () => clearInterval(t);
  }, [load, staff]);
  useEffect(() => { CategoryAPI.list().then((r) => setCategories(r.data)).catch(() => {}); }, []);

  const catMap = Object.fromEntries(categories.map((c) => [c.key, c]));
  const hasFilters = filters.q || filters.category || filters.status || filters.priority || filters.assigned;

  return (
    <div>
      <PageHeader
        title={staff ? 'Incident Reports' : 'My Emergency Reports'}
        subtitle={staff ? 'Every incident reported across campus. This list refreshes every 20 seconds.' : 'Track the progress of every report you have submitted.'}
        actions={staff
          ? <button className="btn-outline" onClick={load}><RefreshCw className="h-4 w-4" /> Refresh</button>
          : <Link to="/student/report-emergency" className="btn-danger"><Siren className="h-4 w-4" /> New report</Link>}
      />

      <div className="card mb-4 p-4">
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6" onSubmit={(e) => { e.preventDefault(); update({ q: q.trim() }); }}>
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Search by incident ID (e.g. CS-2026-0001) or title" value={q} onChange={(e) => setQ(e.target.value)} onBlur={() => q.trim() !== filters.q && update({ q: q.trim() })} aria-label="Search incidents" />
          </div>
          <select className="input" value={filters.category} onChange={(e) => update({ category: e.target.value })} aria-label="Filter by category">
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
          </select>
          <select className="input" value={filters.status} onChange={(e) => update({ status: e.target.value })} aria-label="Filter by status">
            <option value="">All statuses</option>
            <option value="open">Open (unresolved)</option>
            <option value="done">Resolved / Closed</option>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select className="input" value={filters.priority} onChange={(e) => update({ priority: e.target.value })} aria-label="Filter by priority">
            <option value="">All priorities</option>
            {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
          </select>
          {staff ? (
            <select className="input" value={`${filters.assigned}|${filters.sort}`} onChange={(e) => { const [assigned, sort] = e.target.value.split('|'); update({ assigned, sort }); }} aria-label="Assignment and sort">
              <option value="|-createdAt">Newest first</option>
              <option value="|priority">Highest priority first</option>
              <option value="me|-createdAt">Assigned to me</option>
              <option value="none|-createdAt">Unassigned</option>
            </select>
          ) : (
            <select className="input" value={filters.sort} onChange={(e) => update({ sort: e.target.value })} aria-label="Sort">
              <option value="-createdAt">Newest first</option>
              <option value="createdAt">Oldest first</option>
              <option value="priority">Highest priority first</option>
            </select>
          )}
        </form>
        {hasFilters && (
          <button className="mt-3 text-xs font-semibold text-brand-600 hover:underline" onClick={() => { setQ(''); setParams({}); }}>Clear all filters</button>
        )}
      </div>

      <div className="card overflow-hidden">
        {!items ? (
          <div className="space-y-3 p-5">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={FileSearch}
            title={hasFilters ? 'No incidents match your filters' : 'No incidents yet'}
            message={hasFilters ? 'Try a different search or clear the filters.' : staff ? 'New reports from students will appear here.' : 'Reports you submit will appear here.'}
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="table-th">Incident</th>
                    <th className="table-th">Category</th>
                    {staff && <th className="table-th">Reporter</th>}
                    <th className="table-th">Priority</th>
                    <th className="table-th">Status</th>
                    {staff && <th className="table-th">Assigned</th>}
                    <th className="table-th">Reported</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((i) => {
                    const c = catMap[i.category];
                    return (
                      <tr key={i._id} onClick={() => navigate(`${base}/${i.incidentId}`)} className={`cursor-pointer hover:bg-slate-50 ${i.priority === 'Critical' && i.status === 'Reported' ? 'bg-red-50/50' : ''}`}>
                        <td className="table-td">
                          <Link to={`${base}/${i.incidentId}`} className="font-mono text-xs font-semibold text-brand-600" onClick={(e) => e.stopPropagation()}>{i.incidentId}</Link>
                          <p className="max-w-[260px] truncate font-medium text-slate-800">{i.title}</p>
                          <p className="flex items-center gap-2 text-xs text-slate-400">
                            {i.isSOS && <span className="font-bold text-emergency-600">SOS</span>}
                            {i.escalationLevel > 0 && <span className="inline-flex items-center gap-0.5 font-semibold text-orange-600"><Zap className="h-3 w-3" />L{i.escalationLevel}</span>}
                            {i.locationShared && <MapPin className="h-3 w-3" aria-label="Location shared" />}
                          </p>
                        </td>
                        <td className="table-td"><span className="flex items-center gap-2"><CategoryIcon icon={c?.icon} color={c?.color} size="sm" /><span className="text-xs">{i.categoryName}</span></span></td>
                        {staff && <td className="table-td"><p className="text-sm">{i.studentId?.name}</p><p className="font-mono text-xs text-slate-400">{i.studentId?.studentId}</p></td>}
                        <td className="table-td"><PriorityBadge priority={i.priority} /></td>
                        <td className="table-td"><StatusBadge status={i.status} /></td>
                        {staff && <td className="table-td text-xs">{i.assignedTo?.name || <span className="text-slate-400">Unassigned</span>}</td>}
                        <td className="table-td whitespace-nowrap text-xs text-slate-500" title={fmtDateTime(i.createdAt)}>{timeAgo(i.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {items.map((i) => {
                const c = catMap[i.category];
                return (
                  <li key={i._id}>
                    <Link to={`${base}/${i.incidentId}`} className="flex gap-3 p-4 hover:bg-slate-50">
                      <CategoryIcon icon={c?.icon} color={c?.color} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-xs font-semibold text-brand-600">{i.incidentId}{i.isSOS ? ' · SOS' : ''}</p>
                        <p className="truncate font-medium text-slate-800">{i.title}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5"><PriorityBadge priority={i.priority} /><StatusBadge status={i.status} /></div>
                        <p className="mt-1 text-xs text-slate-400">{staff && `${i.studentId?.name} · `}{timeAgo(i.createdAt)}</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <Pagination meta={meta} onPage={(p) => update({ page: p })} />
          </>
        )}
      </div>
    </div>
  );
}
