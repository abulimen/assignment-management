// Ported from src/authorship.php: externally-pasted text extraction for the
// red "copied" overlay. `data` from the JSON column arrives pre-parsed.

export function filterPastedTexts(pasteEvents) {
  const out = [];
  for (const ev of pasteEvents) {
    const d = typeof ev === 'string' ? safeParse(ev) : ev;
    if (d && d.external_paste && d.pasted_text && String(d.pasted_text).length >= 25) {
      out.push(d.pasted_text);
    }
  }
  return out;
}

export async function sectionPastedTexts(pool, submissionId) {
  const [rows] = await pool.query(
    "SELECT data FROM events WHERE submission_id = ? AND type = 'paste'",
    [submissionId],
  );
  return filterPastedTexts(rows.map((r) => r.data));
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}