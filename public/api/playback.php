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

$stmt = $pdo->prepare('
    SELECT id, assignment_id, student_id, status, content, group_id,
           override_used, override_by, override_reason, done_vector, non_done_members
    FROM submissions WHERE id = ?
');
$stmt->execute([$id]);
$sub = $stmt->fetch();
if (!$sub) error_response('Submission not found', 404);

// Lecturers can view any submission; students their own; group members can
// view their group's submission — realtime via submissions.group_id, legacy
// merged via groups.merged_submission_id.
if ($user['role'] !== 'lecturer' && (int) $sub['student_id'] !== $user['sub']) {
    $allowed = false;
    if (!empty($sub['group_id'])) {
        $stmt = $pdo->prepare('SELECT id FROM group_members WHERE group_id = ? AND student_id = ?');
        $stmt->execute([$sub['group_id'], $user['sub']]);
        $allowed = (bool) $stmt->fetch();
    } else {
        $stmt = $pdo->prepare('SELECT id FROM `groups` WHERE merged_submission_id = ?');
        $stmt->execute([$id]);
        $grp = $stmt->fetch();
        if ($grp) {
            $stmt = $pdo->prepare('SELECT id FROM group_members WHERE group_id = ? AND student_id = ?');
            $stmt->execute([$grp['id'], $user['sub']]);
            $allowed = (bool) $stmt->fetch();
        }
    }
    if (!$allowed) error_response('Forbidden', 403);
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

// Realtime group submission: review binds to the SEALED snapshot (content +
// surviving-text contributions + override record), never the live document.
if (!empty($sub['group_id'])) {
    $stmt = $pdo->prepare('SELECT * FROM group_doc_snapshots WHERE group_id = ?');
    $stmt->execute([$sub['group_id']]);
    $snapshot = $stmt->fetch();
    if ($snapshot) {
        $contributions = json_decode($snapshot['contributions'], true) ?: [];

        $stmt = $pdo->prepare('
            SELECT gm.student_id, u.name AS student_name,
                   s.id AS submission_id,
                   ss.word_count, ss.keystroke_count, ss.paste_count,
                   ss.total_time_ms, ss.paste_ratio
            FROM group_members gm
            JOIN users u ON u.id = gm.student_id
            LEFT JOIN submissions s
                ON s.assignment_id = ? AND s.student_id = gm.student_id AND s.group_id IS NULL
            LEFT JOIN submission_stats ss ON ss.submission_id = s.id
            WHERE gm.group_id = ?
            ORDER BY gm.joined_at ASC
        ');
        $stmt->execute([$sub['assignment_id'], $sub['group_id']]);
        $sections = $stmt->fetchAll();

        $memberChars = [];
        foreach ($sections as $s) {
            $memberChars[(string) $s['student_id']] = (int) ($contributions[(string) $s['student_id']] ?? 0);
        }
        $totalChars = array_sum($memberChars);
        foreach ($sections as &$row) {
            $chars = $memberChars[(string) $row['student_id']];
            $row['surviving_chars'] = $chars;
            $row['share_pct'] = $totalChars > 0 ? round($chars / $totalChars * 100, 1) : 0;
            $row['pasted_texts'] = $row['submission_id']
                ? section_pasted_texts($pdo, (int) $row['submission_id'])
                : [];
        }
        unset($row);

        $override = null;
        if ((int) $sub['override_used'] === 1) {
            $stmt = $pdo->prepare('SELECT name FROM users WHERE id = ?');
            $stmt->execute([$sub['override_by']]);
            $byName = $stmt->fetchColumn() ?: 'Unknown';
            $override = [
                'used' => true,
                'by' => (int) $sub['override_by'],
                'by_name' => $byName,
                'reason' => $sub['override_reason'],
                'non_done' => json_decode($sub['non_done_members'], true) ?: [],
            ];
        }

        json_response([
            'submission_id' => (int) $sub['id'],
            'content' => $snapshot['prosemirror_json'],
            'events' => [], // group-doc playback is a future subsystem
            'stats' => $stats,
            'sections' => $sections,
            'override' => $override,
            'done_vector' => json_decode($sub['done_vector'], true) ?: [],
            'frozen_at' => $snapshot['frozen_at'],
            'realtime' => true,
        ]);
    }
}

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