// Draw order for isometric props.
//
// Painter's algorithm alone breaks as soon as a prop is taller than a tile, so
// this builds the "must be drawn before" relation and sorts it topologically.
// A prop A is behind B when A finishes before B starts on either ground axis,
// or when the two footprints overlap and A sits lower in the stack.

function behind(a, b) {
  if (a.x + a.w <= b.x) return true;
  if (a.y + a.d <= b.y) return true;
  if (a.x + a.w <= b.x || a.y + a.d <= b.y) return true;

  const overlapX = a.x < b.x + b.w && b.x < a.x + a.w;
  const overlapY = a.y < b.y + b.d && b.y < a.y + a.d;
  if (overlapX && overlapY && (a.z ?? 0) + (a.h ?? 0) <= (b.z ?? 0)) return true;
  return false;
}

export function orderProps(props) {
  const n = props.length;
  const edges = Array.from({ length: n }, () => new Set());
  const indegree = new Array(n).fill(0);

  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < n; j += 1) {
      if (i === j) continue;
      if (behind(props[i], props[j]) && !behind(props[j], props[i])) {
        if (!edges[i].has(j)) {
          edges[i].add(j);
          indegree[j] += 1;
        }
      }
    }
  }

  // Deterministic tie-break: back to front, then low to high, then by id.
  const key = (p) => [(p.x ?? 0) + (p.y ?? 0), p.z ?? 0, p.id ?? 0];
  const ready = [];
  for (let i = 0; i < n; i += 1) if (indegree[i] === 0) ready.push(i);

  const out = [];
  while (ready.length) {
    ready.sort((i, j) => {
      const a = key(props[i]);
      const b = key(props[j]);
      return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
    });
    const i = ready.shift();
    out.push(props[i]);
    for (const j of edges[i]) {
      indegree[j] -= 1;
      if (indegree[j] === 0) ready.push(j);
    }
  }

  // A cycle should be impossible for axis-aligned footprints, but never drop props.
  if (out.length !== n) {
    const seen = new Set(out);
    const rest = props.filter((p) => !seen.has(p));
    rest.sort((a, b) => {
      const ka = key(a);
      const kb = key(b);
      return ka[0] - kb[0] || ka[1] - kb[1] || ka[2] - kb[2];
    });
    return out.concat(rest);
  }

  return out;
}

export function violatesOrder(order) {
  for (let i = 0; i < order.length; i += 1) {
    for (let j = i + 1; j < order.length; j += 1) {
      if (behind(order[j], order[i]) && !behind(order[i], order[j])) {
        return { earlier: i, later: j };
      }
    }
  }
  return null;
}
