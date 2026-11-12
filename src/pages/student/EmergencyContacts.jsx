import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Phone, Star, Users, Mail } from 'lucide-react';
import { ContactAPI, errMsg, fieldErrors } from '../../services/api';
import { ConfirmDialog, EmptyState, Field, Modal, PageHeader, PageLoader, Spinner } from '../../components/ui';
import { initials } from '../../utils/format';

const EMPTY = { contactName: '', relationship: '', phone: '', email: '', isPrimary: false };

export default function EmergencyContacts() {
  const [contacts, setContacts] = useState(null);
  const [relationships, setRelationships] = useState([]);
  const [editing, setEditing] = useState(null); // null | 'new' | contact
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const load = () => ContactAPI.list().then((r) => setContacts(r.data)).catch((e) => { toast.error(errMsg(e)); setContacts([]); });
  useEffect(() => {
    load();
    ContactAPI.relationships().then((r) => setRelationships(r.data)).catch(() => {});
  }, []);

  const openForm = (c) => {
    setEditing(c || 'new');
    setForm(c ? { contactName: c.contactName, relationship: c.relationship, phone: c.phone, email: c.email || '', isPrimary: c.isPrimary } : EMPTY);
    setErrors({});
  };

  const validate = () => {
    const e = {};
    if (form.contactName.trim().length < 2) e.contactName = 'Enter the contact name';
    if (!form.relationship) e.relationship = 'Select the relationship';
    if (!/^(\+?880|0)1[3-9]\d{8}$/.test(form.phone.replace(/[\s-]/g, ''))) e.phone = 'Valid BD mobile number, e.g. 01712345678';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const save = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      const r = editing === 'new' ? await ContactAPI.create(form) : await ContactAPI.update(editing._id, form);
      toast.success(r.message);
      setEditing(null);
      load();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await ContactAPI.remove(toDelete._id);
      toast.success('Contact deleted');
      setToDelete(null);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  if (!contacts) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Trusted Emergency Contacts"
        subtitle="These people get a simulated alert when you send an SOS or report an incident."
        actions={<button className="btn-primary" onClick={() => openForm()} disabled={contacts.length >= 10}><Plus className="h-4 w-4" /> Add contact</button>}
      />

      {contacts.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {contacts.map((c) => (
            <div key={c._id} className="card flex flex-col p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 font-bold text-brand-700">{initials(c.contactName)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-navy">{c.contactName}</p>
                  <p className="text-sm text-slate-500">{c.relationship}</p>
                </div>
                {c.isPrimary && <span className="badge bg-amber-50 text-amber-700 ring-amber-200"><Star className="h-3 w-3 fill-current" /> Primary</span>}
              </div>
              <div className="mt-4 space-y-1.5 text-sm text-slate-600">
                <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" /> <span className="font-mono">{c.phone}</span></p>
                {c.email && <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" /> {c.email}</p>}
              </div>
              <div className="mt-5 flex gap-2 border-t border-slate-100 pt-4">
                <button className="btn-outline btn-sm flex-1" onClick={() => openForm(c)}><Pencil className="h-3.5 w-3.5" /> Edit</button>
                <button className="btn-sm btn flex-1 border border-red-200 text-red-600 hover:bg-red-50" onClick={() => setToDelete(c)}><Trash2 className="h-3.5 w-3.5" /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <EmptyState icon={Users} title="No trusted contacts yet" message="Add family members or friends. They will be told (by simulation) when you need help." action={<button className="btn-primary" onClick={() => openForm()}><Plus className="h-4 w-4" /> Add your first contact</button>} />
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => !busy && setEditing(null)}
        title={editing === 'new' ? 'Add trusted contact' : 'Edit contact'}
        footer={(
          <>
            <button className="btn-outline" onClick={() => setEditing(null)} disabled={busy}>Cancel</button>
            <button className="btn-primary" form="contact-form" type="submit" disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Save contact</button>
          </>
        )}
      >
        <form id="contact-form" className="space-y-4" onSubmit={save} noValidate>
          <Field label="Contact name" required error={errors.contactName} htmlFor="cn">
            <input id="cn" className={`input ${errors.contactName ? 'input-error' : ''}`} value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} placeholder="e.g. Rashida Rahman" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Relationship" required error={errors.relationship} htmlFor="rel">
              <select id="rel" className={`input ${errors.relationship ? 'input-error' : ''}`} value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })}>
                <option value="">Select</option>
                {relationships.map((r) => <option key={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Phone number" required error={errors.phone} htmlFor="ph">
              <input id="ph" type="tel" className={`input ${errors.phone ? 'input-error' : ''}`} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="01712345678" />
            </Field>
          </div>
          <Field label="Email (optional)" error={errors.email} htmlFor="em">
            <input id="em" type="email" className={`input ${errors.email ? 'input-error' : ''}`} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="contact@example.com" />
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={form.isPrimary} onChange={(e) => setForm({ ...form, isPrimary: e.target.checked })} /> Set as primary contact
          </label>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        loading={busy}
        title="Delete contact?"
        confirmLabel="Delete"
        message={`${toDelete?.contactName} will no longer receive simulated emergency alerts.`}
      />
    </div>
  );
}
