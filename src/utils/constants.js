import {
  UserX, ShieldAlert, HeartPulse, Wallet, Flame, CarFront, Eye, AlertCircle, Siren, Zap, Droplets, Bug, Bike, Building2, Lock, Phone,
} from 'lucide-react';

export const ICONS = { UserX, ShieldAlert, HeartPulse, Wallet, Flame, CarFront, Eye, AlertCircle, Siren, Zap, Droplets, Bug, Bike, Building2, Lock, Phone };

export const STATUSES = ['Reported', 'Acknowledged', 'Response Dispatched', 'In Progress', 'Resolved', 'Closed'];
export const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

export const STATUS_STYLE = {
  Reported: 'bg-red-50 text-red-700 ring-red-200',
  Acknowledged: 'bg-amber-50 text-amber-700 ring-amber-200',
  'Response Dispatched': 'bg-blue-50 text-blue-700 ring-blue-200',
  'In Progress': 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  Resolved: 'bg-green-50 text-green-700 ring-green-200',
  Closed: 'bg-slate-100 text-slate-600 ring-slate-200',
};

export const PRIORITY_STYLE = {
  Critical: 'bg-red-600 text-white ring-red-600',
  High: 'bg-orange-100 text-orange-800 ring-orange-300',
  Medium: 'bg-amber-50 text-amber-800 ring-amber-200',
  Low: 'bg-slate-100 text-slate-700 ring-slate-200',
};

export const PRIORITY_COLOR = { Critical: '#DC2626', High: '#EA580C', Medium: '#F59E0B', Low: '#64748B' };
export const STATUS_COLOR = {
  Reported: '#DC2626', Acknowledged: '#F59E0B', 'Response Dispatched': '#2563EB', 'In Progress': '#6366F1', Resolved: '#16A34A', Closed: '#94A3B8',
};

/** Mock (simulated) campus locations around DIU Smart City. Real device GPS is never read. */
export const CAMPUS_CENTER = [23.8766, 90.3207];
export const CAMPUS_LOCATIONS = [
  { name: 'DIU Main Gate', lat: 23.87755, lng: 90.32118 },
  { name: 'Knowledge Tower', lat: 23.87664, lng: 90.32026 },
  { name: 'Central Library', lat: 23.87612, lng: 90.31972 },
  { name: 'Inspiration Building', lat: 23.87582, lng: 90.32098 },
  { name: 'Food Court', lat: 23.87693, lng: 90.31906 },
  { name: 'Female Dormitory', lat: 23.87481, lng: 90.32182 },
  { name: 'Male Dormitory', lat: 23.87455, lng: 90.3189 },
  { name: 'Sports Ground', lat: 23.87808, lng: 90.31855 },
  { name: 'Bus Stand (Transport Pool)', lat: 23.87862, lng: 90.32241 },
  { name: 'Parking Area', lat: 23.87721, lng: 90.32301 },
];

/** Returns a simulated GPS fix: a known campus spot plus small random noise. */
export function simulateGps(locationName) {
  const base = CAMPUS_LOCATIONS.find((l) => l.name === locationName) || CAMPUS_LOCATIONS[Math.floor(Math.random() * CAMPUS_LOCATIONS.length)];
  const noise = () => (Math.random() - 0.5) * 0.0005;
  return { name: base.name, latitude: +(base.lat + noise()).toFixed(6), longitude: +(base.lng + noise()).toFixed(6), accuracy: Math.round(5 + Math.random() * 15) };
}
