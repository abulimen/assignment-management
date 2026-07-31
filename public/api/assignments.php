<?php
require_once __DIR__ . '/../../src/db.php';
require_once __DIR__ . '/../../src/guard.php';
require_once __DIR__ . '/../../src/response.php';
require_once __DIR__ . '/../../src/validate.php';

$user = guard();
$pdo = db();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($user['role'] === 'lecturer') {
        $stmt = $pdo->prepare('SELECT id, title, description, rubric, due_date, created_at FROM assignments WHERE lecturer_id = ? ORDER BY created_at DESC');
        $stmt->execute([$user['sub']]);
    } else {
        $stmt = $pdo->prepare('
            SELECT a.id, a.title, a.description, a.rubric, a.due_date, a.created_at,
                   s.id AS submission_id, s.status AS submission_status
            FROM assignments a
            LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = ?
            ORDER BY a.created_at DESC
        ');
        $stmt->execute([$user['sub']]);
    }
    json_response(['assignments' => $stmt->fetchAll()]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    guard_role('lecturer'); // re-checks role
    $data = json_decode(file_get_contents('php://input'), true) ?? [];
    require_fields($data, ['title']);

    $stmt = $pdo->prepare('INSERT INTO assignments (lecturer_id, title, description, rubric, due_date) VALUES (?, ?, ?, ?, ?)');
    $stmt->execute([
        $user['sub'],
        $data['title'],
        $data['description'] ?? null,
        isset($data['rubric']) ? json_encode($data['rubric']) : null,
        $data['due_date'] ?? null,
    ]);
    $id = (int) $pdo->lastInsertId();

    $stmt = $pdo->prepare('SELECT id, title, description, rubric, due_date, created_at FROM assignments WHERE id = ?');
    $stmt->execute([$id]);
    json_response(['assignment' => $stmt->fetch()], 201);
}

error_response('Method not allowed', 405);