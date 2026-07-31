<?php
require_once __DIR__ . '/../../src/db.php';
require_once __DIR__ . '/../../src/guard.php';
require_once __DIR__ . '/../../src/response.php';

$user = guard();
$pdo = db();

// Extract ID from URL: /api/assignment.php/123
$id = isset($_SERVER['PATH_INFO']) ? (int) trim($_SERVER['PATH_INFO'], '/') : 0;
if (!$id) error_response('Assignment ID required', 400);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->prepare('SELECT id, lecturer_id, title, description, rubric, due_date, created_at FROM assignments WHERE id = ?');
    $stmt->execute([$id]);
    $assignment = $stmt->fetch();
    if (!$assignment) error_response('Assignment not found', 404);

    if ($user['role'] === 'lecturer') {
        // Lecturer: only see submissions if they own the assignment
        if ((int) $assignment['lecturer_id'] !== $user['sub']) {
            $assignment['submissions'] = [];
        } else {
            $stmt = $pdo->prepare('
                SELECT s.id, s.student_id, u.name AS student_name, u.email AS student_email,
                       s.status, s.submitted_at, s.created_at,
                       st.keystroke_count, st.paste_count, st.delete_count, st.avg_wpm, st.total_time_ms
                FROM submissions s
                JOIN users u ON u.id = s.student_id
                LEFT JOIN submission_stats st ON st.submission_id = s.id
                WHERE s.assignment_id = ?
                ORDER BY s.created_at DESC
            ');
            $stmt->execute([$id]);
            $assignment['submissions'] = $stmt->fetchAll();
        }
    } else {
        // Student: only see their own submission
        $stmt = $pdo->prepare('
            SELECT s.id, s.student_id, u.name AS student_name, u.email AS student_email,
                   s.status, s.submitted_at, s.created_at,
                   st.keystroke_count, st.paste_count, st.delete_count, st.avg_wpm, st.total_time_ms
            FROM submissions s
            JOIN users u ON u.id = s.student_id
            LEFT JOIN submission_stats st ON st.submission_id = s.id
            WHERE s.assignment_id = ? AND s.student_id = ?
            ORDER BY s.created_at DESC
        ');
        $stmt->execute([$id, $user['sub']]);
        $assignment['submissions'] = $stmt->fetchAll();
    }

    json_response(['assignment' => $assignment]);
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    if ($user['role'] !== 'lecturer') error_response('Forbidden', 403);
    $data = json_decode(file_get_contents('php://input'), true) ?? [];

    $stmt = $pdo->prepare('SELECT lecturer_id FROM assignments WHERE id = ?');
    $stmt->execute([$id]);
    $a = $stmt->fetch();
    if (!$a) error_response('Assignment not found', 404);
    if ((int) $a['lecturer_id'] !== $user['sub']) error_response('Forbidden', 403);

    $fields = [];
    $values = [];
    foreach (['title', 'description', 'due_date'] as $f) {
        if (isset($data[$f])) { $fields[] = "$f = ?"; $values[] = $data[$f]; }
    }
    if (isset($data['rubric'])) { $fields[] = "rubric = ?"; $values[] = json_encode($data['rubric']); }
    if (empty($fields)) error_response('No fields to update', 422);

    $values[] = $id;
    $stmt = $pdo->prepare('UPDATE assignments SET ' . implode(', ', $fields) . ' WHERE id = ?');
    $stmt->execute($values);

    $stmt = $pdo->prepare('SELECT id, title, description, rubric, due_date, created_at FROM assignments WHERE id = ?');
    $stmt->execute([$id]);
    json_response(['assignment' => $stmt->fetch()]);
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    if ($user['role'] !== 'lecturer') error_response('Forbidden', 403);

    $stmt = $pdo->prepare('SELECT lecturer_id FROM assignments WHERE id = ?');
    $stmt->execute([$id]);
    $a = $stmt->fetch();
    if (!$a) error_response('Assignment not found', 404);
    if ((int) $a['lecturer_id'] !== $user['sub']) error_response('Forbidden', 403);

    $stmt = $pdo->prepare('DELETE FROM assignments WHERE id = ?');
    $stmt->execute([$id]);
    json_response(['ok' => true]);
}

error_response('Method not allowed', 405);