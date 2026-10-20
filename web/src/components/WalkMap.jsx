import { MapContainer, TileLayer, Polyline, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';

const emojiIcon = (emoji, cls = '') => L.divIcon({ className: `map-emoji ${cls}`, html: `<span>${emoji}</span>`, iconSize: [36, 36], iconAnchor: [18, 18] });
const HOME = emojiIcon('🏠', 'home');

function Fit({ path }) {
  const map = useMap();
  const key = JSON.stringify(path?.[0]);
  useEffect(() => { if (path?.length) map.fitBounds(L.latLngBounds(path).pad(0.35)); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/** routes: [{id,path,name}], selectedId, trail: [[lat,lng]], current: [lat,lng] */
export default function WalkMap({ routes = [], selectedId, onSelect, trail, current, dog = '🐕', alert, height = 300 }) {
  const sel = routes.find((r) => r.id === selectedId) || routes[0];
  if (!sel) return <div className="map-box" style={{ height }} />;
  return (
    <div className="map-box" style={{ height }}>
      <MapContainer center={sel.path[0]} zoom={16} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' className="tiles" />
        <Fit path={sel.path} />
        {routes.filter((r) => r.id !== sel.id).map((r) => (
          <Polyline key={r.id} positions={r.path} pathOptions={{ color: '#9fb5c2', weight: 4, opacity: 0.55, dashArray: '4 8' }} eventHandlers={{ click: () => onSelect?.(r.id) }}>
            <Tooltip sticky>{r.name}</Tooltip>
          </Polyline>
        ))}
        <Polyline positions={sel.path} pathOptions={{ color: '#658ba3', weight: 6, opacity: trail ? 0.35 : 0.9, dashArray: trail ? '6 10' : null }} />
        {trail?.length > 1 && <Polyline positions={trail} pathOptions={{ color: alert ? '#c77e73' : '#d1a94a', weight: 6, opacity: 0.95 }} />}
        <Marker position={sel.path[0]} icon={HOME}><Tooltip>交接點</Tooltip></Marker>
        {current && <Marker position={current} icon={emojiIcon(dog, alert ? 'alert' : 'live')} />}
      </MapContainer>
    </div>
  );
}
