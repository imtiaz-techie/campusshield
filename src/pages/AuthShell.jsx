import { Link } from 'react-router-dom';
import { ShieldCheck, Siren, MapPin, BellRing } from 'lucide-react';
import Logo from '../components/Logo';

/** Two-column frame shared by the login and registration pages. */
export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-navy p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl" />
        <Link to="/" className="relative"><Logo dark size="lg" /></Link>
        <div className="relative">
          <h2 className="text-4xl font-extrabold leading-tight text-white">Campus safety, made faster.</h2>
          <ul className="mt-8 space-y-4 text-slate-300">
            <li className="flex items-center gap-3"><Siren className="h-5 w-5 text-emergency-500" /> One-tap SOS with confirmation</li>
            <li className="flex items-center gap-3"><MapPin className="h-5 w-5 text-brand-500" /> Privacy-controlled location sharing</li>
            <li className="flex items-center gap-3"><BellRing className="h-5 w-5 text-warning" /> Trusted-contact alert simulation</li>
            <li className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-success" /> Live incident tracking</li>
          </ul>
        </div>
        <p className="relative text-xs text-slate-500">Daffodil International University · SE331 prototype</p>
      </div>
      <div className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 inline-block lg:hidden"><Logo /></Link>
          <h1 className="text-2xl font-bold text-navy sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-slate-500">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
