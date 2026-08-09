<?php
require_once __DIR__ . '/../../src/db.php';
require_once __DIR__ . '/../../src/guard.php';
require_once __DIR__ . '/../../src/response.php';

$user = guard();
$pdo = db();

// Extract ID from URL: /api/group.php/123 or /api/group.php/123/join or /api/group.php/123/merge
$path = isset($_SERVER['PATH_INFO']) ? trim($_SERVER['PATH_INFO'], '/') : '';
$parts = explode('/', $path);
$id = (int) ($parts[0] ?? 0);
$action = $parts[1] ?? '';

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
        json_response(['group' => $group, 'joined' => true]);
    }
    error_response('Group ID required', 400);
}

// GET: group details + members + sections
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

    // Get members
    $stmt = $pdo->prepare('
        SELECT gm.student_id, u.name AS student_name, u.email, gm.joined_at,
               (g.leader_id = gm.student_id) AS is_leader
        FROM group_members gm
        JOIN users u ON u.id = gm.student_id
        WHERE gm.group_id = ?
        ORDER BY gm.joined_at ASC
    ');
    $stmt->execute([$id]);
    $group['members'] = $stmt->fetchAll();

    // Get sections
    $stmt = $pdo->prepare('
        SELECT gs.id, gs.student_id, gs.submission_id, gs.sort_order, gs.title, gs.merged,
               u.name AS student_name,
               s.status AS submission_status,
               s.content IS NOT NULL AS has_content,
               ss.word_count, ss.keystroke_count, ss.total_time_ms
        FROM group_sections gs
        JOIN users u ON u.id = gs.student_id
        LEFT JOIN submissions s ON s.id = gs.submission_id
        LEFT JOIN submission_stats ss ON ss.submission_id = s.id
        WHERE gs.group_id = ?
        ORDER BY gs.sort_order ASC
    ');
    $stmt->execute([$id]);
    $group['sections'] = $stmt->fetchAll();

    json_response(['group' => $group]);
}

// POST: join or merge
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if ($action === 'merge') {
        // Leader merges sections
        $stmt = $pdo->prepare('SELECT * FROM `groups` WHERE id = ?');
        $stmt->execute([$id]);
        $group = $stmt->fetch();
        if (!$group) error_response('Group not found', 404);
        if ((int) $group['leader_id'] !== $user['sub']) error_response('Only the leader can merge', 403);

        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $sectionOrder = $data['section_order'] ?? [];
        if (empty($sectionOrder)) error_response('section_order required', 400);

        // Update sort orders
        foreach ($sectionOrder as $order => $sectionId) {
            $pdo->prepare('UPDATE group_sections SET sort_order = ? WHERE id = ? AND group_id = ?')
                ->execute([$order, $sectionId, $id]);
        }

        // Fetch sections in order with content
        $stmt = $pdo->prepare('
            SELECT gs.*, s.content, u.name AS student_name
            FROM group_sections gs
            JOIN submissions s ON s.id = gs.submission_id
            JOIN users u ON u.id = gs.student_id
            WHERE gs.group_id = ?
            ORDER BY gs.sort_order ASC
        ');
        $stmt->execute([$id]);
        $sections = $stmt->fetchAll();

        // Merge TipTap JSON content
        $mergedContent = ['type' => 'doc', 'content' => []];
        $sectionMeta = []; // for attribution
        foreach ($sections as $sec) {
            if (!$sec['content']) continue;
            $doc = json_decode($sec['content'], true);
            if (!$doc || !isset($doc['content'])) continue;
            $startPos = count($mergedContent['content']);
            foreach ($doc['content'] as $node) {
                $mergedContent['content'][] = $node;
            }
            $sectionMeta[] = [
                'student_id' => (int) $sec['student_id'],
                'student_name' => $sec['student_name'],
                'title' => $sec['title'],
                'start_pos' => $startPos,
                'node_count' => count($doc['content']),
            ];
        }

        // Create merged group submission
        $stmt = $pdo->prepare('INSERT INTO submissions (assignment_id, student_id, content, status) VALUES (?, ?, ?, ?)');
        $stmt->execute([
            $group['assignment_id'],
            $user['sub'], // leader's ID
            json_encode($mergedContent),
            'submitted',
        ]);
        $mergedSubmissionId = (int) $pdo->lastInsertId();
        $pdo->prepare('UPDATE submissions SET submitted_at = NOW() WHERE id = ?')->execute([$mergedSubmissionId]);

        // Mark sections as merged
        $pdo->prepare('UPDATE group_sections SET merged = 1 WHERE group_id = ?')->execute([$id]);

        // Store section metadata for attribution
        $pdo->prepare('UPDATE submissions SET content = ? WHERE id = ?')
            ->execute([json_encode($mergedContent), $mergedSubmissionId]);

        json_response([
            'submission_id' => $mergedSubmissionId,
            'sections' => $sectionMeta,
        ]);
    }

    if ($action === 'create-section') {
        // Student creates their individual section submission
        if ($user['role'] !== 'student') error_response('Only students can create sections', 403);

        $stmt = $pdo->prepare('SELECT * FROM `groups` WHERE id = ?');
        $stmt->execute([$id]);
        $group = $stmt->fetch();
        if (!$group) error_response('Group not found', 404);

        // Must be a member
        $stmt = $pdo->prepare('SELECT id FROM group_members WHERE group_id = ? AND student_id = ?');
        $stmt->execute([$id, $user['sub']]);
        if (!$stmt->fetch()) error_response('Forbidden', 403);

        // Check if section already exists
        $stmt = $pdo->prepare('SELECT * FROM group_sections WHERE group_id = ? AND student_id = ?');
        $stmt->execute([$id, $user['sub']]);
        if ($stmt->fetch()) error_response('You already have a section', 409);

        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $title = $data['title'] ?? '';

        // Create individual submission
        $stmt = $pdo->prepare('INSERT INTO submissions (assignment_id, student_id, content, status) VALUES (?, ?, ?, ?)');
        $stmt->execute([$group['assignment_id'], $user['sub'], null, 'draft']);
        $submissionId = (int) $pdo->lastInsertId();

        // Initialize stats
        $pdo->prepare('INSERT INTO submission_stats (submission_id) VALUES (?)')->execute([$submissionId]);

        // Create section entry
        $maxOrder = $pdo->prepare('SELECT COALESCE(MAX(sort_order), -1) FROM group_sections WHERE group_id = ?');
        $maxOrder->execute([$id]);
        $nextOrder = (int) $maxOrder->fetchColumn() + 1;

        $stmt = $pdo->prepare('INSERT INTO group_sections (group_id, student_id, submission_id, sort_order, title) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$id, $user['sub'], $submissionId, $nextOrder, $title]);
        $sectionId = (int) $pdo->lastInsertId();

        json_response(['section_id' => $sectionId, 'submission_id' => $submissionId], 201);
    }

    error_response('Unknown action: ' . $action, 400);
}

// PUT: update section (title)
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    if ($action === 'section') {
        $sectionId = (int) ($parts[2] ?? 0);
        if (!$sectionId) error_response('Section ID required', 400);

        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $title = $data['title'] ?? null;

        $stmt = $pdo->prepare('SELECT gs.* FROM group_sections gs WHERE gs.id = ?');
        $stmt->execute([$sectionId]);
        $section = $stmt->fetch();
        if (!$section) error_response('Section not found', 404);
        if ((int) $section['student_id'] !== $user['sub']) error_response('Forbidden', 403);

        if ($title !== null) {
            $pdo->prepare('UPDATE group_sections SET title = ? WHERE id = ?')->execute([$title, $sectionId]);
        }

        json_response(['ok' => true]);
    }
    error_response('Unknown action: ' . $action, 400);
}

error_response('Method not allowed', 405);