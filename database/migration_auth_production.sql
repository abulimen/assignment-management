-- Production auth hardening: email verification + rotating refresh tokens
-- + password-reset tokens.
-- Idempotent so it can be applied to both a fresh schema.sql build and an
-- existing dev database (checks whether users.email_verified already exists).
USE assignment_mgmt;

-- Email verification flag. MySQL 8 has no ALTER TABLE ... ADD COLUMN IF NOT
-- EXISTS, so gate on information_schema to stay re-runnable.
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'email_verified'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 0',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Rotating refresh-token store.
-- The raw token is opaque (32 random bytes) and NEVER persisted; only its
-- SHA-256 hex hash is stored. Every rotation keeps the same family_id so a
-- replayed (already-used) token can revoke the whole session family.
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     INT UNSIGNED NOT NULL,
    family_id   CHAR(36) NOT NULL,
    token_hash  CHAR(64) NOT NULL UNIQUE,
    expires_at  DATETIME NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at     DATETIME NULL,
    revoked_at  DATETIME NULL,
    INDEX idx_user (user_id),
    INDEX idx_family (family_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Email verification tokens (24h). token_hash = SHA-256 of the raw token.
CREATE TABLE IF NOT EXISTS email_verifications (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     INT UNSIGNED NOT NULL,
    token_hash  CHAR(64) NOT NULL UNIQUE,
    expires_at  DATETIME NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at     DATETIME NULL,
    INDEX idx_user (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Password-reset tokens (1h). token_hash = SHA-256 of the raw token.
CREATE TABLE IF NOT EXISTS password_resets (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     INT UNSIGNED NOT NULL,
    token_hash  CHAR(64) NOT NULL UNIQUE,
    expires_at  DATETIME NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at     DATETIME NULL,
    INDEX idx_user (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;