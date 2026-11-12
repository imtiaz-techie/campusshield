import { useEffect, useRef } from 'react';
import { AlertTriangle, Inbox, Loader2, X } from 'lucide-react';
import { ICONS, PRIORITY_STYLE, STATUS_STYLE } from '../utils/constants';

export function Spinner({ className = 'h-5 w-5' }) {
  return <Loader2 className={`animate-spin ${className}`} aria-hidden="true" />;
}

export function PageLoader({ label = 'Loading...' }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-slate-500" role="status">
      <Spinner className="h-8 w-8 text-brand-600" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`} />;
}

export function EmptyState({ icon: Icon = Inbox, title = 'Nothing here yet', message, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 rounded-2xl bg-slate-100 p-3 text-slate-400"><Icon className="h-7 w-7" /></div>
      <h3 className="font-semibold text-slate-800">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-slate-500">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatusBadge({ status }) {
  return <span className={`badge ${STATUS_STYLE[status] || STATUS_STYLE.Closed}`}>{status}</span>;
}

export function PriorityBadge({ priority }) {
  return (
    <span className={`badge ${PRIORITY_STYLE[priority] || PRIORITY_STYLE.Low}`}>
      {priority === 'Critical' && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />}
      {priority}
    </span>
  );
}

export function CategoryIcon({ icon, color = '#64748B', size = 'md' }) {
  const Icon = ICONS[icon] || ICONS.AlertCircle;
  const dims = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-12 w-12' }[size];
  const inner = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-6 w-6' }[size];
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-xl ${dims}`} style={{ backgroundColor: `${color}18`, color }}>
      <Icon className={inner} />
    </span>
  );
}

export function StatCard({ label, value, icon: Icon, tone = 'brand', hint, onClick }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600',
    red: 'bg-emergency-50 text-emergency-600',
    orange: 'bg-warning-50 text-warning',
    green: 'bg-success-50 text-success',
    indigo: 'bg-indigo-50 text-indigo-600',
    slate: 'bg-slate-100 text-slate-600',
  };
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp onClick={onClick} className={`card flex min-w-0 flex-col gap-3 p-4 text-left sm:flex-row sm:items-center sm:gap-4 sm:p-5 ${onClick ? 'transition hover:-translate-y-0.5 hover:shadow-lift' : ''}`}>
      {Icon && <span className={`rounded-xl p-3 ${tones[tone]}`}><Icon className="h-6 w-6" /></span>}
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-navy">{value}</p>
        {hint && <p className="truncate text-xs text-slate-400">{hint}</p>}
      </div>
    </Comp>
  );
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    ref.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  const width = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' }[size];
  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-navy/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={`w-full ${width} max-h-[92vh] animate-fadein overflow-y-auto rounded-t-2xl bg-white shadow-2xl outline-none sm:rounded-2xl`}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
          <h2 className="text-lg font-semibold text-navy">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title = 'Are you sure?', message, confirmLabel = 'Confirm', tone = 'danger', loading }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={(
        <>
          <button className="btn-outline" onClick={onClose} disabled={loading}>Cancel</button>
          <button className={tone === 'danger' ? 'btn-danger' : 'btn-primary'} onClick={onConfirm} disabled={loading}>
            {loading && <Spinner className="h-4 w-4" />} {confirmLabel}
          </button>
        </>
      )}
    >
      <div className="flex gap-3">
        <span className={`h-fit rounded-xl p-2 ${tone === 'danger' ? 'bg-emergency-50 text-emergency-600' : 'bg-brand-50 text-brand-600'}`}><AlertTriangle className="h-5 w-5" /></span>
        <p className="text-sm text-slate-600">{message}</p>
      </div>
    </Modal>
  );
}

/** Form field wrapper: label + control + error text */
export function Field({ label, error, hint, children, required, htmlFor }) {
  return (
    <div>
      {label && <label className="label" htmlFor={htmlFor}>{label}{required && <span className="text-emergency-600"> *</span>}</label>}
      {children}
      {error ? <p className="mt-1 text-xs font-medium text-emergency-600" role="alert">{error}</p> : hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export function Pagination({ meta, onPage }) {
  if (!meta || meta.pages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
      <span>Page {meta.page} of {meta.pages} · {meta.total} records</span>
      <div className="flex gap-2">
        <button className="btn-outline btn-sm" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>Previous</button>
        <button className="btn-outline btn-sm" disabled={meta.page >= meta.pages} onClick={() => onPage(meta.page + 1)}>Next</button>
      </div>
    </div>
  );
}

export function Toggle({ checked, onChange, label, description, disabled }) {
  return (
    <label className={`flex items-start justify-between gap-4 ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
      <span>
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        {description && <span className="block text-xs text-slate-500">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-brand-600' : 'bg-slate-300'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </label>
  );
}
