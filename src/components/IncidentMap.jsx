import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { CAMPUS_CENTER, PRIORITY_COLOR } from '../utils/constants';
import { fmtDateTime } from '../utils/format';

/**
 * Interactive OpenStreetMap with incident markers (colored by priority).
 * Uses CircleMarkers so no external marker images are needed.
 */
export default function IncidentMap({ incidents = [], height = 420, zoom = 17, linkBase, center, single = false }) {
  const pts = incidents.filter((i) => i.latitude != null && i.longitude != null);
  const mapCenter = center || (single && pts[0] ? [pts[0].latitude, pts[0].longitude] : CAMPUS_CENTER);
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200" style={{ height }}>
      <MapContainer center={mapCenter} zoom={zoom} scrollWheelZoom={!single} style={{ height: '100%', width: '100%' }}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {pts.map((i) => {
          const color = PRIORITY_COLOR[i.priority] || '#2563EB';
          const open = !['Resolved', 'Closed'].includes(i.status);
          return (
            <CircleMarker
              key={i._id || i.incidentId}
              center={[i.latitude, i.longitude]}
              radius={i.priority === 'Critical' ? 12 : 9}
              pathOptions={{ color, fillColor: color, fillOpacity: open ? 0.75 : 0.3, weight: open ? 3 : 1 }}
            >
              {!single && <Tooltip direction="top">{i.incidentId} · {i.categoryName}</Tooltip>}
              <Popup>
                <div className="space-y-1 text-xs">
                  <p className="font-semibold text-slate-800">{i.incidentId}{i.isSOS ? ' · SOS' : ''}</p>
                  <p className="text-slate-700">{i.title}</p>
                  <p><b>{i.priority}</b> · {i.status}</p>
                  <p className="text-slate-500">{i.location}</p>
                  <p className="font-mono text-slate-500">{i.latitude.toFixed(5)}, {i.longitude.toFixed(5)}</p>
                  {i.createdAt && <p className="text-slate-500">{fmtDateTime(i.createdAt)}</p>}
                  {linkBase && <Link className="font-semibold text-brand-600" to={`${linkBase}/${i.incidentId}`}>Open incident</Link>}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}

export function MapLegend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-slate-600">
      {Object.entries(PRIORITY_COLOR).map(([p, c]) => (
        <span key={p} className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: c }} />{p}</span>
      ))}
      <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border border-slate-400 bg-slate-200" />Faded = resolved</span>
    </div>
  );
}
