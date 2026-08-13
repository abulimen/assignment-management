// In-memory session store — the ONLY home of the access token in the SPA.
//
// The token never touches localStorage/sessionStorage, so an XSS that reads
// storage cannot exfiltrate it; only JS heap memory holds it. Every consumer
// (api.js, collabConfig.js, AuthContext, useTracker) imports the getter/setter
// from here instead of reading storage themselves.
let accessToken = null;

export function setAccessToken(token) {
  accessToken = token || null;
}

export function getAccessToken() {
  return accessToken;
}

export function clearAccessToken() {
  accessToken = null;
}