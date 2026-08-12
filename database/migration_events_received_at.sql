-- Realtime event tracking: server-authoritative receive time.
-- occurred_at stays client-reported (needed for cadence analysis); the
-- analyzer cross-checks it against received_at for tamper evidence.
ALTER TABLE events ADD COLUMN received_at DATETIME(3) NULL AFTER occurred_at;
