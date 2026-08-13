import { sendJson } from '../http.js';
import { getRefreshTokenFromRequest, sha256hex, clearRefreshCookie } from '../sessions.js';

// Logout: revoke the whole family of the presented refresh token and clear
// the cookie. Idempotent — with no valid cookie it still answers 204 so the
// client can always clear its local session.
export default async function logout(ctx) {
  if (ctx.req.method !== 'POST') return sendJson(ctx, 405, { error: 'Method not allowed' });

  const raw = getRefreshTokenFromRequest(ctx.req);
  if (raw) {
    const [[row]] = await ctx.pool.query(
      'SELECT family_id FROM refresh_tokens WHERE token_hash = ?',
      [sha256hex(raw)],
    );
    if (row) {
      await ctx.pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE family_id = ?', [row.family_id]);
    }
  }

  clearRefreshCookie(ctx.res);
  ctx.res.writeHead(204);
  ctx.res.end();
}