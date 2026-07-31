<?php
require_once __DIR__ . '/../../src/db.php';
require_once __DIR__ . '/../../src/guard.php';
require_once __DIR__ . '/../../src/response.php';
require_once __DIR__ . '/../../src/validate.php';

$user = guard();
$pdo = db();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $assignmentId = $_GET['assignment_id'] ?? null;
    if (!$assignmentId) error_response('assignment_id required', 400);

    if ($user['role'] === 'lecturer') {
        $stmt = $pdo->prepare('SELECT a.lecturer_id FROM assignments a WHERE a.id = ?');
        $stmt->execute([$assignmentId]);
        $a = $stmt->fetch();
        if (!$a || (int) $a['lecturer_id'] !== $user['sub']) error_response('Forbidden', 403);

        $stmt = $pdo->prepare('
            SELECT s.id, s.student_id, u.name AS student_name, s.status, s.submitted_at, s.created_at,
                   st.keystroke_count, st.paste_count, st.delete_count, st.avg_wpm, st.total_time_ms
            FROM submissions s
            JOIN users u ON u.id = s.student_id
            LEFT JOIN submission_stats st ON st.submission_id = s.id
            WHERE s.assignment_id = ?
            ORDER BY s.created_at DESC
        ');
        $stmt->execute([$assignmentId]);
    } else {
        // Student: only see their own submission
        $stmt = $pdo->prepare('
            SELECT s.id, s.student_id, u.name AS student_name, s.status, s.submitted_at, s.created_at,
                   st.keystroke_count, st.paste_count, st.delete_count, st.avg_wpm, st.total_time_ms
            FROM submissions s
            JOIN users u ON u.id = s.student_id
            LEFT JOIN submission_stats st ON st.submission_id = s.id
            WHERE s.assignment_id = ? AND s.student_id = ?
            ORDER BY s.created_at DESC
        ');
        $stmt->execute([$assignmentId, $user['sub']]);
    }

    json_response(['submissions' => $stmt->fetchAll()]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if ($user['role'] !== 'student') error_response('Only students can submit', 403);
    $data = json_decode(file_get_contents('php://input'), true) ?? [];
    require_fields($data, ['assignment_id']);

    // Verify assignment exists
    $stmt = $pdo->prepare('SELECT id FROM assignments WHERE id = ?');
    $stmt->execute([$data['assignment_id']]);
    if (!$stmt->fetch()) {
        error_response('Assignment not found', 404);
    }

    try {
        $stmt = $pdo->prepare('INSERT INTO submissions (assignment_id, student_id, content, status) VALUES (?, ?, ?, ?)');
        $stmt->execute([$data['assignment_id'], $user['sub'], $data['content'] ?? null, 'draft']);
    } catch (PDOException $e) {
        if ($e->getCode() == 23000) {
            error_response('You already have a submission for this assignment', 409);
        }
        error_response('Failed to create submission', 500);
    }
    $id = (int) $pdo->lastInsertId();

    // Initialize stats row
    $pdo->prepare('INSERT INTO submission_stats (submission_id) VALUES (?)')->execute([$id]);

    $stmt = $pdo->prepare('SELECT id, assignment_id, student_id, status, submitted_at, created_at FROM submissions WHERE id = ?');
    $stmt->execute([$id]);
    json_response(['submission' => $stmt->fetch()], 201);
}

error_response('Method not allowed', 405);