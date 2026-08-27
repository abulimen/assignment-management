# Security Policy and Trust Model

## Overview

Draftly is a multi-service web platform consisting of a React single page application, a Node REST API, a Node realtime collaboration service, a Node analyzer engine, and a MySQL database. This document describes the security model, trust boundaries, vulnerability management, and production configuration requirements.

## Trust Boundaries and Architecture

1. Client to API (Port 8001):
   * Authenticated via JSON Web Tokens (HS256 signature).
   * Supports Bearer tokens in Authorization headers as well as HttpOnly SameSite cookies.
   * Role based access control enforces strict separation between student and lecturer capabilities.
   * Row level access control verifies that students can only access submissions and groups they belong to, while lecturers can only access assignments within courses they own.

2. Client to Collaboration Server (WebSocket Port 8003 and Tracking Port 8005):
   * WebSocket connections require a valid JWT passed during the connection handshake.
   * The collaboration server validates group membership in MySQL before binding the client to a shared document room.
   * When a group submission is sealed, the server dynamically downgrades all active socket connections to read-only mode, rejecting subsequent write updates.
   * Tracking event intake (Port 8005) stamps every incoming event batch with the server clock (`received_at`), preventing clients from retroactively falsifying event timing.

3. Internal Service Communication (Port 8004):
   * The API service triggers document state verification and document sealing over loopback HTTP requests to the collaboration service.
   * All internal endpoints (`/internal/doc/:id/state`, `/internal/doc/:id/seal`) require a shared secret header (`X-Internal-Secret`).
   * Requests lacking the correct internal secret are rejected with HTTP 401.

4. Database Access:
   * All database queries utilize parameterized prepared statements via `mysql2` to prevent SQL injection.
   * Passwords are encrypted using bcrypt with salt rounds configured to 10.

## Dependency Security Audit

Current dependency audit status:

* `nanoid` (GHSA-2v37-7h3g-55p8): Resolved. Patched to version 3.3.18.
* `react-router` and `react-router-dom`: Patched to version 6.30.6.
* `esbuild` and `vite` (GHSA-67mh-4wv8-2f99):
  * Scope: Affects local development dev-server host checking during active Vite dev sessions.
  * Impact: Does not affect production deployments because production builds compile to static assets (`public/assets/`) served directly by the Node API server without the Vite dev-server running.
  * Remediation: Vite 8 upgrade will be performed during the next major framework modernization cycle.

## Production Hardening Requirements

For any deployment beyond a single machine loopback environment:

1. Secrets Management:
   * `JWT_SECRET`: Must be configured to a cryptographically secure 256-bit random string (`openssl rand -hex 32`).
   * `INTERNAL_API_SECRET`: Must be configured to a high-entropy random string (`openssl rand -hex 16`).
   * Never deploy with the default development placeholders.

2. Network Isolation:
   * Internal ports (8002 for Analyzer, 8004 for Collab Internal HTTP) should only be bound to localhost (127.0.0.1) or placed within a private VPC network.
   * The database port (3306) should not be exposed to the public internet.

3. Transport Layer Security:
   * Run behind a reverse proxy (such as Nginx or Caddy) with TLS/HTTPS termination.
   * Set `NODE_ENV=production` to enforce Secure attributes on authentication cookies.
