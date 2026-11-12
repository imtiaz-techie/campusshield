import { Link } from 'react-router-dom';
import {
  Siren, Users, MapPin, BellRing, Gauge, BarChart3, ShieldCheck, Zap, ArrowRight, CheckCircle2, Lock, Clock, Activity,
} from 'lucide-react';
import Logo from '../components/Logo';
import { useAuth, homeFor } from '../context/AuthContext';

const FEATURES = [
  { icon: Siren, title: 'One-tap SOS', text: 'A large emergency button with a confirmation step sends an alert to campus security in seconds.', tone: 'bg-red-50 text-red-600' },
  { icon: Users, title: 'Trusted contacts', text: 'Save family and friends. They receive a simulated alert with your incident reference.', tone: 'bg-blue-50 text-blue-600' },
  { icon: MapPin, title: 'Location sharing', text: 'Share mock GPS coordinates with security on a live map. You decide whether to share.', tone: 'bg-green-50 text-green-600' },
  { icon: Gauge, title: 'Priority classification', text: 'A rule engine reads the category and description, then rates each report Critical, High, Medium or Low.', tone: 'bg-orange-50 text-orange-600' },
  { icon: Zap, title: 'Auto escalation', text: 'If nobody acknowledges a critical incident in time, the system escalates it and suggests the next action.', tone: 'bg-purple-50 text-purple-600' },
  { icon: BarChart3, title: 'Analytics', text: 'Charts show monthly trends, common categories, response times and resolution rates.', tone: 'bg-cyan-50 text-cyan-600' },
];

const STEPS = [
  { n: '01', title: 'Trigger SOS or report', text: 'Pick a category, add a short description and share your simulated location.' },
  { n: '02', title: 'Engine analyzes', text: 'The system sets a priority, picks a response category and recommends an action.' },
  { n: '03', title: 'Security responds', text: 'Officers acknowledge the report, dispatch help and update the status.' },
  { n: '04', title: 'Track to resolution', text: 'Follow each step on your timeline. Your contacts get simulated updates.' },
];

export default function Landing() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Logo dark />
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-300 md:flex">
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#how" className="hover:text-white">How it works</a>
            <a href="#roles" className="hover:text-white">Who it's for</a>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Link to={homeFor(user.role)} className="btn-primary">Open dashboard <ArrowRight className="h-4 w-4" /></Link>
            ) : (
              <>
                <Link to="/login" className="btn text-white hover:bg-white/10">Log in</Link>
                <Link to="/register" className="btn-primary hidden sm:inline-flex">Register</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-navy pb-24 pt-32 sm:pt-40">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-brand-600/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 h-[420px] w-[420px] rounded-full bg-emergency-600/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-brand-100 ring-1 ring-white/15">
              <ShieldCheck className="h-4 w-4" /> Daffodil International University · Campus Safety
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              Help is one tap away, <span className="bg-gradient-to-r from-brand-500 to-cyan-400 bg-clip-text text-transparent">day or night.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-slate-300">
              CampusShield lets students report emergencies on the way to or from university. Campus security can then track, prioritize and respond to every incident from one dashboard.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className="btn-danger px-6 py-3 text-base"><Siren className="h-5 w-5" /> Get protected, it's free</Link>
              <Link to="/login" className="btn border border-white/20 px-6 py-3 text-base text-white hover:bg-white/10">Student / Staff login</Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" /> 24/7 security monitoring</span>
              <span className="inline-flex items-center gap-1.5"><Lock className="h-4 w-4 text-success" /> Privacy-first location</span>
              <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4 text-success" /> Real-time status tracking</span>
            </div>
          </div>

          {/* Hero visual */}
          <div className="relative mx-auto w-full max-w-md">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Emergency SOS</p>
                <span className="rounded-full bg-green-500/15 px-2.5 py-0.5 text-xs font-semibold text-green-300">Security online</span>
              </div>
              <div className="relative mx-auto my-10 flex h-44 w-44 items-center justify-center">
                <span className="absolute inset-0 animate-pulsering rounded-full bg-emergency-600/40" />
                <span className="absolute inset-4 animate-pulsering rounded-full bg-emergency-600/30 [animation-delay:.6s]" />
                <span className="relative flex h-36 w-36 flex-col items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-700 text-white shadow-2xl shadow-red-900/50">
                  <Siren className="h-10 w-10" />
                  <span className="mt-1 text-xl font-extrabold tracking-wider">SOS</span>
                </span>
              </div>
              <div className="space-y-2">
                {[
                  ['CS-2026-0042', 'Physical Assault', 'Critical', 'bg-red-600 text-white'],
                  ['CS-2026-0041', 'Medical Emergency', 'High', 'bg-orange-200 text-orange-900'],
                  ['CS-2026-0040', 'Suspicious Activity', 'Medium', 'bg-amber-100 text-amber-900'],
                ].map(([id, cat, p, cls]) => (
                  <div key={id} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2.5 text-sm">
                    <div>
                      <p className="font-semibold text-white">{cat}</p>
                      <p className="text-xs text-slate-400">{id}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${cls}`}>{p}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -left-6 -top-6 hidden rounded-2xl bg-white p-3 shadow-xl sm:block">
              <p className="flex items-center gap-2 text-xs font-semibold text-navy"><Activity className="h-4 w-4 text-brand-600" /> Avg. response 4 min</p>
            </div>
            <div className="absolute -bottom-5 -right-4 hidden rounded-2xl bg-white p-3 shadow-xl sm:block">
              <p className="flex items-center gap-2 text-xs font-semibold text-navy"><BellRing className="h-4 w-4 text-emergency-600" /> 2 contacts alerted (simulated)</p>
            </div>
          </div>
        </div>
      </section>

      {/* Intro */}
      <section className="border-b border-slate-100 bg-surface py-16">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 md:grid-cols-3">
          {[
            ['Late-hour travel', 'Many students travel to or from campus after dark. CampusShield makes it easy to call for help quickly.'],
            ['Faster response', 'Each report reaches the security dashboard right away, already prioritized, with a suggested action.'],
            ['Peace of mind', 'Trusted contacts are kept informed and every status change appears on your timeline.'],
          ].map(([t, d]) => (
            <div key={t}>
              <h3 className="text-lg font-bold text-navy">{t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">Features</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-navy sm:text-4xl">Everything you need in an emergency</h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text, tone }) => (
              <div key={title} className="card p-6 transition hover:-translate-y-1 hover:shadow-lift">
                <span className={`inline-flex rounded-xl p-3 ${tone}`}><Icon className="h-6 w-6" /></span>
                <h3 className="mt-4 text-lg font-semibold text-navy">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-navy py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-500">How it works</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">From alert to resolution in four steps</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <span className="text-3xl font-extrabold text-brand-500">{s.n}</span>
                <h3 className="mt-3 font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section id="roles" className="py-20">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 md:grid-cols-3">
          {[
            ['Students', 'Report emergencies, manage trusted contacts, share location and track your reports.', Siren],
            ['Security personnel', 'Watch incoming incidents on a live map, set priority, update status and dispatch help.', ShieldCheck],
            ['Administrators', 'Manage accounts and categories, set escalation rules and review system activity.', Gauge],
          ].map(([t, d, Icon]) => (
            <div key={t} className="card p-6">
              <Icon className="h-7 w-7 text-brand-600" />
              <h3 className="mt-3 text-lg font-semibold text-navy">{t}</h3>
              <p className="mt-2 text-sm text-slate-600">{d}</p>
            </div>
          ))}
        </div>
        <div className="mx-auto mt-14 max-w-4xl px-4 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-6 rounded-3xl bg-gradient-to-r from-brand-600 to-brand-700 p-8 text-white sm:flex-row sm:p-10">
            <div>
              <h3 className="text-2xl font-bold">Ready to feel safer on campus?</h3>
              <p className="mt-1 text-brand-100">Create your student account with your DIU email.</p>
            </div>
            <div className="flex gap-3">
              <Link to="/register" className="btn bg-white text-brand-700 hover:bg-brand-50">Register</Link>
              <Link to="/login" className="btn border border-white/40 text-white hover:bg-white/10">Log in</Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-slate-500 sm:px-6 md:flex-row md:items-center md:justify-between">
          <Logo />
          <p>SE331 Software Engineering Design Capstone Project · Daffodil International University</p>
          <p className="text-xs">Academic prototype: notifications and locations are simulated.</p>
        </div>
      </footer>
    </div>
  );
}
