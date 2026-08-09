<?php
require_once __DIR__ . '/../../src/db.php';
require_once __DIR__ . '/../../src/guard.php';
require_once __DIR__ . '/../../src/response.php';
require_once __DIR__ . '/../../src/validate.php';

$user = guard();
$pdo = db();

// GET: list groups for an assignment
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $assignmentId = $_GET['assignment_id'] ?? null;
    if (!$assignmentId) error_response('assignment_id required', 400);

    // Students see only their own groups; lecturers see all groups for their assignments
    if ($user['role'] === 'lecturer') {
        $stmt = $pdo->prepare('SELECT a.lecturer_id FROM assignments a WHERE a.id = ?');
        $stmt->execute([$assignmentId]);
        $a = $stmt->fetch();
        if (!$a || (int) $a['lecturer_id'] !== $user['sub']) error_response('Forbidden', 403);

        $stmt = $pdo->prepare('
            SELECT g.*, u.name AS leader_name, COUNT(gm.id) AS member_count
            FROM `groups` g
            JOIN users u ON u.id = g.leader_id
            LEFT JOIN group_members gm ON gm.group_id = g.id
            WHERE g.assignment_id = ?
            GROUP BY g.id
        ');
        $stmt->execute([$assignmentId]);
    } else {
        $stmt = $pdo->prepare('
            SELECT g.*, u.name AS leader_name, COUNT(gm.id) AS member_count
            FROM `groups` g
            JOIN group_members gm ON gm.group_id = g.id
            JOIN users u ON u.id = g.leader_id
            WHERE g.assignment_id = ? AND gm.student_id = ?
            GROUP BY g.id
        ');
        $stmt->execute([$assignmentId, $user['sub']]);
    }

    json_response(['groups' => $stmt->fetchAll()]);
}

// POST: create a group (student only)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if ($user['role'] !== 'student') error_response('Only students can create groups', 403);
    $data = json_decode(file_get_contents('php://input'), true) ?? [];
    require_fields($data, ['assignment_id']);

    // Check assignment exists and is group work
    $stmt = $pdo->prepare('SELECT is_group_work FROM assignments WHERE id = ?');
    $stmt->execute([$data['assignment_id']]);
    $a = $stmt->fetch();
    if (!$a) error_response('Assignment not found', 404);
    if (!(int) $a['is_group_work']) error_response('This assignment is not group work', 422);

    // Check student isn't already in a group for this assignment
    $stmt = $pdo->prepare('
        SELECT g.id FROM `groups` g
        JOIN group_members gm ON gm.group_id = g.id
        WHERE g.assignment_id = ? AND gm.student_id = ?
    ');
    $stmt->execute([$data['assignment_id'], $user['sub']]);
    if ($stmt->fetch()) error_response('You are already in a group for this assignment', 409);

    // Generate invite code
    $inviteCode = strtoupper(substr(md5(uniqid(mt_rand(), true)), 0, 6));

    // Create group
    $stmt = $pdo->prepare('INSERT INTO `groups` (assignment_id, name, leader_id, invite_code) VALUES (?, ?, ?, ?)');
    $name = $data['name'] ?? 'Group ' . $inviteCode;
    $stmt->execute([$data['assignment_id'], $name, $user['sub'], $inviteCode]);
    $groupId = (int) $pdo->lastInsertId();

    // Add creator as first member
    $pdo->prepare('INSERT INTO group_members (group_id, student_id) VALUES (?, ?)')
        ->execute([$groupId, $user['sub']]);

    // Fetch created group
    $stmt = $pdo->prepare('SELECT g.*, u.name AS leader_name FROM `groups` g JOIN users u ON u.id = g.leader_id WHERE g.id = ?');
    $stmt->execute([$groupId]);
    json_response(['group' => $stmt->fetch()], 201);
}

error_response('Method not allowed', 405);