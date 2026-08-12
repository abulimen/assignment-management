<?php
// Per-member contribution status for the realtime group document.
// Done is a commitment: the collab server computes the document-state hash
// (clients never supply hashes). Editing after Done flips the member back
// server-side (collab/src/server.js onChange).
require_once __DIR__ . '/../../src/db.php';
require_once __DIR__ . '/../../src/guard.php';
require_once __DIR__ . '/../../src/response.php';
require_once __DIR__ . '/../../src/collab_client.php';

$user = guard();
$pdo = db();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') error_response('Method not allowed', 405);
if ($user['role'] !== 'student') error_response('Only students can update their status', 403);

// /api/group_status.php/<groupId>/<done|reopen>
$path = isset($_SERVER['PATH_INFO']) ? trim($_SERVER['PATH_INFO'], '/') : '';
$parts = explode('/', $path);
$groupId = (int) ($parts[0] ?? 0);
$action = $parts[1] ?? '';
if (!$groupId || !in_array($action, ['done', 'reopen'], true)) {
    error_response('Expected /group_status.php/<groupId>/<done|reopen>', 400);
}

// Group exists, is not sealed, and the caller is a member.
$stmt = $pdo->prepare('SELECT id, frozen_at FROM `groups` WHERE id = ?');
$stmt->execute([$groupId]);
$group = $stmt->fetch();
if (!$group) error_response('Group not found', 404);
if ($group['frozen_at']) error_response('Group document is already submitted', 409);

$stmt = $pdo->prepare('SELECT id FROM group_members WHERE group_id = ? AND student_id = ?');
$stmt->execute([$groupId, $user['sub']]);
if (!$stmt->fetch()) error_response('Forbidden', 403);

if ($action === 'done') {
    // Server-computed content hash of the canonical live document.
    $res = collab_request('GET', "/internal/doc/$groupId/state");
    if (!$res['ok']) {
        error_response('Collaboration server unavailable — cannot mark Done right now', 503);
    }
    $sha = $res['body']['sha256'] ?? null;
    if (!$sha) error_response('Collaboration server returned no document state', 502);

    $pdo->prepare("
        INSERT INTO group_member_status (group_id, student_id, status, done_at, done_doc_sha)
        VALUES (?, ?, 'done', NOW(), ?)
        ON DUPLICATE KEY UPDATE status = 'done', done_at = NOW(), done_doc_sha = VALUES(done_doc_sha)
    ")->execute([$groupId, $user['sub'], $sha]);
} else { // reopen
    $pdo->prepare("
        UPDATE group_member_status
        SET status = 'in_progress', done_at = NULL, done_doc_sha = NULL
        WHERE group_id = ? AND student_id = ?
    ")->execute([$groupId, $user['sub']]);
}

// Fresh statuses so clients refresh without a second round-trip.
$stmt = $pdo->prepare("
    SELECT gm.student_id, COALESCE(gms.status, 'not_started') AS status,
           gms.done_at, gms.last_activity_at
    FROM group_members gm
    LEFT JOIN group_member_status gms
        ON gms.group_id = gm.group_id AND gms.student_id = gm.student_id
    WHERE gm.group_id = ?
");
$stmt->execute([$groupId]);
json_response(['group_id' => $groupId, 'members' => $stmt->fetchAll()]);
