# Architecture Decision Records (ADRs)

This document records the major technical decisions made during the design and implementation of Draftly, explaining the rationale, alternatives considered, trade-offs, and current limitations for each choice.

## 1. Collaborative Editing Architecture: Yjs CRDTs over WebSocket via Hocuspocus

* Problem: Multiple students need to edit the same structured assignment document concurrently with real-time cursor visibility, offline tolerance, and automatic conflict resolution.
* Decision: Adopted Yjs (a high-performance Conflict-free Replicated Data Type framework) combined with Hocuspocus as the authoritative WebSocket collaboration backend.
* Why: CRDTs provide mathematical convergence guarantees across concurrent edits without requiring a centralized operational transform sequencer. Every edit is commutative and associative.
* Alternative Considered: Operational Transformation (such as ShareDB). Rejected because OT requires every single operation to pass through a strictly ordered central server transform loop, making recovery from network blips more fragile.
* Trade-off: Yjs maintains document metadata and deletion markers (tombstones) in memory, which increases memory usage for very long documents.
* Current Limitation: Hocuspocus currently keeps active room states in process memory on a single server node. Multi-server clustering will require Redis pub/sub room coordination.

## 2. Service Separation: Dedicated Collaboration and Analyzer Services

* Problem: Real-time collaborative synchronization involves persistent, long-lived WebSocket connections and frequent binary update broadcasts, whereas REST API calls are short-lived, stateless HTTP request-response cycles.
* Decision: Isolated real-time document sync and event intake into a dedicated collaboration service (collab, ports 8003, 8004, 8005) and isolated scoring into an analyzer service (analyzer-node, port 8002).
* Why: Prevents heavy WebSocket traffic or CPU-intensive AST parsing from blocking the main Node HTTP event loop. Allows independent restarts and scaling.
* Alternative Considered: A single monolithic Node process handling REST endpoints, WebSocket connections, and scoring algorithms together.
* Trade-off: Requires inter-service loopback HTTP communication and shared secret authentication (X-Internal-Secret) for state verification and document sealing.
* Current Limitation: Multiple services must be started and supervised during deployment.

## 3. Server-Authoritative Submission Sealing and Surviving Text Attribution

* Problem: Group assignments require fair credit attribution and tamper-proof submission records. Client-reported character counts can be manipulated, and naive keystroke counting rewards unedited pasting.
* Decision: Submission is executed as a server-side two-phase sealing event. When the group leader submits, the API calls the internal collaboration endpoint to freeze the Yjs document, export an immutable ProseMirror AST and HTML snapshot to the database, generate a SHA-256 content checksum, and compute surviving character counts per author from the final surviving text tree.
* Why: Measuring surviving text credits students for the words that actually remain in the submitted work, rather than raw character counts that reward typing and immediately deleting large blocks. Server-side sealing prevents any client tampering.
* Alternative Considered: Trusting client-computed word counts, or using basic Git line-level diffs.
* Trade-off: Requires server-side ProseMirror AST parsing and JSON conversion on every seal operation.
* Current Limitation: Surviving text counts do not quantify qualitative contributions such as structural planning, proofreading, or deleting unhelpful text.

## 4. Database Engine: MySQL 8 with Parameterized Prepared Statements

* Problem: The platform manages complex relational relationships: courses, enrollments, assignments, groups, member completion vectors, submissions, snapshots, and activity logs.
* Decision: Selected MySQL 8 (InnoDB engine, utf8mb4 collation) using raw parameterized queries via mysql2/promise connection pools.
* Why: Provides ACID transactions, explicit query control, high throughput, and zero ORM abstraction overhead. Critical transactions (such as rolling back draft submission rows if collab sealing fails) are transparently managed in SQL.
* Alternative Considered: Object-Relational Mappers (such as Prisma or TypeORM). Rejected to avoid opaque query generation, connection pool leaks, and ORM startup latency.
* Trade-off: Database migrations must be managed sequentially through explicit SQL scripts rather than automated schema synchronization.
* Current Limitation: Migrations must be run in exact order during setup.

## 5. Originality Scoring Engine: Continuous Scoring v2 with Zero Veto Caps

* Problem: Traditional plagiarism and originality systems rely on rigid threshold rules or veto caps (for example, failing a paper or capping originality at 40 if a paste is detected), penalizing students who paste legitimate citations or bibliographies.
* Decision: Implemented continuous mathematical curves across five weighted factors (paste integrity, typing naturalness, revision behavior, engagement consistency, and recording integrity) that sum to 100.
* Why: Produces explainable, fair, and continuous scores. Pasting text reduces the paste factor score proportionally based on paste volume without artificially zeroing out other positive writing signals.
* Alternative Considered: Step-function heuristics and rule-based veto caps.
* Trade-off: Requires calibration of sigmoid curves and factor weights.
* Current Limitation: The engine analyzes process telemetry (speed, pauses, bursts, edits); it does not perform semantic analysis of academic quality.

## 6. Telemetry Recording Integrity: Server-Stamped WebSocket Intake

* Problem: If activity timestamps are recorded exclusively on the client, a bad actor could forge past timestamps or script rapid typing to simulate natural cadence.
* Decision: The event tracking WebSocket intake server stamps every incoming event batch with the server system clock (received_at) upon frame arrival.
* Why: Allows the analyzer to compare client reported timestamps (occurred_at) against authoritative server arrival intervals (received_at), detecting anomalies, time manipulation, and bulk event injections.
* Alternative Considered: Relying solely on client clock timestamps.
* Trade-off: Network latency variations can introduce small deviations between client and server timestamps; the analyzer includes variance tolerance windows to prevent false flags.
* Current Limitation: Offline writing cannot benefit from server receive-time verification.

## 7. Editor Interface: Word-Styled Rich Text Workspace

* Problem: University students and lecturers are accustomed to standard word processor interfaces with ribbons, toolbars, fonts, and table support, rather than raw Markdown syntax.
* Decision: Designed a Microsoft Word styled interface using TipTap 2.6 and ProseMirror with custom extensions for section management, author attribution marks, and paste highlighting.
* Why: Eliminates the learning curve for non-technical students, supports formal academic formatting standards, and maps cleanly to ProseMirror JSON ASTs.
* Alternative Considered: Plain Markdown or block-based editors.
* Trade-off: Managing rich formatting (tables, typography, colors) across collaborative Yjs marks requires custom TipTap schema extensions.
* Current Limitation: Highly intricate desktop word processing features (such as multi-column layouts or complex mathematical equation rendering) are currently simplified.
