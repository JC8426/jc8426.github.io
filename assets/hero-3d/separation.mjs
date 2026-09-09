/**
 * Small visual separation guard, not a flight controller or EGO obstacle planner.
 * Each aircraft occupies a conservative vertical column: horizontal centre
 * distance must be >= clearance, regardless of altitude. This deliberately
 * forbids close over/under passes and remains safe on uneven terrain.
 *
 * All proposals share one accepted time fraction. Swept relative segments are
 * checked analytically, so opposing fast aircraft cannot pass through each other.
 * Existing overlaps are never teleported apart: only non-decreasing separation
 * is allowed. The caller may issue outward motion to recover an overlap.
 */
export function constrainSeparation(previous, proposed, { clearance = 3.8, limit = Infinity } = {}) {
  if (previous.length !== proposed.length) throw new RangeError('Position counts must match');
  if (!(clearance > 0) || !(limit > 0)) throw new RangeError('Positive clearance and limit required');
  for (const p of [...previous, ...proposed]) {
    if (![p.x, p.y, p.z].every(Number.isFinite)) throw new TypeError('Finite x/y/z positions required');
  }
  // The caller owns valid initial bounds. Clamping an invalid initial state
  // would teleport it; surface that mistake rather than silently moving it.
  if (previous.some(p => Math.abs(p.x) > limit || Math.abs(p.z) > limit)) {
    throw new RangeError('Initial positions must be inside map bounds');
  }
  const bounded = proposed.map(p => ({ x: Math.max(-limit, Math.min(limit, p.x)), y: p.y, z: Math.max(-limit, Math.min(limit, p.z)) }));
  const delta = bounded.map((p, i) => ({ x: p.x - previous[i].x, y: p.y - previous[i].y, z: p.z - previous[i].z }));
  let fraction = 1;
  const initialOverlaps = [];
  for (let i = 0; i < previous.length; i++) {
    for (let j = 0; j < i; j++) {
      const x = previous[i].x - previous[j].x, z = previous[i].z - previous[j].z;
      const dx = delta[i].x - delta[j].x, dz = delta[i].z - delta[j].z;
      const a = dx * dx + dz * dz, b = x * dx + z * dz;
      const c = x * x + z * z - clearance * clearance;
      if (c < -1e-8) initialOverlaps.push([j, i]);
      // For overlapping/contact pairs, squared distance must initially increase
      // or remain constant. With linear motion its derivative only increases.
      if (c <= 1e-8) {
        if (b < -1e-10) fraction = 0;
        continue;
      }
      if (a < 1e-16 || b >= 0) continue;
      const discriminant = b * b - a * c;
      if (discriminant <= 0) continue; // tangent, no penetration
      // Stable form of first positive root of a*t² + 2*b*t + c = 0.
      const contact = c / (-b + Math.sqrt(discriminant));
      if (contact >= 0 && contact < fraction) fraction = Math.max(0, contact - 1e-7);
    }
  }
  const positions = previous.map((p, i) => ({ x: p.x + delta[i].x * fraction, y: p.y + delta[i].y * fraction, z: p.z + delta[i].z * fraction }));
  let minDistance = Infinity, sweptMinDistance = Infinity;
  for (let i = 0; i < positions.length; i++) {
    for (let j = 0; j < i; j++) {
      minDistance = Math.min(minDistance, Math.hypot(positions[i].x - positions[j].x, positions[i].z - positions[j].z));
      const x = previous[i].x - previous[j].x, z = previous[i].z - previous[j].z;
      const dx = (delta[i].x - delta[j].x) * fraction, dz = (delta[i].z - delta[j].z) * fraction;
      const t = Math.max(0, Math.min(1, -(x * dx + z * dz) / (dx * dx + dz * dz || 1)));
      sweptMinDistance = Math.min(sweptMinDistance, Math.hypot(x + dx * t, z + dz * t));
    }
  }
  const boundaryLimited = bounded.some((p, i) => p.x !== proposed[i].x || p.z !== proposed[i].z);
  return { positions, fraction, intervened: fraction < 1 || boundaryLimited, boundaryLimited, minDistance, sweptMinDistance, initialOverlaps };
}
