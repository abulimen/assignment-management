<?php
require_once __DIR__ . '/../../src/db.php';
require_once __DIR__ . '/../../src/guard.php';
require_once __DIR__ . '/../../src/response.php';
require_once __DIR__ . '/../../src/verdict.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    error_response('Method not allowed', 405);
}

$user = guard();
$pdo = db();

$id = isset($_SERVER['PATH_INFO']) ? (int) trim($_SERVER['PATH_INFO'], '/') : 0;
if (!$id) error_response('Submission ID required', 400);

$stmt = $pdo->prepare('SELECT id, assignment_id, student_id, status FROM submissions WHERE id = ?');
$stmt->execute([$id]);
$sub = $stmt->fetch();
if (!$sub) error_response('Submission not found', 404);

// Access control: lecturers can view any, students can only view their own.
// Exception: group members can view each other's sections.
if ($user['role'] !== 'lecturer' && (int) $sub['student_id'] !== $user['sub']) {
    $stmt = $pdo->prepare('
        SELECT COUNT(*) FROM group_members gm1
        JOIN group_members gm2 ON gm1.group_id = gm2.group_id
        WHERE gm1.student_id = ? AND gm2.student_id = ?
    ');
    $stmt->execute([$user['sub'], $sub['student_id']]);
    if ((int) $stmt->fetchColumn() === 0) {
        error_response('Forbidden', 403);
    }
}

$verdict = get_verdict($id);
json_response($verdict);