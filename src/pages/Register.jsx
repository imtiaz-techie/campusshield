import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';
import AuthShell from './AuthShell';
import { Field, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { AuthAPI, errMsg, fieldErrors } from '../services/api';

const FALLBACK_DEPTS = ['Software Engineering', 'Computer Science & Engineering', 'Other'];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [depts, setDepts] = useState(FALLBACK_DEPTS);
  const [form, setForm] = useState({ name: '', studentId: '', email: '', phone: '', department: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => { AuthAPI.departments().then((r) => setDepts(r.data)).catch(() => {}); }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const validate = () => {
    const e = {};
    if (form.name.trim().length < 3) e.name = 'Enter your full name';
    else if (!/^[A-Za-z .'-]+$/.test(form.name.trim())) e.name = 'Name may only contain letters';
    if (!/^\d{3}-\d{2}-\d{3,5}$/.test(form.studentId.trim())) e.studentId = 'Format: 232-35-456';
    if (!/^[^\s@]+@([a-z0-9-]+\.)*diu\.edu\.bd$/i.test(form.email.trim())) e.email = 'Use your DIU email (…@diu.edu.bd)';
    if (!/^(\+?880|0)1[3-9]\d{8}$/.test(form.phone.replace(/[\s-]/g, ''))) e.phone = 'Valid BD mobile, e.g. 01712345678';
    if (!form.department) e.department = 'Select your department';
    if (!/^(?=.*[A-Za-z])(?=.*\d).{6,64}$/.test(form.password)) e.password = '6+ characters with a letter and a number';
    if (form.confirmPassword !== form.password) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      await register(form);
      toast.success('Account created! Next, add your trusted emergency contacts.');
      navigate('/student/emergency-contacts', { replace: true });
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errMsg(err, 'Registration failed'));
    } finally {
      setBusy(false);
    }
  };

  const input = (k, props = {}) => (
    <input id={k} className={`input ${errors[k] ? 'input-error' : ''}`} value={form[k]} onChange={set(k)} aria-invalid={!!errors[k]} {...props} />
  );

  return (
    <AuthShell title="Create student account" subtitle="Register with your DIU details to use CampusShield.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Full name" required error={errors.name} htmlFor="name">{input('name', { placeholder: 'e.g. Ayesha Rahman', autoComplete: 'name' })}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Student ID" required error={errors.studentId} htmlFor="studentId">{input('studentId', { placeholder: '232-35-456' })}</Field>
          <Field label="Phone number" required error={errors.phone} htmlFor="phone">{input('phone', { placeholder: '01712345678', type: 'tel', autoComplete: 'tel' })}</Field>
        </div>
        <Field label="University email" required error={errors.email} htmlFor="email">{input('email', { placeholder: 'name@diu.edu.bd', type: 'email', autoComplete: 'email' })}</Field>
        <Field label="Department" required error={errors.department} htmlFor="department">
          <select id="department" className={`input ${errors.department ? 'input-error' : ''}`} value={form.department} onChange={set('department')}>
            <option value="">Select department</option>
            {depts.map((d) => <option key={d}>{d}</option>)}
          </select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Password" required error={errors.password} htmlFor="password">{input('password', { type: 'password', autoComplete: 'new-password', placeholder: '••••••' })}</Field>
          <Field label="Confirm password" required error={errors.confirmPassword} htmlFor="confirmPassword">{input('confirmPassword', { type: 'password', autoComplete: 'new-password', placeholder: '••••••' })}</Field>
        </div>
        <button type="submit" className="btn-primary w-full py-3" disabled={busy}>
          {busy ? <Spinner className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />} Create account
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Already registered? <Link to="/login" className="font-semibold text-brand-600 hover:underline">Log in</Link>
      </p>
      <p className="mt-2 text-center text-xs text-slate-400">Security and admin accounts are created by the system administrator.</p>
    </AuthShell>
  );
}
