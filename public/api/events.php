<?php
require_once __DIR__ . '/../../src/db.php';
require_once __DIR__ . '/../../src/guard.php';
require_once __DIR__ . '/../../src/response.php';
require_once __DIR__ . '/../../src/validate.php';

// Helper: count text length in a ProseMirror slice content array
function countSliceTextLength($content) {
    $len = 0;
    foreach ($content as $node) {
        if (isset($node['text'])) {
            $len += strlen($node['text']);
        } elseif (isset($node['content'])) {
            $len += countSliceTextLength($node['content']);
        }
    }
    return $len;
}

// Helper: extract plain text from a ProseMirror JSON document
function extractPlainText($doc) {
    $text = '';
    if (!isset($doc['content'])) return $text;
    foreach ($doc['content'] as $node) {
        $text .= extractNodeText($node) . "\n";
    }
    return $text;
}

function extractNodeText($node) {
    $text = '';
    if (isset($node['text'])) {
        return $node['text'];
    }
    if (isset($node['content'])) {
        foreach ($node['content'] as $child) {
            $text .= extractNodeText($child);
        }
    }
    return $text;
}

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

// Batch insert events with steps_json
$stmt = $pdo->prepare('INSERT INTO events (submission_id, type, data, steps_json, selection_from, selection_to, occurred_at, sequence) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
$count = 0;
foreach ($data['events'] as $event) {
    $stmt->execute([
        $data['submission_id'],
        $event['type'] ?? 'step',
        json_encode($event['data'] ?? []),
        $event['steps_json'] ?? null,
        $event['selection_from'] ?? null,
        $event['selection_to'] ?? null,
        $event['occurred_at'],
        $event['sequence'],
    ]);
    $count++;
}

// Recompute stats from steps_json
$sid = $data['submission_id'];

// Classify steps: count keystrokes, pastes, deletes from step types
$statsQuery = $pdo->prepare("
    SELECT
        COUNT(*) AS total_events,
        SUM(CASE WHEN type = 'snapshot' THEN 1 ELSE 0 END) AS snapshot_count,
        SUM(CASE WHEN type = 'step' THEN 1 ELSE 0 END) AS step_count
    FROM events WHERE submission_id = ?
");
$statsQuery->execute([$sid]);
$s = $statsQuery->fetch();

// For character-based stats, parse steps_json to classify
$keystrokeCount = 0;
$pasteCount = 0;
$deleteCount = 0;
$cursorJumps = 0;

$allEvents = $pdo->prepare("SELECT type, data, steps_json, selection_from, selection_to FROM events WHERE submission_id = ? AND type != 'snapshot'");
$allEvents->execute([$sid]);
while ($row = $allEvents->fetch()) {
    $stepsJson = $row['steps_json'];
    if (!$stepsJson) {
        // Legacy event without steps_json — use type field
        if ($row['type'] === 'keystroke') $keystrokeCount++;
        elseif ($row['type'] === 'paste') {
            $pasteCount++;
            $pasteData = json_decode($row['data'], true);
            // Can't count chars without steps_json for legacy events
        }
        elseif ($row['type'] === 'delete') $deleteCount++;
        elseif ($row['type'] === 'cursor_jump') $cursorJumps++;
        continue;
    }

    $steps = json_decode($stepsJson, true) ?: [];
    foreach ($steps as $step) {
        if ($step['stepType'] === 'replace') {
            $from = $step['from'] ?? 0;
            $to = $step['to'] ?? 0;
            $deleted = $to - $from;

            // Extract inserted text length from slice
            $insertedLen = 0;
            if (isset($step['slice']['content'])) {
                $insertedLen = countSliceTextLength($step['slice']['content']);
            }

            if ($insertedLen > 0 && $deleted === 0) {
                if ($insertedLen === 1) $keystrokeCount++;
                else {
                    $pasteCount++;
                }
            } elseif ($deleted > 0) {
                $deleteCount++;
            }
        } elseif ($step['stepType'] === 'addMark' || $step['stepType'] === 'removeMark') {
            // Format change — not counted in keystroke/paste/delete stats
        }
    }

    // Check for cursor jumps via selection change
    if ($row['selection_from'] !== null && $row['selection_to'] !== null) {
        // selection_from === selection_to means collapsed cursor (no selection)
        // Large jumps are already captured as cursor_jump events in legacy code
    }
}

// Also count cursor_jumps from legacy type field
$jumpQuery = $pdo->prepare("SELECT COUNT(*) FROM events WHERE submission_id = ? AND type = 'cursor_jump'");
$jumpQuery->execute([$sid]);
$cursorJumps = max($cursorJumps, (int) $jumpQuery->fetchColumn());

// Compute paste ratio by character count — use pasted_text field from paste events
$pasteCharsQuery = $pdo->prepare("
    SELECT COALESCE(SUM(CHAR_LENGTH(JSON_UNQUOTE(JSON_EXTRACT(data, '$.pasted_text')))), 0)
    FROM events WHERE submission_id = ? AND type = 'paste'
");
$pasteCharsQuery->execute([$sid]);
$pastedChars = (int) $pasteCharsQuery->fetchColumn();

// Also count from steps_json for older events without pasted_text
$stepsQuery = $pdo->prepare("
    SELECT SUM(
        CASE WHEN steps_json IS NOT NULL THEN
            (SELECT SUM(len) FROM JSON_TABLE(steps_json, '$[*]' COLUMNS(
                len INT PATH '$.slice.content[0].text' DEFAULT '0' ON EMPTY
            )) AS jt WHERE jt.len > 1)
        ELSE 0 END
    ) AS steps_pasted
    FROM events WHERE submission_id = ? AND type = 'paste'
");
try {
    $stepsQuery->execute([$sid]);
    $stepsPasted = (int) ($stepsQuery->fetchColumn() ?? 0);
    $pastedChars = max($pastedChars, $stepsPasted);
} catch (PDOException $e) {
    // MySQL JSON_TABLE might not support this syntax, ignore
}

$typedChars = $keystrokeCount; // Each keystroke = 1 char
$totalChars = $typedChars + $pastedChars;
$pasteRatio = $totalChars > 0 ? round($pastedChars / $totalChars, 4) : 0;

// Approximate total time
$time = $pdo->prepare('SELECT MIN(occurred_at) AS first_ts, MAX(occurred_at) AS last_ts FROM events WHERE submission_id = ?');
$time->execute([$sid]);
$ts = $time->fetch();
$totalMs = $ts['first_ts'] && $ts['last_ts'] ? round(($ts['last_ts'] - $ts['first_ts']) * 1000) : 0;

$minutes = $totalMs / 60000;
$wpm = $minutes > 0 ? round(($keystrokeCount / 5) / $minutes, 1) : 0;

// Compute active time from focus/blur event pairs
// Only count gaps < 1 hour (ignore draft-save-and-come-back-later)
$focusBlurQuery = $pdo->prepare("
    SELECT type, occurred_at FROM events
    WHERE submission_id = ? AND type IN ('focus', 'blur')
    ORDER BY occurred_at ASC
");
$focusBlurQuery->execute([$sid]);
$fbEvents = $focusBlurQuery->fetchAll();

$activeTimeMs = 0;
$lastFocus = null;
foreach ($fbEvents as $fb) {
    if ($fb['type'] === 'focus') {
        $lastFocus = (float) $fb['occurred_at'];
    } elseif ($fb['type'] === 'blur' && $lastFocus !== null) {
        $gap = (float) $fb['occurred_at'] - $lastFocus;
        if ($gap > 0 && $gap < 3600) { // < 1 hour
            $activeTimeMs += round($gap * 1000);
        }
        $lastFocus = null;
    }
}
// If last event is a focus with no matching blur, use last event timestamp as closing time
if ($lastFocus !== null) {
    $lastEventQuery = $pdo->prepare('SELECT MAX(occurred_at) as last_ts FROM events WHERE submission_id = ?');
    $lastEventQuery->execute([$sid]);
    $lastTs = $lastEventQuery->fetchColumn();
    if ($lastTs) {
        $gap = (float) $lastTs - $lastFocus;
        if ($gap > 0 && $gap < 3600) {
            $activeTimeMs += round($gap * 1000);
        }
    }
}
// If no focus/blur events, fall back to total_time_ms
if ($activeTimeMs === 0) {
    $activeTimeMs = $totalMs;
}

// Compute word count from final submission content (only if content is not null)
$wordCount = null;
$contentQuery = $pdo->prepare('SELECT content FROM submissions WHERE id = ?');
$contentQuery->execute([$sid]);
$contentRow = $contentQuery->fetch();
if ($contentRow && $contentRow['content']) {
    $doc = json_decode($contentRow['content'], true);
    if ($doc) {
        $plainText = extractPlainText($doc);
        $wordCount = str_word_count($plainText);
    }
}
// If word_count is null (content not saved yet), keep existing value
if ($wordCount === null) {
    $existingStats = $pdo->prepare('SELECT word_count FROM submission_stats WHERE submission_id = ?');
    $existingStats->execute([$sid]);
    $wordCount = $existingStats->fetchColumn() ?: 0;
}

// Use active time for WPM if available
$activeMinutes = $activeTimeMs / 60000;
if ($activeMinutes > 0 && $activeMinutes < $minutes) {
    $wpm = round(($keystrokeCount / 5) / $activeMinutes, 1);
}

$pdo->prepare('
    INSERT INTO submission_stats (submission_id, total_time_ms, active_time_ms, keystroke_count, paste_count, delete_count, cursor_jumps, avg_wpm, paste_ratio, word_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
        total_time_ms = VALUES(total_time_ms),
        active_time_ms = VALUES(active_time_ms),
        keystroke_count = VALUES(keystroke_count),
        paste_count = VALUES(paste_count),
        delete_count = VALUES(delete_count),
        cursor_jumps = VALUES(cursor_jumps),
        avg_wpm = VALUES(avg_wpm),
        paste_ratio = VALUES(paste_ratio),
        word_count = VALUES(word_count)
')->execute([$sid, $totalMs, $activeTimeMs, $keystrokeCount, $pasteCount, $deleteCount, $cursorJumps, $wpm, $pasteRatio, $wordCount]);

json_response(['received' => $count]);