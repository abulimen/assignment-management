-- Migration: store the merged group submission on the group
USE assignment_mgmt;

ALTER TABLE `groups`
  ADD COLUMN merged_submission_id INT UNSIGNED NULL AFTER invite_code;