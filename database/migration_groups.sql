-- Migration: group work support
USE assignment_mgmt;

-- Add group_work flag to assignments
ALTER TABLE assignments ADD COLUMN is_group_work TINYINT(1) DEFAULT 0;

-- Groups table
CREATE TABLE IF NOT EXISTS `groups` (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    assignment_id INT UNSIGNED NOT NULL,
    name          VARCHAR(255),
    leader_id     INT UNSIGNED NOT NULL,
    invite_code   VARCHAR(32) NOT NULL UNIQUE,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_assignment (assignment_id),
    INDEX idx_invite (invite_code),
    FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (leader_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- Group membership
CREATE TABLE IF NOT EXISTS group_members (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    group_id   INT UNSIGNED NOT NULL,
    student_id INT UNSIGNED NOT NULL,
    joined_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (group_id, student_id),
    FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Section submissions: each student's individual contribution to a group
CREATE TABLE IF NOT EXISTS group_sections (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    group_id      INT UNSIGNED NOT NULL,
    student_id    INT UNSIGNED NOT NULL,
    submission_id INT UNSIGNED NOT NULL,
    sort_order    INT UNSIGNED DEFAULT 0,
    title         VARCHAR(255),
    merged        TINYINT(1) DEFAULT 0,
    FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id),
    FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Drop UNIQUE(assignment_id, student_id) from submissions
-- Group members each have their own submission for the same assignment
ALTER TABLE submissions DROP INDEX assignment_id;