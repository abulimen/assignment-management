-- Migration: Organization and Course Scoping
USE assignment_mgmt;

-- 1. Organizations
CREATE TABLE IF NOT EXISTS `organizations` (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Add organization to users
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'organization_id';

SET @stmt = IF(@col_exists = 0, 'ALTER TABLE users ADD COLUMN organization_id INT UNSIGNED NULL', 'SELECT 1');
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

-- 3. Courses table
CREATE TABLE IF NOT EXISTS `courses` (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    organization_id INT UNSIGNED NOT NULL,
    code            VARCHAR(64) NOT NULL,
    title           VARCHAR(255) NOT NULL,
    description     TEXT NULL,
    semester        VARCHAR(64) NULL,
    invite_code     VARCHAR(32) NOT NULL UNIQUE,
    created_by      INT UNSIGNED NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_org (organization_id),
    INDEX idx_code (code),
    INDEX idx_invite (invite_code),
    FOREIGN KEY (organization_id) REFERENCES `organizations`(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. Course membership
CREATE TABLE IF NOT EXISTS `course_members` (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    course_id   INT UNSIGNED NOT NULL,
    user_id     INT UNSIGNED NOT NULL,
    role        ENUM('lecturer', 'student') NOT NULL,
    joined_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (course_id, user_id),
    INDEX idx_user (user_id),
    INDEX idx_course_role (course_id, role),
    FOREIGN KEY (course_id) REFERENCES `courses`(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 5. Add course_id and target_type to assignments
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'assignments' AND COLUMN_NAME = 'course_id';

SET @stmt = IF(@col_exists = 0, 'ALTER TABLE assignments ADD COLUMN course_id INT UNSIGNED NULL, ADD COLUMN target_type ENUM(\'all\', \'selected\') NOT NULL DEFAULT \'all\'', 'SELECT 1');
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

-- 6. Assignment participants table (for targeted assignments)
CREATE TABLE IF NOT EXISTS `assignment_participants` (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    assignment_id   INT UNSIGNED NOT NULL,
    user_id         INT UNSIGNED NOT NULL,
    group_id        INT UNSIGNED NULL,
    status          VARCHAR(32) NOT NULL DEFAULT 'active',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (assignment_id, user_id),
    INDEX idx_assignment (assignment_id),
    INDEX idx_user (user_id),
    FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 7. Data migration: Seed default organization and migrate existing users/assignments
INSERT IGNORE INTO `organizations` (id, name) VALUES (1, 'Draftly Beta University');
UPDATE users SET organization_id = 1 WHERE organization_id IS NULL;

-- For any existing assignments without course_id, auto-create a course for their lecturer
INSERT INTO `courses` (organization_id, code, title, invite_code, created_by)
SELECT DISTINCT 1, 'GEN 101', 'General Coursework', 
       CONCAT('GEN-', SUBSTRING(MD5(CONCAT(a.lecturer_id, NOW(), RAND())), 1, 6)),
       a.lecturer_id
FROM assignments a
WHERE a.course_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM `courses` c WHERE c.created_by = a.lecturer_id AND c.code = 'GEN 101'
  );

-- Link lecturers as members of their created courses
INSERT IGNORE INTO `course_members` (course_id, user_id, role)
SELECT c.id, c.created_by, 'lecturer'
FROM `courses` c;

-- Link existing assignments to the lecturer's course
UPDATE assignments a
JOIN `courses` c ON c.created_by = a.lecturer_id
SET a.course_id = c.id
WHERE a.course_id IS NULL;

-- Enroll existing students who have submissions into the course
INSERT IGNORE INTO `course_members` (course_id, user_id, role)
SELECT DISTINCT a.course_id, s.student_id, 'student'
FROM submissions s
JOIN assignments a ON a.id = s.assignment_id
WHERE a.course_id IS NOT NULL;
