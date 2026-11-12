import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, User, Users, Siren, FileText, Bell, Map, BarChart3, Settings, Tags, LogOut, Menu, X, ShieldAlert, ListChecks,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NotificationAPI } from '../services/api';
import { initials } from '../utils/format';
import Logo from '../components/Logo';

const NAV = {
  student: [
    { to: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/student/report-emergency', label: 'Report Emergency', icon: Siren },
    { to: '/student/incidents', label: 'My Reports', icon: FileText },
    { to: '/student/emergency-contacts', label: 'Trusted Contacts', icon: Users },
    { to: '/student/notifications', label: 'Notifications', icon: Bell, badge: true },
    { to: '/student/profile', label: 'Profile & Privacy', icon: User },
  ],
  security: [
    { to: '/security/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/security/incidents', label: 'Incidents', icon: ListChecks },
    { to: '/security/map', label: 'Live Map', icon: Map },
    { to: '/security/notifications', label: 'Contact Alerts', icon: Bell },
    { to: '/security/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/security/profile', label: 'Profile', icon: User },
  ],
  admin: [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/incidents', label: 'Incidents', icon: ListChecks },
    { to: '/admin/map', label: 'Incident Map', icon: Map },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/categories', label: 'Categories', icon: Tags },
    { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/admin/settings', label: 'Settings & Activity', icon: Settings },
  ],
};

const ROLE_LABEL = { student: 'Student', security: 'Security Personnel', admin: 'Administrator' };

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (user?.role !== 'student') return undefined;
    let alive = true;
    const load = () => NotificationAPI.unread().then((r) => alive && setUnread(r.data.unread)).catch(() => {});
    load();
    const t = setInterval(load, 20000);
    return () => { alive = false; clearInterval(t); };
  }, [user?.role, pathname]);

  const items = NAV[user.role] || [];
  const doLogout = () => { logout(); navigate('/login'); };

  const sidebar = (
    <div className="flex h-full flex-col bg-navy text-slate-300">
      <div className="flex h-16 items-center justify-between px-5">
        <Link to="/"><Logo dark /></Link>
        <button className="rounded-lg p-1 text-slate-400 hover:text-white lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
      </div>
      <p className="px-5 pb-2 pt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{ROLE_LABEL[user.role]} Menu</p>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 thin-scroll">
        {items.map(({ to, label, icon: Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30' : 'hover:bg-white/5 hover:text-white'}`}
          >
            <Icon className="h-[18px] w-[18px]" />
            <span className="flex-1">{label}</span>
            {badge && unread > 0 && <span className="rounded-full bg-emergency-600 px-2 py-0.5 text-[11px] font-bold text-white">{unread}</span>}
          </NavLink>
        ))}
      </nav>
      {user.role === 'student' && (
        <div className="px-4 pb-3">
          <Link to="/student/report-emergency?mode=sos" className="flex items-center justify-center gap-2 rounded-xl bg-emergency-600 py-3 text-sm font-bold text-white shadow-lg shadow-red-900/40 transition hover:bg-emergency-700">
            <ShieldAlert className="h-5 w-5" /> EMERGENCY SOS
          </Link>
        </div>
      )}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600/20 text-sm font-bold text-brand-100">{initials(user.name)}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{user.name}</p>
            <p className="truncate text-xs text-slate-400">{user.studentId || ROLE_LABEL[user.role]}</p>
          </div>
          <button onClick={doLogout} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white" title="Log out" aria-label="Log out"><LogOut className="h-[18px] w-[18px]" /></button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 animate-fadein">{sidebar}</aside>
        </div>
      )}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <div className="lg:hidden"><Logo /></div>
          <div className="hidden text-sm text-slate-500 lg:block">
            <span className="font-medium text-slate-700">{ROLE_LABEL[user.role]} Portal</span> · Daffodil International University
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200 sm:inline">Prototype · alerts are simulated</span>
            {user.role === 'student' && (
              <>
                <Link to="/student/notifications" className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="Notifications">
                  <Bell className="h-5 w-5" />
                  {unread > 0 && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-emergency-600 ring-2 ring-white" />}
                </Link>
                <Link to="/student/report-emergency?mode=sos" className="btn-danger btn-sm sm:hidden"><Siren className="h-4 w-4" />SOS</Link>
              </>
            )}
          </div>
        </header>
        <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
