USE assignment_mgmt;

-- Add student_id to users table (optional for lecturers, included for students)
ALTER TABLE users ADD COLUMN student_id VARCHAR(100) NULL AFTER name;

-- Generate demo IDs for existing student records (e.g. 24/001, 24/002, ...)
SET @row_number = 0;
UPDATE users
SET student_id = CONCAT('24/', LPAD(@row_number := @row_number + 1, 3, '0'))
WHERE role = 'student' AND (student_id IS NULL OR student_id = '');
