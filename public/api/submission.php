<?php
require_once __DIR__ . '/../../src/db.php';
require_once __DIR__ . '/../../src/guard.php';
require_once __DIR__ . '/../../src/response.php';

$user = guard();
$pdo = db();

$id = isset($_SERVER['PATH_INFO']) ? (int) trim($_SERVER['PATH_INFO'], '/') : 0;
if (!$id) error_response('Submission ID required', 400);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->prepare('
        SELECT s.id, s.assignment_id, s.student_id, s.content, s.status, s.submitted_at, s.created_at,
               u.name AS student_name, u.email AS student_email,
               st.keystroke_count, st.paste_count, st.delete_count, st.cursor_jumps,
               st.avg_wpm, st.total_time_ms, st.paste_ratio
        FROM submissions s
        JOIN users u ON u.id = s.student_id
        LEFT JOIN submission_stats st ON st.submission_id = s.id
        WHERE s.id = ?
    ');
    $stmt->execute([$id]);
    $sub = $stmt->fetch();
    if (!$sub) error_response('Submission not found', 404);

    // Access control: student can only view own, lecturer can view if they own the assignment
    if ($user['role'] === 'student' && (int) $sub['student_id'] !== $user['sub']) {
        error_response('Forbidden', 403);
    }
    if ($user['role'] === 'lecturer') {
        $stmt = $pdo->prepare('SELECT lecturer_id FROM assignments WHERE id = ?');
        $stmt->execute([$sub['assignment_id']]);
        $a = $stmt->fetch();
        if (!$a || (int) $a['lecturer_id'] !== $user['sub']) error_response('Forbidden', 403);
    }

    json_response(['submission' => $sub]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Check for /submit suffix
    $parts = explode('/', trim($_SERVER['PATH_INFO'], '/'));
    if (($parts[1] ?? '') !== 'submit') error_response('Method not allowed', 405);

    $stmt = $pdo->prepare('SELECT student_id, status FROM submissions WHERE id = ?');
    $stmt->execute([$id]);
    $sub = $stmt->fetch();
    if (!$sub) error_response('Submission not found', 404);
    if ((int) $sub['student_id'] !== $user['sub']) error_response('Forbidden', 403);
    if ($sub['status'] === 'submitted') error_response('Already submitted', 409);

    // Save final content on submit
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $content = $body['content'] ?? null;

    $stmt = $pdo->prepare("UPDATE submissions SET status = 'submitted', submitted_at = NOW(), content = ? WHERE id = ?");
    $stmt->execute([$content, $id]);

    $stmt = $pdo->prepare('SELECT id, assignment_id, student_id, status, submitted_at, created_at FROM submissions WHERE id = ?');
    $stmt->execute([$id]);
    json_response(['submission' => $stmt->fetch()]);
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    // Save draft content
    $stmt = $pdo->prepare('SELECT student_id, status FROM submissions WHERE id = ?');
    $stmt->execute([$id]);
    $sub = $stmt->fetch();
    if (!$sub) error_response('Submission not found', 404);
    if ((int) $sub['student_id'] !== $user['sub']) error_response('Forbidden', 403);
    if ($sub['status'] === 'submitted') error_response('Cannot edit submitted submission', 409);

    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $content = $body['content'] ?? null;

    $stmt = $pdo->prepare('UPDATE submissions SET content = ? WHERE id = ?');
    $stmt->execute([$content, $id]);

    $stmt = $pdo->prepare('SELECT id, assignment_id, student_id, content, status, submitted_at, created_at FROM submissions WHERE id = ?');
    $stmt->execute([$id]);
    json_response(['submission' => $stmt->fetch()]);
}

error_response('Method not allowed', 405);