<?php
// Group submission gate. Normal submit requires every member to be Done;
// the leader may override with a mandatory reason. Either way the Node
// server seals the CANONICAL document server-side — client-supplied content
// is never accepted, so nobody's browser decides what was submitted.
require_once __DIR__ . '/../../src/db.php';
require_once __DIR__ . '/../../src/guard.php';
require_once __DIR__ . '/../../src/response.php';
require_once __DIR__ . '/../../src/collab_client.php';

// Extract concatenated text nodes from ProseMirror JSON for word counting.
function strip_tags_and_json_text(string $json): string {
    $doc = json_decode($json, true);
    $out = [];
    $walk = function ($node) use (&$walk, &$out) {
        if (!is_array($node)) return;
        if (isset($node['text'])) { $out[] = $node['text']; return; }
        foreach ($node['content'] ?? [] as $child) $walk($child);
    };
    $walk($doc);
    return implode(' ', $out);
}

$user = guard();
$pdo = db();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') error_response('Method not allowed', 405);
if ($user['role'] !== 'student') error_response('Only students can submit', 403);

// /api/group_submit.php/<groupId>
$groupId = isset($_SERVER['PATH_INFO']) ? (int) trim($_SERVER['PATH_INFO'], '/') : 0;
if (!$groupId) error_response('Group ID required', 400);
$data = json_decode(file_get_contents('php://input'), true) ?? [];

$stmt = $pdo->prepare('SELECT g.* FROM `groups` g WHERE g.id = ?');
$stmt->execute([$groupId]);
$group = $stmt->fetch();
if (!$group) error_response('Group not found', 404);
if ($group['frozen_at']) error_response('Group has already submitted', 409);

$stmt = $pdo->prepare('SELECT id FROM group_members WHERE group_id = ? AND student_id = ?');
$stmt->execute([$groupId, $user['sub']]);
if (!$stmt->fetch()) error_response('Forbidden', 403);
if ((int) $group['leader_id'] !== $user['sub']) error_response('Only the group leader can submit', 403);

// Gate: everyone Done, or leader override with a mandatory reason.
$stmt = $pdo->prepare("
    SELECT gm.student_id, u.name AS student_name,
           COALESCE(gms.status, 'not_started') AS status,
           gms.done_at, gms.last_activity_at
    FROM group_members gm
    JOIN users u ON u.id = gm.student_id
    LEFT JOIN group_member_status gms
        ON gms.group_id = gm.group_id AND gms.student_id = gm.student_id
    WHERE gm.group_id = ?
    ORDER BY gm.joined_at ASC
");
$stmt->execute([$groupId]);
$members = $stmt->fetchAll();

$doneVector = [];
$nonDone = [];
foreach ($members as $m) {
    $doneVector[] = [
        'student_id' => (int) $m['student_id'],
        'status' => $m['status'],
        'done_at' => $m['done_at'],
    ];
    if ($m['status'] !== 'done') {
        $nonDone[] = [
            'student_id' => (int) $m['student_id'],
            'student_name' => $m['student_name'],
            'last_activity_at' => $m['last_activity_at'],
        ];
    }
}

$overrideUsed = count($nonDone) > 0;
$overrideReason = null;
if ($overrideUsed) {
    $overrideReason = trim((string) ($data['override_reason'] ?? ''));
    if ($overrideReason === '') {
        $names = implode(', ', array_column($nonDone, 'student_name'));
        error_response("Not all members are Done ($names). Provide override_reason to submit anyway.", 409);
    }
}

// Draft row the Node seal binds to (rolled back if sealing fails).
$pdo->prepare('INSERT INTO submissions (assignment_id, student_id, content, status, group_id) VALUES (?, ?, NULL, ?, ?)')
    ->execute([$group['assignment_id'], $user['sub'], 'draft', $groupId]);
$submissionId = (int) $pdo->lastInsertId();
$pdo->prepare('INSERT INTO submission_stats (submission_id) VALUES (?)')->execute([$submissionId]);

$res = collab_request('POST', "/internal/doc/$groupId/seal", ['submission_id' => $submissionId]);
if (!$res['ok'] || empty($res['body']['sealed'])) {
    $pdo->prepare("DELETE FROM submissions WHERE id = ? AND status = 'draft'")->execute([$submissionId]);
    error_response('Collaboration server unavailable — submission not sealed. Try again.', 503);
}
if (!empty($res['body']['alreadySealed'])) {
    $pdo->prepare("DELETE FROM submissions WHERE id = ? AND status = 'draft'")->execute([$submissionId]);
    error_response('Group has already submitted', 409);
}

// The sealed snapshot is what was submitted — read it back, never the client.
$stmt = $pdo->prepare('SELECT prosemirror_json FROM group_doc_snapshots WHERE group_id = ?');
$stmt->execute([$groupId]);
$snap = $stmt->fetch();
if (!$snap) {
    $pdo->prepare("DELETE FROM submissions WHERE id = ? AND status = 'draft'")->execute([$submissionId]);
    error_response('Seal produced no snapshot', 502);
}

// Word count for the group's headline stats.
$wordCount = 0;
if (preg_match_all('/[\p{L}\p{N}\'\-]+/u', strip_tags_and_json_text($snap['prosemirror_json']), $matches)) {
    $wordCount = count($matches[0]);
}

$pdo->prepare('
    UPDATE submissions
    SET content = ?, status = ?, submitted_at = NOW(),
        override_used = ?, override_by = ?, override_reason = ?,
        done_vector = ?, non_done_members = ?
    WHERE id = ?
')->execute([
    $snap['prosemirror_json'],
    'submitted',
    $overrideUsed ? 1 : 0,
    $overrideUsed ? $user['sub'] : null,
    $overrideUsed ? $overrideReason : null,
    json_encode($doneVector),
    json_encode($nonDone),
    $submissionId,
]);
$pdo->prepare('UPDATE submission_stats SET word_count = ? WHERE submission_id = ?')
    ->execute([$wordCount, $submissionId]);
$pdo->prepare('UPDATE `groups` SET merged_submission_id = ? WHERE id = ?')
    ->execute([$submissionId, $groupId]);

json_response([
    'submission_id' => $submissionId,
    'override_used' => $overrideUsed,
    'non_done_members' => $nonDone,
]);
