CREATE DATABASE IF NOT EXISTS assignment_mgmt
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE assignment_mgmt;

CREATE TABLE users (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email       VARCHAR(255) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    name        VARCHAR(255) NOT NULL,
    role        ENUM('lecturer','student') NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE assignments (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    lecturer_id INT UNSIGNED NOT NULL,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    rubric      JSON,
    due_date    DATETIME,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lecturer_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE submissions (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    assignment_id   INT UNSIGNED NOT NULL,
    student_id      INT UNSIGNED NOT NULL,
    content         LONGTEXT,
    status          ENUM('draft','submitted','graded') DEFAULT 'draft',
    submitted_at    DATETIME,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (assignment_id, student_id),
    FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE events (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    submission_id   INT UNSIGNED NOT NULL,
    type            VARCHAR(32) NOT NULL,
    data            JSON NOT NULL,
    occurred_at     DECIMAL(14,4) NOT NULL,
    sequence        INT UNSIGNED NOT NULL,
    FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
    INDEX idx_sub_time (submission_id, occurred_at),
    INDEX idx_sub_type (submission_id, type)
) ENGINE=InnoDB;

CREATE TABLE submission_stats (
    submission_id   INT UNSIGNED PRIMARY KEY,
    total_time_ms   BIGINT UNSIGNED DEFAULT 0,
    keystroke_count INT UNSIGNED DEFAULT 0,
    paste_count     INT UNSIGNED DEFAULT 0,
    delete_count    INT UNSIGNED DEFAULT 0,
    cursor_jumps    INT UNSIGNED DEFAULT 0,
    avg_wpm         DECIMAL(5,1) DEFAULT 0,
    paste_ratio     DECIMAL(5,4) DEFAULT 0,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
) ENGINE=InnoDB;