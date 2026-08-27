# Known Limitations

This document provides a realistic assessment of the current technical boundaries, architectural constraints, and operational limitations of Draftly.

## 1. Authorship and Generative AI Boundaries

* Contextual Evidence vs Conclusive Proof: Draftly records process telemetry (typing cadence, burst patterns, pause distributions, paste volumes, and document revisions) to provide educators with rich context on how work developed. It does NOT prove human authorship or prove non-use of generative AI.
* Manual Copying Vulnerability: If a student uses an external AI tool on a secondary device and manually types the generated sentences word for word into Draftly, the system will record standard typing keystrokes. While typing rhythm may exhibit subtle differences from spontaneous composition, process data alone cannot definitively distinguish manual retyping from original thought.
* Human Decision Requirement: The system is deliberately designed as an analytical aid for lecturers. It does not issue automated academic dishonesty penalties.

## 2. Realtime Collaboration and Infrastructure Scaling

* Single Node Architecture: Hocuspocus manages active Yjs document rooms in memory on a single Node process. While documents are durably persisted to MySQL upon client disconnect and during submission sealing, active editing sessions are pinned to the single running server instance.
* Horizontal Scaling Constraint: Supporting multiple collaboration server nodes across a load balancer will require integrating a Redis pub/sub backplane to broadcast Yjs CRDT updates across server instances.
* Connection Capacity: The single node architecture is optimized for typical classroom cohorts (hundreds of concurrent students) rather than massive multi-tenant scale (tens of thousands of simultaneous socket connections).

## 3. Offline Mode and Network Resilience

* Online Primary Requirement: Realtime collaborative group editing and server-authoritative event streaming require an active WebSocket connection.
* Offline Limitations: The Progressive Web App service worker caches core UI assets for rapid loading, but offline edits do not benefit from server receive-time verification until reconnecting and synchronizing.

## 4. Attribution Metric Scope

* Surviving Text Quantification: Group member contribution is calculated by traversing the final ProseMirror document AST and measuring the surviving character count attributed to each member.
* Qualitative Omissions: Surviving character math measures final output volume. It does not measure non-textual or qualitative contributions, such as research, verbal brainstorming, structural restructuring, or editing that involved deleting unneeded sections.

## 5. Plagiarism Source Comparison

* Local Paste Inventory: Draftly detects, timestamps, and displays every text block pasted into the editor during writing sessions.
* External Web Indexing: Draftly does not currently query commercial web crawl databases (such as Turnitin or Crossref) to automatically identify the external web page from which a pasted passage originated.

## 6. Development and Test Prerequisites

* Database Requirement: Running backend unit and integration test suites requires a running MySQL 8 database instance on the local or CI host.
* Email Provider Configuration: In local development without a configured Resend API key, authentication verification links are emitted to local application logs rather than delivered over external SMTP.
