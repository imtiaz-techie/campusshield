import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Search, UserCog, Power } from 'lucide-react';
import { AuthAPI, UserAPI, errMsg, fieldErrors } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ConfirmDialog, EmptyState, Field, Modal, PageHeader, Skeleton, Spinner } from '../../components/ui';
import { fmtDate, initials } from '../../utils/format';

const ROLE_STYLE = {
  student: 'bg-blue-50 text-blue-700 ring-blue-200',
  security: 'bg-amber-50 text-amber-700 ring-amber-200',
  admin: 'bg-purple-50 text-purple-700 ring-purple-200',
};
const EMPTY = { name: '', email: '', phone: '', role: 'security', department: '', studentId: '', password: '', isActive: true };

export default function Users() {
  const { user: me } = useAuth();
  const [params, setParams] = useSearchParams();
  const role = params.get('role') || '';
  const status = params.get('status') || '';
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState(null);
  const [depts, setDepts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null); // {type, user}

  const load = useCallback(() => {
    UserAPI.list({ role, status, q: search }).then((r) => setUsers(r.data)).catch((e) => { toast.error(errMsg(e)); setUsers([]); });
  }, [role, status, search]);
  useEffect(() => { setUsers(null); load(); }, [load]);
  useEffect(() => { AuthAPI.departments().then((r) => setDepts(r.data)).catch(() => {}); }, []);

  const setFilter = (k, v) => { const p = Object.fromEntries(params); if (v) p[k] = v; else delete p[k]; setParams(p); };

  const open = (u) => {
    setEditing(u || 'new');
    setErrors({});
    setForm(u ? { name: u.name, email: u.email, phone: u.phone, role: u.role, department: u.department || '', studentId: u.studentId || '', password: '', isActive: u.isActive } : EMPTY);
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const body = { ...form };
      if (editing !== 'new' && !body.password) delete body.password;
      const r = editing === 'new' ? await UserAPI.create(body) : await UserAPI.update(editing._id, body);
      toast.success(r.message);
      setEditing(null);
      load();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errMsg(err));
    } finally { setBusy(false); }
  };

  const doConfirm = async () => {
    setBusy(true);
    try {
      if (confirm.type === 'delete') await UserAPI.remove(confirm.user._id);
      else await UserAPI.update(confirm.user._id, { isActive: !confirm.user.isActive });
      toast.success(confirm.type === 'delete' ? 'User deleted' : `Account ${confirm.user.isActive ? 'deactivated' : 'activated'}`);
      setConfirm(null);
      load();
    } catch (err) { toast.error(errMsg(err)); setConfirm(null); } finally { setBusy(false); }
  };

  const f = (k) => ({ value: form[k], onChange: (e) => setForm({ ...form, [k]: e.target.value }), className: `input ${errors[k] ? 'input-error' : ''}` });

  return (
    <div>
      <PageHeader title="User Management" subtitle="Manage student, security personnel and administrator accounts." actions={<button className="btn-primary" onClick={() => open()}><Plus className="h-4 w-4" /> New account</button>} />
      <div className="card mb-4 grid gap-3 p-4 sm:grid-cols-4">
        <form className="relative sm:col-span-2" onSubmit={(e) => { e.preventDefault(); setSearch(q.trim()); }}>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Search name, email, student ID, phone" value={q} onChange={(e) => setQ(e.target.value)} onBlur={() => setSearch(q.trim())} />
        </form>
        <select className="input" value={role} onChange={(e) => setFilter('role', e.target.value)} aria-label="Role">
          <option value="">All roles</option><option value="student">Students</option><option value="security">Security</option><option value="admin">Admins</option>
        </select>
        <select className="input" value={status} onChange={(e) => setFilter('status', e.target.value)} aria-label="Status">
          <option value="">Any status</option><option value="active">Active</option><option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        {!users ? <div className="space-y-3 p-5">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div> : users.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50"><tr><th className="table-th">User</th><th className="table-th">Role</th><th className="table-th">Contact</th><th className="table-th">Activity</th><th className="table-th">Status</th><th className="table-th text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u._id} className={u.isActive ? '' : 'bg-slate-50/70 text-slate-400'}>
                    <td className="table-td">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{initials(u.name)}</span>
                        <div className="min-w-0"><p className="font-medium text-slate-800">{u.name}{u._id === me._id && <span className="ml-1 text-xs text-slate-400">(you)</span>}</p><p className="text-xs text-slate-500">{u.email}</p></div>
                      </div>
                    </td>
                    <td className="table-td"><span className={`badge capitalize ${ROLE_STYLE[u.role]}`}>{u.role}</span>{u.studentId && <p className="mt-1 font-mono text-xs text-slate-400">{u.studentId}</p>}</td>
                    <td className="table-td text-xs"><span className="font-mono">{u.phone}</span><p className="text-slate-400">{u.department}</p></td>
                    <td className="table-td text-xs">{u.role === 'student' ? `${u.incidentCount} report${u.incidentCount === 1 ? '' : 's'}` : `${u.assignedCount} assigned`}<p className="text-slate-400">Joined {fmtDate(u.createdAt)}</p></td>
                    <td className="table-td"><span className={`badge ${u.isActive ? 'bg-green-50 text-green-700 ring-green-200' : 'bg-slate-100 text-slate-500 ring-slate-200'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td className="table-td">
                      <div className="flex justify-end gap-1">
                        <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={() => open(u)} title="Edit" aria-label={`Edit ${u.name}`}><Pencil className="h-4 w-4" /></button>
                        {u._id !== me._id && (
                          <>
                            <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={() => setConfirm({ type: 'toggle', user: u })} title={u.isActive ? 'Deactivate' : 'Activate'} aria-label="Toggle active"><Power className="h-4 w-4" /></button>
                            <button className="rounded-lg p-2 text-red-500 hover:bg-red-50" onClick={() => setConfirm({ type: 'delete', user: u })} title="Delete" aria-label={`Delete ${u.name}`}><Trash2 className="h-4 w-4" /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState icon={UserCog} title="No users found" />}
      </div>

      <Modal
        open={!!editing}
        onClose={() => !busy && setEditing(null)}
        title={editing === 'new' ? 'Create account' : `Edit ${editing?.name || ''}`}
        footer={<><button className="btn-outline" onClick={() => setEditing(null)}>Cancel</button><button className="btn-primary" type="submit" form="user-form" disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Save</button></>}
      >
        <form id="user-form" className="space-y-4" onSubmit={save} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" required error={errors.name}><input {...f('name')} /></Field>
            <Field label="Role" required error={errors.role}>
              <select {...f('role')} disabled={editing !== 'new' && editing?._id === me._id}><option value="student">Student</option><option value="security">Security personnel</option><option value="admin">Administrator</option></select>
            </Field>
            <Field label="Email" required error={errors.email}><input type="email" {...f('email')} /></Field>
            <Field label="Phone" required error={errors.phone}><input {...f('phone')} placeholder="01712345678" /></Field>
            {form.role === 'student' ? (
              <>
                <Field label="Student ID" required error={errors.studentId}><input {...f('studentId')} placeholder="232-35-456" /></Field>
                <Field label="Department" error={errors.department}><select {...f('department')}><option value="">Select</option>{depts.map((d) => <option key={d}>{d}</option>)}</select></Field>
              </>
            ) : (
              <Field label="Unit / department" error={errors.department}><input {...f('department')} placeholder="Campus Security" /></Field>
            )}
            <Field label={editing === 'new' ? 'Password' : 'New password (optional)'} required={editing === 'new'} error={errors.password}><input type="password" autoComplete="new-password" {...f('password')} /></Field>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={doConfirm}
        loading={busy}
        title={confirm?.type === 'delete' ? 'Delete account?' : confirm?.user.isActive ? 'Deactivate account?' : 'Activate account?'}
        confirmLabel={confirm?.type === 'delete' ? 'Delete' : confirm?.user.isActive ? 'Deactivate' : 'Activate'}
        tone={confirm?.type === 'delete' || confirm?.user.isActive ? 'danger' : 'primary'}
        message={confirm?.type === 'delete'
          ? `${confirm?.user.name} will be permanently removed. Students with incident records cannot be deleted; deactivate them instead.`
          : `${confirm?.user.name} will ${confirm?.user.isActive ? 'no longer be able to log in' : 'be able to log in again'}.`}
      />
    </div>
  );
}
