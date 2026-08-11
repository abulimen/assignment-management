-- Migration: store the merge-time base document on the group.
-- Playback uses it as the exact keyframe for replaying the leader's session;
-- groups merged before this migration fall back to deterministic recompute.
USE assignment_mgmt;

ALTER TABLE `groups`
  ADD COLUMN base_content LONGTEXT NULL AFTER merged_submission_id;
