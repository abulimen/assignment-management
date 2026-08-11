<?php
// Authorship helper for group work merge.
// Adds an `author` mark to every text node in a TipTap doc array so that
// ownership is embedded in the merged content and survives leader edits.
// Tested in tests/authorship_test.php.

function add_author_marks(array $doc, int $authorId): array {
    $result = $doc;
    if (isset($doc['content']) && is_array($doc['content'])) {
        $result['content'] = array_map(
            fn($node) => add_marks_to_node($node, $authorId),
            $doc['content']
        );
    }
    return $result;
}

// Deterministic merged base document: concatenate section docs in the given
// order, tagging every text node with its author. Single code path used by
// both the group merge action and playback keyframe reconstruction, so the
// recomputed base is provably identical to the merge-time base.
// Each section row needs 'student_id' and 'content' (JSON string or array).
function merge_section_docs(array $sections): array {
    $merged = ['type' => 'doc', 'content' => []];
    foreach ($sections as $sec) {
        $content = $sec['content'] ?? null;
        if (is_string($content)) $content = json_decode($content, true);
        if (!$content || !isset($content['content'])) continue;

        $content = add_author_marks($content, (int) $sec['student_id']);
        foreach ($content['content'] as $node) {
            $merged['content'][] = $node;
        }
    }
    return $merged;
}

// Extract externally-pasted texts from raw paste-event rows (decoded arrays
// or JSON strings of the data column). Feeds the red "copied" overlay.
function filter_pasted_texts(array $pasteEvents): array {
    $out = [];
    foreach ($pasteEvents as $ev) {
        $d = is_string($ev) ? json_decode($ev, true) : $ev;
        if (is_array($d) && !empty($d['external_paste']) && !empty($d['pasted_text']) && strlen($d['pasted_text']) >= 25) {
            $out[] = $d['pasted_text'];
        }
    }
    return $out;
}

// Externally pasted texts for one submission.
function section_pasted_texts(PDO $pdo, int $submissionId): array {
    $stmt = $pdo->prepare("SELECT data FROM events WHERE submission_id = ? AND type = 'paste'");
    $stmt->execute([$submissionId]);
    return filter_pasted_texts(array_column($stmt->fetchAll(), 'data'));
}

function add_marks_to_node(array $node, int $authorId): array {
    $authorMark = ['type' => 'author', 'attrs' => ['authorId' => $authorId]];
    $result = $node;

    // Text node: prepend author mark, keep existing marks.
    if (isset($node['text'])) {
        $result['marks'] = array_merge([$authorMark], $node['marks'] ?? []);
    }

    // Recurse into child nodes.
    if (isset($node['content']) && is_array($node['content'])) {
        $result['content'] = array_map(
            fn($child) => add_marks_to_node($child, $authorId),
            $node['content']
        );
    }
    return $result;
}