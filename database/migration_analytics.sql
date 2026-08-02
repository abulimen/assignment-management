-- Migration: add active_time_ms and word_count to submission_stats
USE assignment_mgmt;

ALTER TABLE submission_stats
  ADD COLUMN active_time_ms BIGINT UNSIGNED DEFAULT 0 AFTER total_time_ms,
  ADD COLUMN word_count INT UNSIGNED DEFAULT 0 AFTER paste_ratio;
