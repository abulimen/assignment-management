// Map collaborator awareness states to the section each remote user is in.
// Pure function so it is unit-testable without a live provider.

// Returns { [sectionId]: [{ name, color }, ...] }, remote users only,
// ordered by clientID for stable rendering. Stale cursors from lagging peers
// (positions outside the current doc) are dropped silently.
export function sectionPresenceFromStates(doc, states, localClientID) {
  const entries = [];
  for (const { clientID, state } of states || []) {
    if (clientID === localClientID) continue;
    if (!state || !state.user || !state.cursor) continue;
    const pos = state.cursor.anchor ?? state.cursor.head;
    if (pos == null || pos < 0 || pos > doc.content.size) continue;

    let sectionId = null;
    try {
      const $pos = doc.resolve(pos);
      for (let d = $pos.depth; d > 0; d--) {
        if ($pos.node(d).type.name === 'section') {
          sectionId = $pos.node(d).attrs.id;
          break;
        }
      }
    } catch {
      continue;
    }
    if (!sectionId) continue;
    entries.push({ clientID, sectionId, user: state.user });
  }

  entries.sort((a, b) => a.clientID - b.clientID);
  const bySection = {};
  for (const e of entries) {
    (bySection[e.sectionId] ||= []).push({ name: e.user.name, color: e.user.color });
  }
  return bySection;
}
