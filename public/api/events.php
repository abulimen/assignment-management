<?php
require_once __DIR__ . '/../../src/db.php';
require_once __DIR__ . '/../../src/guard.php';
require_once __DIR__ . '/../../src/response.php';
require_once __DIR__ . '/../../src/validate.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    error_response('Method not allowed', 405);
}

$user = guard();
if ($user['role'] !== 'student') error_response('Forbidden', 403);

$data = json_decode(file_get_contents('php://input'), true) ?? [];
require_fields($data, ['submission_id', 'events']);
if (!is_array($data['events']) || empty($data['events'])) {
    error_response('events must be a non-empty array', 422);
}

$pdo = db();

// Verify ownership
$stmt = $pdo->prepare('SELECT student_id, status FROM submissions WHERE id = ?');
$stmt->execute([$data['submission_id']]);
$sub = $stmt->fetch();
if (!$sub) error_response('Submission not found', 404);
if ((int) $sub['student_id'] !== $user['sub']) error_response('Forbidden', 403);
if ($sub['status'] === 'submitted') error_response('Cannot add events to submitted submission', 409);

// Batch insert events
$stmt = $pdo->prepare('INSERT INTO events (submission_id, type, data, occurred_at, sequence) VALUES (?, ?, ?, ?, ?)');
$count = 0;
foreach ($data['events'] as $event) {
    $stmt->execute([
        $data['submission_id'],
        $event['type'],
        json_encode($event['data']),
        $event['occurred_at'],
        $event['sequence'],
    ]);
    $count++;
}

// Recompute stats
$sid = $data['submission_id'];
$stats = $pdo->prepare('
    SELECT
        COUNT(*) AS total_events,
        SUM(CASE WHEN type = ? THEN 1 ELSE 0 END) AS keystroke_count,
        SUM(CASE WHEN type = ? THEN 1 ELSE 0 END) AS paste_count,
        SUM(CASE WHEN type = ? THEN 1 ELSE 0 END) AS delete_count,
        SUM(CASE WHEN type = ? THEN 1 ELSE 0 END) AS cursor_jumps
    FROM events WHERE submission_id = ?
');
$stats->execute(['keystroke', 'paste', 'delete', 'cursor_jump', $sid]);
$s = $stats->fetch();

// Approximate total time: last event time - first event time
$time = $pdo->prepare('SELECT MIN(occurred_at) AS first_ts, MAX(occurred_at) AS last_ts FROM events WHERE submission_id = ?');
$time->execute([$sid]);
$ts = $time->fetch();
$totalMs = $ts['first_ts'] && $ts['last_ts'] ? round(($ts['last_ts'] - $ts['first_ts']) * 1000) : 0;

// Approximate WPM: (keystrokes / 5) / minutes
$minutes = $totalMs / 60000;
$wpm = $minutes > 0 ? round(($s['keystroke_count'] / 5) / $minutes, 1) : 0;

$total = max((int) $s['total_events'], 1);
$pasteRatio = $total > 0 ? round($s['paste_count'] / $total, 4) : 0;

$pdo->prepare('
    INSERT INTO submission_stats (submission_id, total_time_ms, keystroke_count, paste_count, delete_count, cursor_jumps, avg_wpm, paste_ratio)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
        total_time_ms = VALUES(total_time_ms),
        keystroke_count = VALUES(keystroke_count),
        paste_count = VALUES(paste_count),
        delete_count = VALUES(delete_count),
        cursor_jumps = VALUES(cursor_jumps),
        avg_wpm = VALUES(avg_wpm),
        paste_ratio = VALUES(paste_ratio)
')->execute([$sid, $totalMs, $s['keystroke_count'], $s['paste_count'], $s['delete_count'], $s['cursor_jumps'], $wpm, $pasteRatio]);

json_response(['received' => $count]);