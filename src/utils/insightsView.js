// Pure transforms feeding the review insight visualizations.

// Rows for recharts stacked bars: one row per hour (label "HH:00") or per
// day (label "YYYY-MM-DD"), keyed by member name for stacking.
export function buildActivityRows(insights, members, mode = 'hourly') {
  if (mode === 'hourly') {
    return Array.from({ length: 24 }, (_, h) => {
      const row = { label: `${String(h).padStart(2, '0')}:00` };
      for (const m of members || []) {
        const hourly = insights?.[String(m.student_id)]?.activity?.hourly;
        row[m.student_name] = hourly?.[h]?.n ?? 0;
      }
      return row;
    });
  }

  // Daily: union of all members' days, chronological.
  const days = new Set();
  for (const m of members || []) {
    for (const d of insights?.[String(m.student_id)]?.activity?.daily || []) days.add(d.d);
  }
  return [...days].sort().map((label) => {
    const row = { label };
    for (const m of members || []) {
      const daily = insights?.[String(m.student_id)]?.activity?.daily || [];
      const hit = daily.find((d) => d.d === label);
      row[m.student_name] = hit?.n ?? 0;
    }
    return row;
  });
}

// Copied-text viewer filters.
export function filterPastes(pastes, { hideLinkOnly = false, survival = null } = {}) {
  return (pastes || []).filter((p) => {
    if (hideLinkOnly && p.link_only) return false;
    if (survival === 'survived' && !p.survived) return false;
    if (survival === 'rewritten' && p.survived) return false;
    return true;
  });
}

// Members × 24h heatmap matrix.
export function heatmapMatrix(insights, members) {
  const list = members || [];
  const cells = list.map((m) => {
    const hourly = insights?.[String(m.student_id)]?.activity?.hourly || [];
    return Array.from({ length: 24 }, (_, h) => hourly?.[h]?.n ?? 0);
  });
  const max = cells.flat().reduce((a, b) => Math.max(a, b), 0);
  return { members: list.map((m) => m.student_name), cells, max };
}

// Chart colors: the author palette with enough opacity to read in bars/cells.
const PALETTE = [
  'oklch(0.55 0.19 255)', 'oklch(0.6 0.17 150)', 'oklch(0.55 0.19 300)',
  'oklch(0.62 0.16 55)', 'oklch(0.58 0.19 350)', 'oklch(0.6 0.14 230)',
  'oklch(0.62 0.15 90)', 'oklch(0.6 0.12 180)',
];

export function memberColor(index) {
  return PALETTE[index % PALETTE.length];
}
