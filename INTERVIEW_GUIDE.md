# Technical Interview Preparation Guide: Draftly

This guide prepares you to defend Draftly in high-stakes technical interviews. It contains real questions derived directly from the codebase, explaining what the interviewer is evaluating, the exact source files involved, the core concepts required, and the honest, technically precise answer you should provide.

## Part 1: Core Technical Questions by Topic

### 1. Architecture and Concurrency

#### Question: Why did you split Draftly into three separate Node services instead of building a single monolith?
* Interviewer Evaluation: Understanding of process isolation, event loop blocking, stateful WebSocket vs stateless HTTP characteristics, and horizontal scaling.
* Source Files: `api/src/index.js`, `collab/src/server.js`, `analyzer-node/src/server.js`.
* Key Concepts: Event loop starvation, stateful memory persistence, failure domains.
* Honest Answer: Realtime collaborative synchronization (Hocuspocus) involves stateful, long-lived WebSocket connections, binary CRDT updates, and in-memory document state. REST API endpoints involve short-lived, stateless request-response cycles. Keeping them in the same Node process risks WebSocket binary decoding or CPU-intensive AST parsing starving the event loop for HTTP REST requests. By separating them into distinct services on ports 8001, 8002, and 8003, each service can crash, restart, or scale independently without taking down the entire platform.
* Limitation to Acknowledge: Inter-service communication requires loopback HTTP requests and shared secret management, which adds deployment coordination overhead.

#### Question: What happens if two students edit the exact same paragraph at the exact same millisecond?
* Interviewer Evaluation: Understanding of CRDT convergence, Yjs Lamport timestamps, and character-level interleaving.
* Source Files: `src/extensions/Section.js`, `collab/src/server.js`, `collab/tests/sections.test.js`.
* Key Concepts: Conflict-free Replicated Data Types, Lamport clocks, client IDs, convergence.
* Honest Answer: Yjs represents text as a doubly linked list of Item structures. Each item has an ID consisting of a unique client identifier and an integer clock (Lamport timestamp). When two concurrent insertions occur at the same position, Yjs uses a deterministic tie-breaking algorithm comparing client IDs to order the items identically on all participating clients without any server-side coordination. Neither edit is lost or overwritten; both characters are preserved in deterministic order across all connected browsers.

---

### 2. Submission Sealing, Transactions, and Rollback

#### Question: Walk me through what happens when a group leader clicks Submit. How do you prevent race conditions and data corruption?
* Interviewer Evaluation: Transaction safety, distributed state consistency, two-phase sealing, error recovery.
* Source Files: `api/src/routes/groupSubmit.js`, `collab/src/internal.js`, `api/tests/group-workflow.test.js`.
* Key Concepts: Two-phase commit, idempotent sealing, draft row rollback.
* Honest Answer:
  1. Authorization & Gate Check: The API verifies the caller is the authenticated group leader and checks member completion status (`group_member_status`). If any member is not done, the submission requires a mandatory `override_reason`.
  2. Draft Row Creation: The API inserts a draft submission row into the `submissions` table to obtain a unique submission ID.
  3. Internal Seal Call: The API issues an authenticated HTTP POST request to the internal collab service (`/internal/doc/:groupId/seal`) with the submission ID and the `X-Internal-Secret` header.
  4. Snapshot Creation: The collab service drains in-flight updates, exports canonical ProseMirror JSON and HTML ASTs, computes a SHA-256 checksum, calculates surviving character counts per member, inserts the record into `group_doc_snapshots`, updates `groups.frozen_at`, and sets `connection.readOnly = true` on all active WebSocket clients.
  5. Rollback on Failure: If the collab server is unreachable or fails to seal the snapshot, the API catches the error, deletes the draft submission row from the database, and returns HTTP 503 so no orphaned or inconsistent state remains.
  6. Finalization: Upon receiving a successful seal response, the API updates the submission row status to `submitted` with the frozen content, logs the completion vectors, and updates `groups.merged_submission_id`.

#### Question: What prevents a malicious student from continuing to send WebSocket edits after the group has submitted?
* Interviewer Evaluation: Server-authoritative enforcement vs client-side UI disabling.
* Source Files: `collab/src/internal.js` (lines 72-74), `collab/src/server.js` (`onAuthenticate`), `collab/tests/seal.test.js`.
* Key Concepts: Durable epoch, socket connection downgrade, database authorization.
* Honest Answer: Protection is enforced at two levels on the server. First, when sealing occurs, the collaboration server iterates over all active socket connections in that document room and sets `connection.readOnly = true`, which causes Hocuspocus to ignore any incoming client updates. Second, if a client disconnects and attempts to reconnect, the `onAuthenticate` hook queries `groups.frozen_at` in MySQL; if the group is frozen, the connection is granted exclusively with read-only permissions, rejecting any write frames.

---

### 3. Originality Scoring and Anti-Spoofing

#### Question: How does Draftly prevent a student from scripting automated keystrokes to simulate natural writing?
* Interviewer Evaluation: Telemetry analysis, time synchronization, anti-tampering verification.
* Source Files: `collab/src/tracking.js`, `analyzer-node/src/engine.js`, `api/tests/events.test.js`.
* Key Concepts: Server receive timestamps (`received_at`), typing cadence distribution, burst analysis.
* Honest Answer: Client-side event tracking records the client timestamp (`occurred_at`). When event batches arrive over the tracking WebSocket, the server immediately stamps each event with its own system clock timestamp (`received_at`). The analyzer engine calculates the delta between client intervals and server arrival intervals. If a student attempts to dump scripted events in bulk, the client timestamps might claim realistic intervals, but the server receive intervals will reveal an instantaneous bulk injection, triggering recording integrity risk flags. Furthermore, the typing naturalness factor evaluates the coefficient of variation in inter-keystroke intervals; robotic, perfectly uniform intervals produce low scores.

#### Question: What are the limits of Draftly regarding AI detection and cheating claims?
* Interviewer Evaluation: Intellectual honesty, realistic understanding of software capabilities, avoiding marketing hyperbole.
* Source Files: `README.md`, `KNOWN_LIMITATIONS.md`, `analyzer-node/src/engine.js`.
* Key Concepts: Contextual telemetry vs automated proof.
* Honest Answer: Draftly does NOT prove human authorship, and it does NOT prove that a student did not use generative AI. If a student uses an external AI model on a separate phone and manually retypes the text into Draftly, the system will record standard typing keystrokes. Draftly provides transparent process telemetry (such as writing speed, pause frequency, pasted text blocks, and revision timeline) to give educators context. The final evaluative decision always rests with the human lecturer.

---

### 4. Database Design and SQL Optimization

#### Question: Why did you choose raw SQL prepared queries with `mysql2` over an ORM like Prisma or TypeORM?
* Interviewer Evaluation: Understanding of database query execution, connection pooling, transaction boundaries, and abstraction overhead.
* Source Files: `shared/core/src/index.js`, `api/src/routes/groupSubmit.js`, `api/src/routes/submission.js`.
* Key Concepts: Connection pooling, parameterized queries, execution plan clarity.
* Honest Answer: Draftly requires fine-grained control over transactional workflows (such as inserting draft rows, calling internal services, and executing conditional rollbacks) and complex multi-table joins across courses, enrollments, groups, and member completion status. Using `mysql2/promise` with parameterized queries guarantees zero ORM overhead, eliminates connection leak ambiguities, ensures every SQL statement is explicit and indexable, and prevents SQL injection vulnerabilities through prepared statement parameters.

---

## Part 2: Codebase Defense Map (12 Critical Locations)

Master these 12 files and functions before your interview:

1. File: `collab/src/server.js`
   * Function: `createCollabServer` and `onAuthenticate`
   * Purpose: Validates student JWTs, verifies group membership against MySQL, rejects non-members, and enforces read-only mode for frozen documents.
   * Tough Question: How do you prevent a student from joining another group's document room?

2. File: `collab/src/internal.js`
   * Function: `sealDocument`
   * Purpose: Implements two-phase document freezing, ProseMirror JSON/HTML export, SHA-256 checksumming, surviving text calculation, and socket downgrade.
   * Tough Question: What happens if two seal requests for the same group arrive simultaneously?

3. File: `collab/src/export.js`
   * Function: `survivingCharsByAuthor`
   * Purpose: Recursively traverses the ProseMirror JSON AST, inspecting text node `author` marks, and tallies surviving character counts per member.
   * Tough Question: Why count surviving characters in the final document instead of total keystrokes typed during the session?

4. File: `collab/src/tracking.js`
   * Function: `createTrackingServer`
   * Purpose: Handles the realtime event intake WebSocket, authenticates socket tokens, stamps `received_at` with server clock, and updates `submission_stats`.
   * Tough Question: How does this prevent a student from submitting events for an assignment that has already been submitted?

5. File: `api/src/routes/groupSubmit.js`
   * Function: `groupSubmit`
   * Purpose: Executes the leader submission gate check (all members Done or mandatory override reason), creates draft row, coordinates with collab seal, and performs rollback on failure.
   * Tough Question: If the collab server crashes midway through sealing, how is the database returned to a clean state?

6. File: `api/src/routes/submission.js`
   * Function: `submission`
   * Purpose: Handles individual submission drafts, updates, submissions, word count recalculation, and immutability guards.
   * Tough Question: How do you prevent a student from editing an individual submission after it has been submitted?

7. File: `analyzer-node/src/engine.js`
   * Function: `analyzeOriginality`
   * Purpose: Pure mathematical scoring engine computing continuous curves across 5 weighted factors with zero veto caps.
   * Tough Question: Why are veto caps avoided in your scoring algorithm?

8. File: `analyzer-node/src/explain.js`
   * Function: `generateExplanations`
   * Purpose: Converts mathematical factor scores and risk flags into human-readable evidence summaries for lecturers.
   * Tough Question: How do you ensure explanations remain neutral and evidence-based rather than accusatory?

9. File: `shared/core/src/index.js`
   * Function: `createPool`, `signJwt`, `verifyJwt`
   * Purpose: Shared core package providing database connection pooling and timing-safe JWT signing and verification.
   * Tough Question: Why is timing-safe comparison important for JWT verification?

10. File: `collab/tests/helpers/testenv.js`
    * Function: `ensureTestDb` and `seedGroup`
    * Purpose: Automated test database bootstrap harness ensuring `assignment_mgmt_test` is created and migrated before tests execute.
    * Tough Question: How do the integration tests run deterministically in a clean environment without pre-existing state?

11. File: `src/extensions/AuthorOverride.js`
    * Function: ProseMirror Plugin state and filterTransaction
    * Purpose: Ensures typing in the collaborative editor stamps the active user's author mark while preserving remote marks synced from peers.
    * Tough Question: How do you prevent local typing from overwriting the authorship mark of adjacent text written by a teammate?

12. File: `src/hooks/useTracker.js`
    * Function: `useTracker`
    * Purpose: Captures keystrokes, pauses, and paste events in the React frontend, streaming over WebSocket with HTTP fallback.
    * Tough Question: How does the tracker buffer events to prevent overwhelming the network while preserving low latency?
