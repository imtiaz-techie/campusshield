import { ShieldCheck } from 'lucide-react';

export default function Logo({ dark = false, size = 'md' }) {
  const box = size === 'lg' ? 'h-11 w-11' : 'h-9 w-9';
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className={`flex ${box} items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-600/30`}>
        <ShieldCheck className={size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'} />
      </span>
      <span className={`font-extrabold tracking-tight ${size === 'lg' ? 'text-2xl' : 'text-lg'} ${dark ? 'text-white' : 'text-navy'}`}>
        Campus<span className="text-brand-500">Shield</span>
      </span>
    </span>
  );
}
