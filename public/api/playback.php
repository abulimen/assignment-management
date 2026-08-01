<?php
require_once __DIR__ . '/../../src/db.php';
require_once __DIR__ . '/../../src/guard.php';
require_once __DIR__ . '/../../src/response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    error_response('Method not allowed', 405);
}

$user = guard();
$pdo = db();

$id = isset($_SERVER['PATH_INFO']) ? (int) trim($_SERVER['PATH_INFO'], '/') : 0;
if (!$id) error_response('Submission ID required', 400);

$stmt = $pdo->prepare('SELECT id, assignment_id, student_id, status, content FROM submissions WHERE id = ?');
$stmt->execute([$id]);
$sub = $stmt->fetch();
if (!$sub) error_response('Submission not found', 404);

// Lecturers can view any; students can only view their own
if ($user['role'] !== 'lecturer' && (int) $sub['student_id'] !== $user['sub']) {
    error_response('Forbidden', 403);
}

$stmt = $pdo->prepare('SELECT type, data, steps_json, selection_from, selection_to, occurred_at, sequence FROM events WHERE submission_id = ? ORDER BY sequence ASC');
$stmt->execute([$id]);
$events = $stmt->fetchAll();

// Decode JSON data fields and parse steps_json
foreach ($events as &$e) {
    $e['data'] = json_decode($e['data'], true);
    $e['occurred_at'] = (float) $e['occurred_at'];
    if ($e['steps_json']) {
        $e['steps'] = json_decode($e['steps_json'], true);
        unset($e['steps_json']);
    } else {
        $e['steps'] = null;
    }
    $e['selection'] = [
        'from' => $e['selection_from'] !== null ? (int) $e['selection_from'] : null,
        'to' => $e['selection_to'] !== null ? (int) $e['selection_to'] : null,
    ];
    unset($e['selection_from'], $e['selection_to']);
}

// Get stats
$stmt = $pdo->prepare('SELECT * FROM submission_stats WHERE submission_id = ?');
$stmt->execute([$id]);
$stats = $stmt->fetch() ?: [];

json_response([
    'submission_id' => (int) $sub['id'],
    'content' => $sub['content'],
    'events' => $events,
    'stats' => $stats,
]);