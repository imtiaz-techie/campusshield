import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Save, KeyRound, ShieldCheck, MapPin } from 'lucide-react';
import { AuthAPI, errMsg, fieldErrors } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Field, PageHeader, Spinner, Toggle } from '../../components/ui';
import { fmtDate, initials } from '../../utils/format';

export default function Profile() {
  const { user, setUser } = useAuth();
  const isStudent = user.role === 'student';
  const [depts, setDepts] = useState([]);
  const [form, setForm] = useState({ name: user.name, phone: user.phone, department: user.department || '' });
  const [errors, setErrors] = useState({});
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwErr, setPwErr] = useState({});
  const [busy, setBusy] = useState('');

  useEffect(() => { if (isStudent) AuthAPI.departments().then((r) => setDepts(r.data)).catch(() => {}); }, [isStudent]);

  const saveProfile = async (e) => {
    e.preventDefault();
    const er = {};
    if (form.name.trim().length < 3) er.name = 'Enter your full name';
    if (!/^(\+?880|0)1[3-9]\d{8}$/.test(form.phone.replace(/[\s-]/g, ''))) er.phone = 'Valid BD mobile number required';
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy('profile');
    try {
      const r = await AuthAPI.update(isStudent ? form : { name: form.name, phone: form.phone });
      setUser(r.data);
      toast.success('Profile updated');
    } catch (err) { setErrors(fieldErrors(err)); toast.error(errMsg(err)); } finally { setBusy(''); }
  };

  const togglePrivacy = async (v) => {
    setBusy('privacy');
    try {
      const r = await AuthAPI.update({ locationSharing: v });
      setUser(r.data);
      toast.success(v ? 'Location sharing enabled' : 'Location sharing disabled. Coordinates will not be attached to reports.');
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(''); }
  };

  const changePw = async (e) => {
    e.preventDefault();
    const er = {};
    if (!pw.currentPassword) er.currentPassword = 'Required';
    if (!/^(?=.*[A-Za-z])(?=.*\d).{6,64}$/.test(pw.newPassword)) er.newPassword = '6+ characters with a letter and a number';
    if (pw.confirm !== pw.newPassword) er.confirm = 'Passwords do not match';
    setPwErr(er);
    if (Object.keys(er).length) return;
    setBusy('pw');
    try {
      await AuthAPI.password({ currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      toast.success('Password changed');
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(''); }
  };

  return (
    <div>
      <PageHeader title={isStudent ? 'Profile & Privacy' : 'My Profile'} subtitle="Manage your personal details and account security." />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-6 text-center">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-2xl font-bold text-white">{initials(user.name)}</span>
          <h2 className="mt-4 text-lg font-bold text-navy">{user.name}</h2>
          <p className="text-sm text-slate-500">{user.email}</p>
          <span className="badge mt-2 bg-brand-50 capitalize text-brand-700 ring-brand-200">{user.role}</span>
          <dl className="mt-6 space-y-2 border-t border-slate-100 pt-4 text-left text-sm">
            {user.studentId && <div className="flex justify-between"><dt className="text-slate-500">Student ID</dt><dd className="font-mono font-medium">{user.studentId}</dd></div>}
            {user.department && <div className="flex justify-between gap-3"><dt className="text-slate-500">Department</dt><dd className="text-right font-medium">{user.department}</dd></div>}
            <div className="flex justify-between"><dt className="text-slate-500">Member since</dt><dd className="font-medium">{fmtDate(user.createdAt)}</dd></div>
          </dl>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <form className="card space-y-4 p-6" onSubmit={saveProfile} noValidate>
            <h3 className="font-semibold text-navy">Personal information</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" error={errors.name} htmlFor="pn"><input id="pn" className={`input ${errors.name ? 'input-error' : ''}`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <Field label="Phone" error={errors.phone} htmlFor="pp"><input id="pp" className={`input ${errors.phone ? 'input-error' : ''}`} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
              <Field label="Email" hint="Email cannot be changed"><input className="input" value={user.email} disabled /></Field>
              {isStudent && (
                <Field label="Department" htmlFor="pd">
                  <select id="pd" className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                    {depts.map((d) => <option key={d}>{d}</option>)}
                  </select>
                </Field>
              )}
            </div>
            <div className="flex justify-end"><button className="btn-primary" disabled={busy === 'profile'}>{busy === 'profile' ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />} Save changes</button></div>
          </form>

          {isStudent && (
            <div className="card space-y-4 p-6">
              <h3 className="flex items-center gap-2 font-semibold text-navy"><ShieldCheck className="h-4 w-4 text-brand-600" /> Location privacy</h3>
              <Toggle
                checked={user.locationSharing !== false}
                onChange={togglePrivacy}
                disabled={busy === 'privacy'}
                label="Allow location sharing with campus security"
                description="When this is off, coordinates are never attached to your reports, even during SOS. You can also turn sharing off for a single report."
              />
              <p className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-500"><MapPin className="h-4 w-4 shrink-0" /> This prototype only uses simulated campus coordinates. It never reads your real device location.</p>
            </div>
          )}

          <form className="card space-y-4 p-6" onSubmit={changePw} noValidate>
            <h3 className="flex items-center gap-2 font-semibold text-navy"><KeyRound className="h-4 w-4 text-brand-600" /> Change password</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Current" error={pwErr.currentPassword}><input type="password" autoComplete="current-password" className="input" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></Field>
              <Field label="New" error={pwErr.newPassword}><input type="password" autoComplete="new-password" className="input" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></Field>
              <Field label="Confirm new" error={pwErr.confirm}><input type="password" autoComplete="new-password" className="input" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></Field>
            </div>
            <div className="flex justify-end"><button className="btn-dark" disabled={busy === 'pw'}>{busy === 'pw' && <Spinner className="h-4 w-4" />} Update password</button></div>
          </form>
        </div>
      </div>
    </div>
  );
}
