<?php
require_once __DIR__ . '/../../src/db.php';
require_once __DIR__ . '/../../src/guard.php';
require_once __DIR__ . '/../../src/response.php';
require_once __DIR__ . '/../../src/authorship.php';

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

// If this is a merged group submission, return per-member sections for the
// Contribution X-Ray (stats come from each member's own submission).
$sections = null;
$stmt = $pdo->prepare('SELECT id FROM `groups` WHERE merged_submission_id = ?');
$stmt->execute([$id]);
$grp = $stmt->fetch();
if ($grp) {
    $stmt = $pdo->prepare('
        SELECT gs.id, gs.student_id, gs.submission_id, gs.sort_order, gs.title, gs.merged,
               u.name AS student_name,
               s.status AS submission_status,
               ss.word_count, ss.keystroke_count, ss.paste_count, ss.total_time_ms, ss.paste_ratio
        FROM group_sections gs
        JOIN users u ON u.id = gs.student_id
        LEFT JOIN submissions s ON s.id = gs.submission_id
        LEFT JOIN submission_stats ss ON ss.submission_id = s.id
        WHERE gs.group_id = ?
        ORDER BY gs.sort_order ASC
    ');
    $stmt->execute([$grp['id']]);
    $sections = $stmt->fetchAll();

    // Externally pasted texts per section, for the red "copied" overlay in
    // the merged document view.
    foreach ($sections as &$secRow) {
        $secRow['pasted_texts'] = section_pasted_texts($pdo, (int) $secRow['submission_id']);
    }
    unset($secRow);
}

json_response([
    'submission_id' => (int) $sub['id'],
    'content' => $sub['content'],
    'events' => $events,
    'stats' => $stats,
    'sections' => $sections,
]);