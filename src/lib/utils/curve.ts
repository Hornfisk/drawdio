/**
 * Monotonic cubic (Fritsch–Carlson) and straight-line path builders for
 * the curve editor + the waveform/spectrum 'custom' style.
 *
 * Why monotonic cubic: a naive Catmull-Rom spline overshoots when adjacent
 * points have steep slope differences — the curve dips outside the bounding
 * box of its control points. Fritsch-Carlson preserves monotonicity in each
 * segment: the curve never goes below/above the lower/upper of two adjacent
 * Y values, and is flat (tangent = 0) at local extrema. This matches the
 * behaviour users expect from DAW automation curves and EQ envelopes.
 */

/** Build an SVG `d` string from normalized [x1, y1, x2, y2, ...] points (each 0..1). */
export function buildCurvePath(
  pts: number[],
  scaleX: number,
  scaleY: number,
  smooth: boolean,
): string {
  if (pts.length < 4) return '';
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < pts.length; i += 2) {
    xs.push(pts[i] * scaleX);
    ys.push(pts[i + 1] * scaleY);
  }
  return smooth ? monotonicCubicPath(xs, ys) : straightPath(xs, ys);
}

function straightPath(xs: number[], ys: number[]): string {
  let d = `M ${xs[0].toFixed(3)} ${ys[0].toFixed(3)}`;
  for (let i = 1; i < xs.length; i++) {
    d += ` L ${xs[i].toFixed(3)} ${ys[i].toFixed(3)}`;
  }
  return d;
}

/**
 * Fritsch-Carlson monotonic cubic Hermite interpolation, expressed as cubic
 * Bezier segments (one per pair of points) so SVG `path` can render it directly.
 *
 * Steps:
 *  1. Slopes m_k = Δy / Δx between consecutive points.
 *  2. Initial tangents t_k at interior points via Hyman's weighted formula.
 *     At endpoints, just use the adjacent slope.
 *  3. Where adjacent slopes disagree in sign (or one is zero), set t_k = 0
 *     so the curve has a horizontal tangent at the extremum — no overshoot.
 *  4. Apply the Fritsch-Carlson constraint: scale tangents so the resulting
 *     Hermite curve cannot escape the [min(y_k, y_{k+1}), max(...)] band.
 *  5. Convert each Hermite segment to a cubic Bezier with control points at
 *     ±(Δx/3) along the tangent direction.
 */
function monotonicCubicPath(xs: number[], ys: number[]): string {
  const n = xs.length;
  if (n < 2) return '';
  if (n === 2) return straightPath(xs, ys);

  // 1. segment slopes
  const m: number[] = new Array(n - 1);
  for (let k = 0; k < n - 1; k++) {
    const dx = xs[k + 1] - xs[k];
    m[k] = dx === 0 ? 0 : (ys[k + 1] - ys[k]) / dx;
  }

  // 2-3. point tangents
  const t: number[] = new Array(n);
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let k = 1; k < n - 1; k++) {
    if (m[k - 1] * m[k] <= 0) {
      t[k] = 0;
    } else {
      const dx1 = xs[k] - xs[k - 1];
      const dx2 = xs[k + 1] - xs[k];
      const common = dx1 + dx2;
      // Hyman's harmonic-mean tangent
      t[k] = (3 * common) / ((common + dx2) / m[k - 1] + (common + dx1) / m[k]);
    }
  }

  // 4. Fritsch-Carlson tangent limiter — per segment
  for (let k = 0; k < n - 1; k++) {
    if (m[k] === 0) {
      t[k] = 0;
      t[k + 1] = 0;
      continue;
    }
    const a = t[k] / m[k];
    const b = t[k + 1] / m[k];
    const s = a * a + b * b;
    if (s > 9) {
      const f = 3 / Math.sqrt(s);
      t[k] = f * a * m[k];
      t[k + 1] = f * b * m[k];
    }
  }

  // 5. Cubic Bezier segments
  let d = `M ${xs[0].toFixed(3)} ${ys[0].toFixed(3)}`;
  for (let k = 0; k < n - 1; k++) {
    const dx = (xs[k + 1] - xs[k]) / 3;
    const cp1x = xs[k] + dx;
    const cp1y = ys[k] + t[k] * dx;
    const cp2x = xs[k + 1] - dx;
    const cp2y = ys[k + 1] - t[k + 1] * dx;
    d += ` C ${cp1x.toFixed(3)} ${cp1y.toFixed(3)}, ${cp2x.toFixed(3)} ${cp2y.toFixed(3)}, ${xs[k + 1].toFixed(3)} ${ys[k + 1].toFixed(3)}`;
  }
  return d;
}
