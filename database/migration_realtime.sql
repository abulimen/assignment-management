-- Realtime group collaboration (Yjs + Hocuspocus).
-- Apply AFTER: schema.sql, migration_groups.sql, migration_merge.sql,
--              migration_steps.sql, migration_analytics.sql

-- Yjs document persistence (Hocuspocus Database extension).
-- One row per collaborative document ("group:<id>").
CREATE TABLE IF NOT EXISTS collab_documents (
  document_name VARCHAR(191) NOT NULL PRIMARY KEY,
  doc LONGBLOB NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Per-member contribution status. Source of truth for the submit gate.
-- status: not_started -> in_progress (server-observed first edit) -> done (self-marked).
-- Editing after marking done flips the member back to in_progress (server-side).
CREATE TABLE IF NOT EXISTS group_member_status (
  group_id INT UNSIGNED NOT NULL,
  student_id INT UNSIGNED NOT NULL,
  status ENUM('not_started','in_progress','done') NOT NULL DEFAULT 'not_started',
  done_at DATETIME NULL,
  done_doc_sha CHAR(64) NULL,            -- server-computed doc hash at mark-Done
  last_activity_at DATETIME NULL,        -- server-observed edits (throttled)
  PRIMARY KEY (group_id, student_id),
  CONSTRAINT fk_gms_group FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Server-anchored update attribution: who changed the shared doc, when, how much.
-- Written by the Hocuspocus server from the AUTHENTICATED connection — clients
-- never self-report attribution.
CREATE TABLE IF NOT EXISTS collab_attribution (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  group_id INT UNSIGNED NOT NULL,
  student_id INT UNSIGNED NOT NULL,
  update_seq INT UNSIGNED NOT NULL,      -- per-doc server sequence
  received_at DATETIME(3) NOT NULL,
  update_bytes INT UNSIGNED NOT NULL DEFAULT 0,
  INDEX idx_attr_group_time (group_id, received_at),
  INDEX idx_attr_student (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Sealed submission snapshot. Lecturer review binds to this forever,
-- never to the live document.
CREATE TABLE IF NOT EXISTS group_doc_snapshots (
  group_id INT UNSIGNED NOT NULL PRIMARY KEY,
  submission_id INT UNSIGNED NOT NULL,
  prosemirror_json LONGTEXT NOT NULL,
  html LONGTEXT NOT NULL,
  ydoc_state LONGBLOB NOT NULL,
  content_sha256 CHAR(64) NOT NULL,
  contributions JSON NOT NULL,           -- [{student_id, surviving_chars, share_pct}]
  frozen_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Freeze epoch: durable so freezes survive Node restarts (checked in onAuthenticate).
ALTER TABLE `groups` ADD COLUMN frozen_at DATETIME NULL;

-- Group submission record lives on the leader's submissions row:
ALTER TABLE submissions
  ADD COLUMN group_id INT UNSIGNED NULL,
  ADD COLUMN override_used TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN override_by INT UNSIGNED NULL,
  ADD COLUMN override_reason TEXT NULL,
  ADD COLUMN done_vector JSON NULL,
  ADD COLUMN non_done_members JSON NULL;
