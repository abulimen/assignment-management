-- Migration: add steps_json column to events table for ProseMirror step replay
USE assignment_mgmt;

ALTER TABLE events
  ADD COLUMN steps_json LONGTEXT NULL AFTER data,
  ADD COLUMN selection_from INT UNSIGNED NULL AFTER steps_json,
  ADD COLUMN selection_to INT UNSIGNED NULL AFTER selection_from;
