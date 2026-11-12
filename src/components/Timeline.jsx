import { ArrowRight, Bot, CheckCircle2, Flag, UserCheck, Zap, FilePlus2 } from 'lucide-react';
import { STATUSES } from '../utils/constants';
import { fmtDateTime } from '../utils/format';

const ICON = {
  Created: FilePlus2,
  'Status Update': CheckCircle2,
  'Priority Change': Flag,
  Assignment: UserCheck,
  Escalation: Zap,
  Note: Bot,
};
const TONE = {
  Created: 'bg-brand-50 text-brand-600',
  'Status Update': 'bg-green-50 text-green-600',
  'Priority Change': 'bg-orange-50 text-orange-600',
  Assignment: 'bg-indigo-50 text-indigo-600',
  Escalation: 'bg-red-50 text-red-600',
  Note: 'bg-slate-100 text-slate-600',
};

/** Vertical audit timeline (IncidentHistory). */
export default function Timeline({ items = [] }) {
  return (
    <ol className="relative space-y-5">
      {items.map((h, idx) => {
        const Icon = ICON[h.action] || CheckCircle2;
        return (
          <li key={h._id || idx} className="relative flex gap-3">
            {idx < items.length - 1 && <span className="absolute left-4 top-9 h-[calc(100%-12px)] w-px bg-slate-200" aria-hidden="true" />}
            <span className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${TONE[h.action] || TONE.Note}`}><Icon className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-x-2 text-sm">
                <span className="font-semibold text-slate-800">{h.action}</span>
                {h.action === 'Status Update' && h.previousStatus && (
                  <span className="inline-flex items-center gap-1 text-slate-600">{h.previousStatus}<ArrowRight className="h-3 w-3" />{h.newStatus}</span>
                )}
              </div>
              {h.notes && <p className="mt-0.5 text-sm text-slate-600">{h.notes}</p>}
              <p className="mt-0.5 text-xs text-slate-400">{h.updatedByName || 'System'} · {fmtDateTime(h.createdAt)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Horizontal progress tracker for the student view. */
export function StatusProgress({ status }) {
  const idx = STATUSES.indexOf(status);
  return (
    <div className="overflow-x-auto thin-scroll">
      <ol className="flex min-w-[560px] items-center">
        {STATUSES.map((s, i) => {
          const done = i <= idx;
          return (
            <li key={s} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1.5 text-center">
                <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${done ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-500'} ${i === idx ? 'ring-4 ring-brand-100' : ''}`}>{i + 1}</span>
                <span className={`w-20 text-[11px] font-medium leading-tight ${done ? 'text-navy' : 'text-slate-400'}`}>{s}</span>
              </div>
              {i < STATUSES.length - 1 && <span className={`mx-1 mb-6 h-0.5 flex-1 rounded ${i < idx ? 'bg-brand-600' : 'bg-slate-200'}`} />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
