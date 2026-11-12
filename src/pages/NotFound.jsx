import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import Logo from '../components/Logo';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface px-4 text-center">
      <Logo />
      <Compass className="mt-6 h-12 w-12 text-slate-300" />
      <h1 className="text-3xl font-bold text-navy">Page not found</h1>
      <p className="max-w-sm text-sm text-slate-500">The page you are looking for does not exist or has been moved.</p>
      <Link to="/" className="btn-primary">Back to home</Link>
    </div>
  );
}
