-- Migration: remove the merge keyframe column.
-- Group playback was replaced by the annotated merged-document view, so the
-- stored base document is no longer needed.
USE assignment_mgmt;

ALTER TABLE `groups`
  DROP COLUMN base_content;
