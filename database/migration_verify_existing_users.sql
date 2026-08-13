-- DEV BACKFILL: verify pre-existing accounts.
--
-- The email-verification gate (migration_auth_production.sql) added
-- users.email_verified DEFAULT 0, but accounts created before that feature
-- (all of them dev/test accounts — this app has no production users yet)
-- would otherwise be permanently locked out of login with 403 EMAIL_UNVERIFIED.
-- This one-shot marks them verified so local development and demos can sign in.
--
-- Run against the DEV database only:
--   mysql -u root assignment_mgmt < migration_verify_existing_users.sql
--
-- Do NOT treat this as a production policy: when real onboarding begins,
-- account re-verification / invite flows should be decided deliberately.
USE assignment_mgmt;

UPDATE users SET email_verified = 1 WHERE email_verified = 0;