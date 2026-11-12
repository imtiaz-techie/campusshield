import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Lock } from 'lucide-react';
import { CategoryAPI, errMsg, fieldErrors } from '../../services/api';
import { CategoryIcon, ConfirmDialog, Field, Modal, PageHeader, PageLoader, PriorityBadge, Spinner, Toggle } from '../../components/ui';
import { ICONS, PRIORITIES } from '../../utils/constants';

const EMPTY = { name: '', icon: 'AlertCircle', color: '#2563EB', defaultPriority: 'Medium', responseCategory: '', recommendedAction: '', isActive: true };

export default function Categories() {
  const [cats, setCats] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const load = useCallback(() => CategoryAPI.list(true).then((r) => setCats(r.data)).catch((e) => { toast.error(errMsg(e)); setCats([]); }), []);
  useEffect(() => { load(); }, [load]);

  const open = (c) => {
    setEditing(c || 'new');
    setErrors({});
    setForm(c ? { name: c.name, icon: c.icon, color: c.color, defaultPriority: c.defaultPriority, responseCategory: c.responseCategory, recommendedAction: c.recommendedAction, isActive: c.isActive } : EMPTY);
  };

  const save = async (e) => {
    e.preventDefault();
    if (form.name.trim().length < 2) { setErrors({ name: 'Name is required' }); return; }
    setBusy(true);
    try {
      const r = editing === 'new' ? await CategoryAPI.create(form) : await CategoryAPI.update(editing._id, form);
      toast.success(r.message);
      setEditing(null);
      load();
    } catch (err) { setErrors(fieldErrors(err)); toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  const toggle = async (c) => {
    try { await CategoryAPI.update(c._id, { isActive: !c.isActive }); toast.success(`${c.name} ${c.isActive ? 'deactivated' : 'activated'}`); load(); } catch (e) { toast.error(errMsg(e)); }
  };

  const remove = async () => {
    setBusy(true);
    try { await CategoryAPI.remove(toDelete._id); toast.success('Category deleted'); setToDelete(null); load(); } catch (e) { toast.error(errMsg(e)); setToDelete(null); } finally { setBusy(false); }
  };

  if (!cats) return <PageLoader />;

  return (
    <div>
      <PageHeader title="Incident Categories" subtitle="Each category sets the default priority, response category and recommended action used by the escalation engine." actions={<button className="btn-primary" onClick={() => open()}><Plus className="h-4 w-4" /> New category</button>} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cats.map((c) => (
          <div key={c._id} className={`card flex flex-col p-5 ${c.isActive ? '' : 'opacity-60'}`}>
            <div className="flex items-start gap-3">
              <CategoryIcon icon={c.icon} color={c.color} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 font-semibold text-navy">{c.name}{c.isSystem && <Lock className="h-3.5 w-3.5 text-slate-400" aria-label="Built-in" />}</p>
                <p className="text-xs text-slate-500">{c.incidentCount} incident{c.incidentCount === 1 ? '' : 's'}</p>
              </div>
              <PriorityBadge priority={c.defaultPriority} />
            </div>
            <p className="mt-3 text-xs font-semibold uppercase text-slate-400">Response</p>
            <p className="text-sm text-slate-700">{c.responseCategory}</p>
            <p className="mt-2 text-xs font-semibold uppercase text-slate-400">Recommended action</p>
            <p className="line-clamp-3 text-sm text-slate-600">{c.recommendedAction}</p>
            <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
              <div className="w-36"><Toggle checked={c.isActive} onChange={() => toggle(c)} label={c.isActive ? 'Active' : 'Inactive'} /></div>
              <div className="flex gap-1">
                <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={() => open(c)} aria-label={`Edit ${c.name}`}><Pencil className="h-4 w-4" /></button>
                {!c.isSystem && <button className="rounded-lg p-2 text-red-500 hover:bg-red-50" onClick={() => setToDelete(c)} aria-label={`Delete ${c.name}`}><Trash2 className="h-4 w-4" /></button>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal open={!!editing} onClose={() => !busy && setEditing(null)} title={editing === 'new' ? 'New category' : `Edit ${editing?.name || ''}`} size="lg"
        footer={<><button className="btn-outline" onClick={() => setEditing(null)}>Cancel</button><button type="submit" form="cat-form" className="btn-primary" disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Save</button></>}
      >
        <form id="cat-form" className="space-y-4" onSubmit={save} noValidate>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2"><Field label="Name" required error={errors.name}><input className={`input ${errors.name ? 'input-error' : ''}`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field></div>
            <Field label="Default priority" error={errors.defaultPriority}>
              <select className="input" value={form.defaultPriority} onChange={(e) => setForm({ ...form, defaultPriority: e.target.value })}>{PRIORITIES.map((p) => <option key={p}>{p}</option>)}</select>
            </Field>
          </div>
          <Field label="Icon & color" error={errors.icon || errors.color}>
            <div className="flex flex-wrap items-center gap-2">
              {Object.keys(ICONS).map((k) => (
                <button type="button" key={k} onClick={() => setForm({ ...form, icon: k })} className={`rounded-xl p-0.5 ${form.icon === k ? 'ring-2 ring-brand-600' : ''}`} aria-label={k}><CategoryIcon icon={k} color={form.color} size="sm" /></button>
              ))}
              <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value.toUpperCase() })} className="h-9 w-12 cursor-pointer rounded-lg border border-slate-300" aria-label="Color" />
            </div>
          </Field>
          <Field label="Response category" hint="e.g. Security Patrol"><input className="input" maxLength={80} value={form.responseCategory} onChange={(e) => setForm({ ...form, responseCategory: e.target.value })} /></Field>
          <Field label="Recommended action"><textarea rows={3} maxLength={300} className="input" value={form.recommendedAction} onChange={(e) => setForm({ ...form, recommendedAction: e.target.value })} /></Field>
        </form>
      </Modal>

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={remove} loading={busy} title="Delete category?" confirmLabel="Delete" message={`"${toDelete?.name}" will be removed. Categories already used by incidents can only be deactivated.`} />
    </div>
  );
}
