import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Eye, EyeOff, LogIn, GraduationCap, ShieldCheck, Settings } from 'lucide-react';
import AuthShell from './AuthShell';
import { Field, Spinner } from '../components/ui';
import { useAuth, homeFor } from '../context/AuthContext';
import { errMsg } from '../services/api';

const DEMO = [
  { label: 'Student', email: 'student@diu.edu.bd', password: 'student123', icon: GraduationCap },
  { label: 'Security', email: 'security@diu.edu.bd', password: 'security123', icon: ShieldCheck },
  { label: 'Admin', email: 'admin@diu.edu.bd', password: 'admin123', icon: Settings },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const validate = () => {
    const e = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address';
    if (!form.password) e.password = 'Password is required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      const user = await login(form.email.trim(), form.password);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      const from = location.state?.from;
      navigate(from && from.startsWith(`/${user.role}`) ? from : homeFor(user.role), { replace: true });
    } catch (err) {
      toast.error(errMsg(err, 'Login failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Log in to your CampusShield account.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Email" error={errors.email} htmlFor="email">
          <input id="email" type="email" autoComplete="email" className={`input ${errors.email ? 'input-error' : ''}`} placeholder="name@diu.edu.bd" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Password" error={errors.password} htmlFor="password">
          <div className="relative">
            <input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" className={`input pr-10 ${errors.password ? 'input-error' : ''}`} placeholder="Your password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" aria-label={show ? 'Hide password' : 'Show password'}>
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>
        <button type="submit" className="btn-primary w-full py-3" disabled={busy}>
          {busy ? <Spinner className="h-4 w-4" /> : <LogIn className="h-4 w-4" />} Log in
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        New student? <Link to="/register" className="font-semibold text-brand-600 hover:underline">Create an account</Link>
      </p>

      <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Demo accounts (click to fill)</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {DEMO.map(({ label, email, password, icon: Icon }) => (
            <button key={label} type="button" onClick={() => { setForm({ email, password }); setErrors({}); }} className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-3 text-xs font-semibold text-slate-700 hover:border-brand-500 hover:text-brand-600">
              <Icon className="h-5 w-5" />{label}
            </button>
          ))}
        </div>
      </div>
    </AuthShell>
  );
}
