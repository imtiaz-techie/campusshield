import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Siren, FileText, CheckCircle2, BellRing, ArrowRight, Gauge, Zap, Send, AlertTriangle, MapPin, Phone,
} from 'lucide-react';
import { CategoryAPI, ContactAPI, IncidentAPI, errMsg, fieldErrors } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { CategoryIcon, ConfirmDialog, Field, PageHeader, PageLoader, PriorityBadge, Spinner, StatusBadge } from '../../components/ui';
import LocationShare from '../../components/LocationShare';
import { CAMPUS_LOCATIONS, simulateGps } from '../../utils/constants';
import { toLocalInput, fmtDateTime } from '../../utils/format';

function CategoryGrid({ categories, value, onChange, error, compact }) {
  return (
    <div>
      <div className={`grid gap-2 ${compact ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-4'}`} role="radiogroup" aria-label="Emergency category">
        {categories.map((c) => {
          const active = value === c.key;
          return (
            <button
              key={c.key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(c.key)}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 text-center text-xs font-semibold transition ${active ? 'border-current shadow-md' : 'border-slate-200 text-slate-700 hover:border-slate-300'}`}
              style={active ? { color: c.color, backgroundColor: `${c.color}0D` } : undefined}
            >
              <CategoryIcon icon={c.icon} color={c.color} size="sm" />
              <span className={active ? '' : 'text-slate-700'}>{c.name}</span>
            </button>
          );
        })}
      </div>
      {error && <p className="mt-1 text-xs font-medium text-emergency-600">{error}</p>}
    </div>
  );
}

/** Live preview from the rule-based escalation engine. */
function AnalysisPreview({ analysis, loading }) {
  if (!analysis && !loading) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-navy"><Gauge className="h-4 w-4 text-brand-600" /> Automatic assessment {loading && <Spinner className="h-3.5 w-3.5" />}</p>
      {analysis && (
        <div className="space-y-1.5 text-sm">
          <div className="flex flex-wrap items-center gap-2"><span className="text-slate-500">Priority:</span><PriorityBadge priority={analysis.priority} /></div>
          <p><span className="text-slate-500">Response:</span> <b className="text-slate-800">{analysis.responseCategory}</b></p>
          <ul className="list-inside list-disc text-xs text-slate-500">{analysis.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

function SuccessView({ result, onAnother }) {
  const { incident, analysis, notifications } = result;
  const contactAlerts = notifications.filter((n) => n.notificationType === 'Emergency Alert');
  return (
    <div className="mx-auto max-w-3xl animate-fadein space-y-6">
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-success to-emerald-600 p-6 text-white">
          <CheckCircle2 className="h-10 w-10" />
          <h2 className="mt-3 text-2xl font-bold">{incident.isSOS ? 'SOS alert sent' : 'Report submitted'}</h2>
          <p className="text-emerald-50">Campus security can see your report now. Stay in a safe place if you can.</p>
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-3">
          <div><p className="text-xs uppercase text-slate-500">Incident ID</p><p className="font-mono text-lg font-bold text-navy">{incident.incidentId}</p></div>
          <div><p className="text-xs uppercase text-slate-500">Priority</p><PriorityBadge priority={incident.priority} /></div>
          <div><p className="text-xs uppercase text-slate-500">Status</p><StatusBadge status={incident.status} /></div>
          <div className="sm:col-span-3"><p className="text-xs uppercase text-slate-500">Response category</p><p className="font-semibold text-slate-800">{analysis.responseCategory}</p></div>
          {incident.locationShared && (
            <div className="sm:col-span-3"><p className="text-xs uppercase text-slate-500">Shared location (simulated)</p><p className="font-mono text-sm text-slate-700">{incident.latitude.toFixed(5)}, {incident.longitude.toFixed(5)} · {incident.location}</p></div>
          )}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="flex items-center gap-2 font-semibold text-navy"><BellRing className="h-5 w-5 text-warning" /> Trusted contacts notified (simulation)</h3>
        {contactAlerts.length ? (
          <ul className="mt-3 divide-y divide-slate-100">
            {contactAlerts.map((n) => (
              <li key={n._id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span><b className="text-slate-800">{n.contactName}</b> <span className="text-slate-500">· {n.contactPhone} · {n.channel}</span></span>
                <span className="badge bg-blue-50 text-blue-700 ring-blue-200">{n.notificationStatus} · {fmtDateTime(n.createdAt)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-500">No contact alerts were sent. <Link className="font-semibold text-brand-600" to="/student/emergency-contacts">Add trusted contacts</Link>.</p>
        )}
        <p className="mt-3 text-xs text-slate-400">No real SMS or calls are made in this prototype.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link to={`/student/incidents/${incident.incidentId}`} className="btn-primary">Track this incident <ArrowRight className="h-4 w-4" /></Link>
        <button className="btn-outline" onClick={onAnother}>Report another incident</button>
      </div>
    </div>
  );
}

export default function ReportEmergency() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const mode = params.get('mode') === 'sos' ? 'sos' : 'detailed';
  const [categories, setCategories] = useState(null);
  const [contactsCount, setContactsCount] = useState(0);
  const [result, setResult] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [sosArmed, setSosArmed] = useState(false);

  const profileAllows = user.locationSharing !== false;
  const blank = () => ({
    title: '', category: '', description: '', location: '', incidentDate: toLocalInput(), notes: '',
    share: profileAllows, coords: null, place: '', notifyContacts: true,
  });
  const [form, setForm] = useState(blank);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    CategoryAPI.list().then((r) => setCategories(r.data)).catch((e) => { toast.error(errMsg(e)); setCategories([]); });
    ContactAPI.list().then((r) => setContactsCount(r.data.length)).catch(() => {});
  }, []);

  // When SOS gets armed, attach a simulated GPS fix automatically (if sharing is allowed).
  useEffect(() => {
    if (mode === 'sos' && sosArmed && form.share && !form.coords) {
      const fix = simulateGps();
      setForm((f) => ({ ...f, coords: { latitude: fix.latitude, longitude: fix.longitude, accuracy: fix.accuracy }, place: fix.name, location: f.location || fix.name }));
    }
  }, [mode, sosArmed, form.share, form.coords]);

  // Debounced live priority preview
  const timer = useRef();
  useEffect(() => {
    if (!form.category) { setAnalysis(null); return undefined; }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setAnalyzing(true);
      IncidentAPI.analyze({ category: form.category, title: form.title, description: form.description, isSOS: mode === 'sos', incidentDate: new Date(form.incidentDate || Date.now()).toISOString() })
        .then((r) => setAnalysis(r.data)).catch(() => {}).finally(() => setAnalyzing(false));
    }, 450);
    return () => clearTimeout(timer.current);
  }, [form.category, form.title, form.description, form.incidentDate, mode]);

  const switchMode = (m) => { setParams(m === 'sos' ? { mode: 'sos' } : {}); setErrors({}); setSosArmed(false); };

  const validate = () => {
    const e = {};
    if (!form.category) e.category = 'Select an emergency category';
    if (mode === 'sos') {
      if (form.description.trim().length < 5) e.description = 'Describe the emergency in a few words (min 5 characters)';
    } else {
      if (form.title.trim().length < 5) e.title = 'Title must be at least 5 characters';
      if (form.description.trim().length < 15) e.description = 'Description must be at least 15 characters';
      if (form.location.trim().length < 3) e.location = 'Enter where the incident happened';
      if (!form.incidentDate) e.incidentDate = 'Date and time are required';
      else if (new Date(form.incidentDate) > new Date(Date.now() + 5 * 60000)) e.incidentDate = 'Date cannot be in the future';
    }
    if (form.share && profileAllows && !form.coords) e.coords = 'Simulate your GPS position or turn location sharing off';
    setErrors(e);
    if (Object.keys(e).length) toast.error(Object.values(e)[0]);
    return !Object.keys(e).length;
  };

  const submit = async () => {
    setBusy(true);
    try {
      const sharing = form.share && profileAllows && form.coords;
      const body = {
        isSOS: mode === 'sos',
        category: form.category,
        title: form.title,
        description: form.description,
        location: form.location || form.place,
        incidentDate: new Date(form.incidentDate || Date.now()).toISOString(),
        notes: form.notes,
        shareLocation: !!sharing,
        latitude: sharing ? form.coords.latitude : null,
        longitude: sharing ? form.coords.longitude : null,
        notifyContacts: form.notifyContacts,
      };
      if (mode === 'sos') body.incidentDate = new Date().toISOString();
      const r = await IncidentAPI.create(body);
      setResult(r.data);
      setConfirm(false);
      toast.success(r.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errMsg(err, 'Could not submit the report'));
      setConfirm(false);
    } finally {
      setBusy(false);
    }
  };

  if (!categories) return <PageLoader />;
  if (result) return <SuccessView result={result} onAnother={() => { setResult(null); setForm(blank()); setSosArmed(false); setAnalysis(null); navigate('/student/report-emergency'); }} />;

  const locationBlock = (
    <div>
      <LocationShare
        share={form.share}
        onShare={(v) => set('share', v)}
        coords={form.coords}
        onCoords={(c) => set('coords', c)}
        place={form.place}
        onPlace={(p) => setForm((f) => ({ ...f, place: p, location: f.location || p }))}
        profileAllows={profileAllows}
        showMap={mode !== 'sos'}
      />
      {errors.coords && <p className="mt-1 text-xs font-medium text-emergency-600">{errors.coords}</p>}
    </div>
  );

  const notifyBlock = (
    <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm">
      <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-600" checked={form.notifyContacts} onChange={(e) => set('notifyContacts', e.target.checked)} />
      <span>
        <span className="font-medium text-slate-800">Alert my trusted contacts (simulated)</span>
        <span className="block text-xs text-slate-500">{contactsCount ? `${contactsCount} contact(s) will get a simulated SMS with your incident reference.` : 'You have no trusted contacts yet.'} {!contactsCount && <Link to="/student/emergency-contacts" className="font-semibold text-brand-600">Add contacts</Link>}</span>
      </span>
    </label>
  );

  return (
    <div>
      <PageHeader title="Report an Emergency" subtitle="Use SOS for urgent help right now. Use the detailed form to describe an incident fully." />

      <div className="mb-6 inline-flex rounded-xl bg-slate-100 p-1">
        <button onClick={() => switchMode('sos')} className={`btn ${mode === 'sos' ? 'bg-emergency-600 text-white shadow' : 'text-slate-600'}`}><Siren className="h-4 w-4" /> Quick SOS</button>
        <button onClick={() => switchMode('detailed')} className={`btn ${mode === 'detailed' ? 'bg-white text-navy shadow' : 'text-slate-600'}`}><FileText className="h-4 w-4" /> Detailed report</button>
      </div>

      {mode === 'sos' ? (
        !sosArmed ? (
          <div className="card flex flex-col items-center px-6 py-14 text-center">
            <button
              onClick={() => setSosArmed(true)}
              className="group relative flex h-52 w-52 items-center justify-center rounded-full focus-visible:ring-4"
              aria-label="Activate emergency SOS"
            >
              <span className="absolute inset-0 animate-pulsering rounded-full bg-emergency-600/40" />
              <span className="absolute inset-3 animate-pulsering rounded-full bg-emergency-600/30 [animation-delay:.6s]" />
              <span className="relative flex h-44 w-44 flex-col items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-700 text-white shadow-2xl shadow-red-600/40 transition group-hover:scale-105 group-active:scale-95">
                <Siren className="h-12 w-12" />
                <span className="mt-1 text-2xl font-extrabold tracking-widest">SOS</span>
              </span>
            </button>
            <h2 className="mt-8 text-xl font-bold text-navy">Press for emergency help</h2>
            <p className="mt-2 max-w-md text-sm text-slate-500">You will choose a category and confirm before anything is sent, so a single accidental tap will not send an alert.</p>
            <div className="mt-6 flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs text-slate-600"><Phone className="h-3.5 w-3.5" /> In immediate danger, also call national emergency 999.</div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-5 animate-fadein">
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <p><b>SOS mode is on.</b> Choose what is happening, add a few words, then confirm to alert campus security.</p>
            </div>
            <div className="card space-y-5 p-5 sm:p-6">
              <Field label="What is happening?" required><CategoryGrid categories={categories} value={form.category} onChange={(v) => set('category', v)} error={errors.category} compact /></Field>
              <Field label="Short description" required error={errors.description} htmlFor="sos-desc">
                <textarea id="sos-desc" rows={3} maxLength={2000} className={`input ${errors.description ? 'input-error' : ''}`} placeholder="e.g. Someone is following me near the bus stand" value={form.description} onChange={(e) => set('description', e.target.value)} />
              </Field>
              <Field label="Where are you? (optional)" htmlFor="sos-loc">
                <select id="sos-loc" className="input" value={form.location} onChange={(e) => set('location', e.target.value)}>
                  <option value="">Use simulated GPS position</option>
                  {CAMPUS_LOCATIONS.map((l) => <option key={l.name}>{l.name}</option>)}
                </select>
              </Field>
              {locationBlock}
              {notifyBlock}
              <AnalysisPreview analysis={analysis} loading={analyzing} />
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button className="btn-outline" onClick={() => setSosArmed(false)}>Cancel SOS</button>
                <button className="btn-danger px-6 py-3" onClick={() => validate() && setConfirm(true)}><Siren className="h-5 w-5" /> Send SOS alert</button>
              </div>
            </div>
          </div>
        )
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <form className="card space-y-5 p-5 sm:p-6 lg:col-span-2" onSubmit={(e) => { e.preventDefault(); if (validate()) setConfirm(true); }} noValidate>
            <Field label="Incident title" required error={errors.title} htmlFor="title">
              <input id="title" maxLength={120} className={`input ${errors.title ? 'input-error' : ''}`} placeholder="e.g. Phone snatched near the main gate" value={form.title} onChange={(e) => set('title', e.target.value)} />
            </Field>
            <Field label="Emergency category" required><CategoryGrid categories={categories} value={form.category} onChange={(v) => set('category', v)} error={errors.category} /></Field>
            <Field label="Detailed description" required error={errors.description} hint={`${form.description.length}/2000`} htmlFor="desc">
              <textarea id="desc" rows={5} maxLength={2000} className={`input ${errors.description ? 'input-error' : ''}`} placeholder="What happened, who was involved, any injuries..." value={form.description} onChange={(e) => set('description', e.target.value)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Incident location" required error={errors.location} htmlFor="loc">
                <input id="loc" list="campus-locations" maxLength={160} className={`input ${errors.location ? 'input-error' : ''}`} placeholder="e.g. Central Library, 3rd floor" value={form.location} onChange={(e) => set('location', e.target.value)} />
                <datalist id="campus-locations">{CAMPUS_LOCATIONS.map((l) => <option key={l.name} value={l.name} />)}</datalist>
              </Field>
              <Field label="Date & time" required error={errors.incidentDate} htmlFor="dt">
                <input id="dt" type="datetime-local" max={toLocalInput(new Date(Date.now() + 60000))} className={`input ${errors.incidentDate ? 'input-error' : ''}`} value={form.incidentDate} onChange={(e) => set('incidentDate', e.target.value)} />
              </Field>
            </div>
            <Field label="Simulated GPS coordinates">{locationBlock}</Field>
            <Field label="Additional notes (optional)" htmlFor="notes">
              <textarea id="notes" rows={2} maxLength={1000} className="input" placeholder="Witnesses, descriptions, items lost..." value={form.notes} onChange={(e) => set('notes', e.target.value)} />
            </Field>
            {notifyBlock}
            <div className="flex justify-end">
              <button type="submit" className="btn-primary px-6 py-3"><Send className="h-4 w-4" /> Review & submit</button>
            </div>
          </form>
          <aside className="space-y-4">
            <AnalysisPreview analysis={analysis} loading={analyzing} />
            <div className="card p-5 text-sm text-slate-600">
              <h3 className="flex items-center gap-2 font-semibold text-navy"><Zap className="h-4 w-4 text-brand-600" /> What happens next</h3>
              <ol className="mt-3 list-inside list-decimal space-y-1.5">
                <li>The engine sets a priority and response category.</li>
                <li>Security sees your report on their dashboard right away.</li>
                <li>If a critical report is not acknowledged in time, it escalates automatically.</li>
                <li>Each status change appears on your timeline.</li>
              </ol>
            </div>
            <div className="card p-5 text-sm text-slate-600">
              <h3 className="flex items-center gap-2 font-semibold text-navy"><MapPin className="h-4 w-4 text-brand-600" /> Privacy</h3>
              <p className="mt-2">Security can only see coordinates when you share them. This prototype never reads your real location.</p>
            </div>
          </aside>
        </div>
      )}

      <ConfirmDialog
        open={confirm}
        onClose={() => !busy && setConfirm(false)}
        onConfirm={submit}
        loading={busy}
        title={mode === 'sos' ? 'Send SOS alert now?' : 'Submit this incident report?'}
        confirmLabel={mode === 'sos' ? 'Yes, send SOS' : 'Submit report'}
        tone={mode === 'sos' ? 'danger' : 'primary'}
        message={mode === 'sos'
          ? `Campus security will be alerted right away${form.notifyContacts && contactsCount ? ` and ${contactsCount} trusted contact(s) will get a simulated alert` : ''}. Only confirm if you need help.`
          : `Your report will be sent to campus security${analysis ? ` with ${analysis.priority} priority` : ''}. You can track its progress under My Reports.`}
      />
    </div>
  );
}
