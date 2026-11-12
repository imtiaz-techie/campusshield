import { Crosshair, MapPin, ShieldOff } from 'lucide-react';
import { CAMPUS_LOCATIONS, simulateGps } from '../utils/constants';
import IncidentMap from './IncidentMap';
import { Toggle } from './ui';

/**
 * Simulated GPS sharing with a privacy switch.
 * The browser Geolocation API is never used. Coordinates come from mock campus points.
 */
export default function LocationShare({ share, onShare, coords, onCoords, place, onPlace, profileAllows = true, showMap = true }) {
  const simulate = (name) => {
    const fix = simulateGps(name);
    onCoords({ latitude: fix.latitude, longitude: fix.longitude, accuracy: fix.accuracy });
    if (onPlace) onPlace(fix.name);
  };

  if (!profileAllows) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <ShieldOff className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
        <p>Location sharing is turned off in your <b>Profile &amp; Privacy</b> settings. Security will only see the location text you type.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 p-4">
      <Toggle checked={share} onChange={onShare} label="Share my location with campus security" description="Simulated GPS for this prototype. Real device location is never accessed." />
      {share && (
        <>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select className="input sm:flex-1" value={place || ''} onChange={(e) => simulate(e.target.value)} aria-label="Mock campus position">
              <option value="" disabled>Choose mock position on campus</option>
              {CAMPUS_LOCATIONS.map((l) => <option key={l.name} value={l.name}>{l.name}</option>)}
            </select>
            <button type="button" className="btn-outline" onClick={() => simulate()}><Crosshair className="h-4 w-4" /> Simulate GPS fix</button>
          </div>
          {coords?.latitude != null ? (
            <>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-brand-50 px-3 py-2 font-mono text-xs text-brand-700">
                <span className="inline-flex items-center gap-1 font-sans font-semibold"><MapPin className="h-3.5 w-3.5" /> Simulated fix</span>
                <span>Lat {coords.latitude.toFixed(6)}</span>
                <span>Lng {coords.longitude.toFixed(6)}</span>
                {coords.accuracy && <span>±{coords.accuracy} m</span>}
              </div>
              {showMap && (
                <IncidentMap single height={180} zoom={17} incidents={[{ incidentId: 'you', title: 'Your simulated position', latitude: coords.latitude, longitude: coords.longitude, priority: 'Low', status: 'Reported', location: place, categoryName: 'You' }]} />
              )}
            </>
          ) : (
            <p className="text-xs text-slate-500">No coordinates yet. Pick a campus position or simulate a GPS fix.</p>
          )}
        </>
      )}
    </div>
  );
}
