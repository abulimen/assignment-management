// JWT lives in the shared core now — one implementation for every service.
// Parity with the legacy PHP format is enforced by collab/tests/jwt.test.js.
export { signJwt, verifyJwt } from '@am/core';
