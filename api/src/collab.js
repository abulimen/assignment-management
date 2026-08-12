// HTTP bridge to the Node collaboration server's internal API. Mirrors
// src/collab_client.php: shared secret header over loopback, returns
// {ok, status, body, error}.
export async function collabRequest(config, method, path, body) {
  try {
    const headers = { 'X-Internal-Secret': config.internalSecret };
    if (body !== undefined && body !== null) headers['Content-Type'] = 'application/json';
    const res = await fetch(config.collabUrl + path, {
      method,
      headers,
      body: body !== undefined && body !== null ? JSON.stringify(body) : undefined,
    });
    let json = null;
    try { json = await res.json(); } catch { /* non-JSON */ }
    return { ok: res.status >= 200 && res.status < 300, status: res.status, body: json, error: null };
  } catch (e) {
    return { ok: false, status: 0, body: null, error: e.message || 'connection failed' };
  }
}