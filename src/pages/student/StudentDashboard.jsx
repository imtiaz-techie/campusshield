import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Siren, FileText, Clock, CheckCircle2, AlertTriangle, Users, Phone, ArrowRight, MapPin, ShieldCheck, Lightbulb } from 'lucide-react';
import { AnalyticsAPI, ContactAPI, AdminAPI, errMsg } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { EmptyState, PageLoader, PriorityBadge, StatCard, StatusBadge } from '../../components/ui';
import { timeAgo } from '../../utils/format';

const TIPS = [
  'Travel in groups after evening classes, especially between the bus stand and the main gate.',
  'Keep your phone charged and your trusted contacts up to date.',
  'Report suspicious activity early. Small reports can prevent bigger incidents.',
  'Use well-lit main routes inside campus after 8 PM.',
];

export default function StudentDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [hotline, setHotline] = useState('');

  useEffect(() => {
    AnalyticsAPI.me().then((r) => setStats(r.data)).catch((e) => toast.error(errMsg(e)));
    ContactAPI.list().then((r) => setContacts(r.data)).catch(() => {});
    AdminAPI.publicSettings().then((r) => setHotline(r.data.securityHotline)).catch(() => {});
  }, []);

  if (!stats) return <PageLoader />;
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6">
      {/* Hero with SOS */}
      <div className="relative overflow-hidden rounded-3xl bg-navy p-6 text-white sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand-600/30 blur-3xl" />
        <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <p className="text-sm text-slate-400">{greet},</p>
            <h1 className="text-2xl font-bold sm:text-3xl">{user.name}</h1>
            <p className="mt-2 max-w-lg text-sm text-slate-300">Campus security is online. If you feel unsafe, press SOS. You will confirm before anything is sent.</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 ${user.locationSharing ? 'bg-green-500/15 text-green-300' : 'bg-white/10 text-slate-300'}`}><MapPin className="h-3.5 w-3.5" /> Location sharing {user.locationSharing ? 'on' : 'off'}</span>
              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 ${contacts.length ? 'bg-green-500/15 text-green-300' : 'bg-amber-500/20 text-amber-200'}`}><Users className="h-3.5 w-3.5" /> {contacts.length} trusted contact{contacts.length === 1 ? '' : 's'}</span>
              {hotline && <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-slate-300"><Phone className="h-3.5 w-3.5" /> Security: {hotline}</span>}
            </div>
          </div>
          <Link to="/student/report-emergency?mode=sos" className="group relative mx-auto flex h-36 w-36 shrink-0 items-center justify-center md:mx-0" aria-label="Emergency SOS">
            <span className="absolute inset-0 animate-pulsering rounded-full bg-emergency-600/50" />
            <span className="relative flex h-32 w-32 flex-col items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-700 shadow-2xl shadow-red-900/60 transition group-hover:scale-105">
              <Siren className="h-9 w-9" />
              <span className="text-lg font-extrabold tracking-widest">SOS</span>
            </span>
          </Link>
        </div>
      </div>

      {!contacts.length && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> You have not added any trusted emergency contacts yet.</span>
          <Link to="/student/emergency-contacts" className="btn-dark btn-sm">Add contacts</Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Total reports" value={stats.total} icon={FileText} tone="brand" />
        <StatCard label="Open" value={stats.open} icon={Clock} tone="orange" />
        <StatCard label="Resolved" value={stats.resolved} icon={CheckCircle2} tone="green" />
        <StatCard label="Critical reports" value={stats.critical} icon={AlertTriangle} tone="red" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-navy">Recent reports</h2>
            <Link to="/student/incidents" className="text-sm font-semibold text-brand-600 hover:underline">View all</Link>
          </div>
          {stats.recent.length ? (
            <ul className="divide-y divide-slate-100">
              {stats.recent.map((i) => (
                <li key={i._id}>
                  <Link to={`/student/incidents/${i.incidentId}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-800">{i.title}</p>
                      <p className="text-xs text-slate-500"><span className="font-mono">{i.incidentId}</span> · {i.categoryName} · {timeAgo(i.createdAt)}</p>
                    </div>
                    <div className="hidden flex-col items-end gap-1 sm:flex"><StatusBadge status={i.status} /><PriorityBadge priority={i.priority} /></div>
                    <ArrowRight className="h-4 w-4 text-slate-300" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={ShieldCheck} title="No reports yet" message="Reports you submit will appear here, and you can follow their progress." action={<Link to="/student/report-emergency" className="btn-primary">Report an incident</Link>} />
          )}
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-navy">Trusted contacts</h2>
              <Link to="/student/emergency-contacts" className="text-sm font-semibold text-brand-600 hover:underline">Manage</Link>
            </div>
            {contacts.length ? (
              <ul className="mt-3 space-y-2">
                {contacts.slice(0, 4).map((c) => (
                  <li key={c._id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                    <span><b className="text-slate-800">{c.contactName}</b> <span className="text-slate-500">· {c.relationship}</span></span>
                    <span className="font-mono text-xs text-slate-500">{c.phone}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-3 text-sm text-slate-500">No contacts saved.</p>}
          </div>
          <div className="card p-5">
            <h2 className="flex items-center gap-2 font-semibold text-navy"><Lightbulb className="h-4 w-4 text-warning" /> Safety tips</h2>
            <ol className="mt-3 list-inside list-decimal space-y-2 text-sm text-slate-600">
              {TIPS.map((t) => <li key={t}>{t}</li>)}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
