<?php
require_once __DIR__ . '/../../src/db.php';
require_once __DIR__ . '/../../src/guard.php';
require_once __DIR__ . '/../../src/response.php';

$user = guard();
$pdo = db();

// Extract ID from URL: /api/group.php/123 or /api/group.php/join
$path = isset($_SERVER['PATH_INFO']) ? trim($_SERVER['PATH_INFO'], '/') : '';
$parts = explode('/', $path);
$first = $parts[0] ?? '';
$id = is_numeric($first) ? (int) $first : 0;
$action = $id ? ($parts[1] ?? '') : $first;

if (!$id) {
    // Join by invite code: POST /api/group.php/join
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'join') {
        if ($user['role'] !== 'student') error_response('Only students can join groups', 403);
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $code = $data['invite_code'] ?? '';
        if (!$code) error_response('invite_code required', 400);

        $stmt = $pdo->prepare('SELECT g.* FROM `groups` g WHERE g.invite_code = ?');
        $stmt->execute([strtoupper($code)]);
        $group = $stmt->fetch();
        if (!$group) error_response('Invalid invite code', 404);

        // Check not already a member
        $stmt = $pdo->prepare('SELECT id FROM group_members WHERE group_id = ? AND student_id = ?');
        $stmt->execute([$group['id'], $user['sub']]);
        if ($stmt->fetch()) error_response('Already a member of this group', 409);

        // Add member
        $pdo->prepare('INSERT INTO group_members (group_id, student_id) VALUES (?, ?)')
            ->execute([$group['id'], $user['sub']]);
        // Status row for the realtime workflow (idempotent).
        $pdo->prepare("INSERT IGNORE INTO group_member_status (group_id, student_id, status) VALUES (?, ?, 'not_started')")
            ->execute([$group['id'], $user['sub']]);
        json_response(['group' => $group, 'joined' => true]);
    }
    error_response('Group ID required', 400);
}

// GET: group details + members (with realtime contribution status)
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->prepare('
        SELECT g.*, u.name AS leader_name, a.title AS assignment_title, a.is_group_work
        FROM `groups` g
        JOIN users u ON u.id = g.leader_id
        JOIN assignments a ON a.id = g.assignment_id
        WHERE g.id = ?
    ');
    $stmt->execute([$id]);
    $group = $stmt->fetch();
    if (!$group) error_response('Group not found', 404);

    // Access control: students must be a member; lecturers must own the assignment
    if ($user['role'] === 'student') {
        $stmt = $pdo->prepare('SELECT id FROM group_members WHERE group_id = ? AND student_id = ?');
        $stmt->execute([$id, $user['sub']]);
        if (!$stmt->fetch()) error_response('Forbidden', 403);
    } else {
        $stmt = $pdo->prepare('SELECT lecturer_id FROM assignments WHERE id = ?');
        $stmt->execute([$group['assignment_id']]);
        $a = $stmt->fetch();
        if (!$a || (int) $a['lecturer_id'] !== $user['sub']) error_response('Forbidden', 403);
    }

    // Get members (with realtime contribution status)
    $stmt = $pdo->prepare("
        SELECT gm.student_id, u.name AS student_name, u.email, gm.joined_at,
               (g.leader_id = gm.student_id) AS is_leader,
               COALESCE(gms.status, 'not_started') AS status,
               gms.done_at, gms.done_doc_sha, gms.last_activity_at
        FROM group_members gm
        JOIN `groups` g ON g.id = gm.group_id
        JOIN users u ON u.id = gm.student_id
        LEFT JOIN group_member_status gms
            ON gms.group_id = gm.group_id AND gms.student_id = gm.student_id
        WHERE gm.group_id = ?
        ORDER BY gm.joined_at ASC
    ");
    $stmt->execute([$id]);
    $group['members'] = $stmt->fetchAll();

    json_response(['group' => $group]);
}

error_response('Method not allowed', 405);