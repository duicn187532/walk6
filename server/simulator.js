// Fake GPS: walks every in-progress booking along its route. SIM_SPEED=10 → a 60-min walk plays in 6 min.
import { all, run } from './db.js';
import { findRoute, pointAt } from './domain.js';

const TICK_MS = 3000;
const SPEED = Number(process.env.SIM_SPEED || 10);

export function startSimulator() {
  setInterval(() => {
    for (const b of all("SELECT id, route_id, duration, progress, off_route FROM bookings WHERE status = 'in_progress'")) {
      if (b.progress >= 1) continue;
      const step = (TICK_MS / 1000 / (b.duration * 60)) * SPEED;
      const progress = Math.min(1, b.progress + step);
      let [lat, lng] = pointAt(findRoute(b.route_id).path, progress);
      if (b.off_route) { lat += 0.0013; lng += 0.0009; } // ~160 m 偏離
      run('UPDATE bookings SET progress = ? WHERE id = ?', progress, b.id);
      run('INSERT INTO gps_points (booking_id, lat, lng, off_route) VALUES (?,?,?,?)', b.id, lat, lng, b.off_route);
    }
  }, TICK_MS);
}
