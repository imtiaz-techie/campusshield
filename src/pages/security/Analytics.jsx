import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ListChecks, CheckCircle2, Timer, AlertOctagon, Table2 } from 'lucide-react';
import { AnalyticsAPI, errMsg } from '../../services/api';
import { PageHeader, PageLoader, StatCard } from '../../components/ui';
import { ChartCard, TrendChart, CategoryBarChart, PriorityChart, ResolutionDonut, SimpleBarChart } from '../../components/Charts';
import { STATUS_COLOR } from '../../utils/constants';
import { fmtMinutes } from '../../utils/format';

export default function Analytics() {
  const [months, setMonths] = useState(6);
  const [s, setS] = useState(null);
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    setS(null);
    AnalyticsAPI.summary({ months }).then((r) => setS(r.data)).catch((e) => toast.error(errMsg(e)));
  }, [months]);

  if (!s) return <PageLoader label="Crunching numbers..." />;
  const t = s.totals;
  const rate = t.total ? Math.round((t.resolved / t.total) * 100) : 0;
  const top = s.byCategory[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Incident History & Statistics"
        subtitle="Trends, categories, response times and resolution performance."
        actions={(
          <div className="inline-flex rounded-xl bg-slate-100 p-1" role="group" aria-label="Time range">
            {[3, 6, 12].map((m) => (
              <button key={m} onClick={() => setMonths(m)} className={`btn-sm btn ${months === m ? 'bg-white text-navy shadow' : 'text-slate-600'}`}>{m} months</button>
            ))}
          </div>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total incidents reported" value={t.total} icon={ListChecks} tone="brand" hint={top ? `Most common: ${top.name}` : ''} />
        <StatCard label="Resolution rate" value={`${rate}%`} icon={CheckCircle2} tone="green" hint={`${t.resolved} resolved · ${t.total - t.resolved} unresolved`} />
        <StatCard label="Avg. response time" value={fmtMinutes(s.avgResponseMinutes)} icon={Timer} tone="indigo" hint={`Avg. resolution ${fmtMinutes(s.avgResolutionMinutes)}`} />
        <StatCard label="Critical incidents" value={t.criticalAll} icon={AlertOctagon} tone="red" hint={`${t.critical} still open`} />
      </div>

      <ChartCard
        title="Monthly incident trend"
        subtitle={`Reported vs resolved, last ${months} months`}
        action={<button className="btn-ghost btn-sm" onClick={() => setShowTable(!showTable)}><Table2 className="h-4 w-4" /> {showTable ? 'Hide' : 'Show'} table</button>}
      >
        <TrendChart data={s.monthly} height={300} />
        {showTable && (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50"><tr><th className="table-th">Month</th><th className="table-th">Reported</th><th className="table-th">Resolved</th><th className="table-th">Critical</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{s.monthly.map((m) => <tr key={m.month}><td className="table-td">{m.month}</td><td className="table-td">{m.reported}</td><td className="table-td">{m.resolved}</td><td className="table-td">{m.critical}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </ChartCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Most common emergency categories"><CategoryBarChart data={s.byCategory} height={300} /></ChartCard>
        <ChartCard title="Resolved vs unresolved"><ResolutionDonut data={s.resolvedVsUnresolved} height={300} /></ChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Incident priority distribution"><PriorityChart data={s.byPriority} /></ChartCard>
        <ChartCard title="Average response time by priority" subtitle="Minutes from report to acknowledgement">
          <SimpleBarChart data={s.responseByPriority} dataKey="minutes" name="Avg. minutes" unit=" min" colorMap={{ Critical: '#DC2626', High: '#EA580C', Medium: '#F59E0B', Low: '#64748B' }} />
        </ChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Incidents by status"><SimpleBarChart data={s.byStatus} colorMap={STATUS_COLOR} /></ChartCard>
        <ChartCard title="Time of day" subtitle="When incidents are reported (24h)"><SimpleBarChart data={s.hourly} nameKey="hour" dataKey="count" color="#2563EB" /></ChartCard>
      </div>

      <ChartCard title="Hotspot locations" subtitle="Locations with the most reports">
        <ul className="space-y-3">
          {s.locations.map((l) => (
            <li key={l.name}>
              <div className="mb-1 flex justify-between text-sm"><span className="text-slate-700">{l.name}</span><span className="font-semibold text-navy">{l.value}</span></div>
              <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-brand-600" style={{ width: `${(l.value / s.locations[0].value) * 100}%` }} /></div>
            </li>
          ))}
        </ul>
      </ChartCard>
    </div>
  );
}
