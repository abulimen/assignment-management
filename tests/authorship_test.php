<?php
// CLI test: php tests/authorship_test.php
require __DIR__ . '/../src/authorship.php';

$failures = 0;
function check($name, $cond) {
    global $failures;
    if ($cond) {
        echo "PASS: $name\n";
    } else {
        echo "FAIL: $name\n";
        $failures++;
    }
}

$doc = [
    'type' => 'doc',
    'content' => [
        [
            'type' => 'paragraph',
            'content' => [
                ['type' => 'text', 'text' => 'Hello '],
                ['type' => 'text', 'text' => 'world', 'marks' => [['type' => 'bold']]],
            ],
        ],
    ],
];

// 1. Adds author mark to every text node
$result = add_author_marks($doc, 17);
$t0 = $result['content'][0]['content'][0];
$t1 = $result['content'][0]['content'][1];
check('adds author mark to plain text node',
    in_array(['type' => 'author', 'attrs' => ['authorId' => 17]], $t0['marks'] ?? [], true));
check('adds author mark to marked text node',
    in_array(['type' => 'author', 'attrs' => ['authorId' => 17]], $t1['marks'] ?? [], true));

// 2. Preserves existing marks
check('preserves existing bold mark',
    in_array(['type' => 'bold'], $t1['marks'] ?? [], true));

// 3. Does not mutate input
check('does not mutate input',
    !isset($doc['content'][0]['content'][0]['marks']));

// 4. Text node without marks gets a marks array
check('plain node gets marks array', isset($t0['marks']) && count($t0['marks']) === 1);

// --- merge_section_docs: deterministic base doc for group merge / playback keyframe ---

$secADoc = ['type' => 'doc', 'content' => [
    ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'A text']]],
]];
$secBDoc = ['type' => 'doc', 'content' => [
    ['type' => 'heading', 'attrs' => ['level' => 2], 'content' => [['type' => 'text', 'text' => 'B head']]],
]];

// 5. Concatenates sections in order, tagging each with its author
$merged = merge_section_docs([
    ['student_id' => 17, 'content' => json_encode($secADoc)],
    ['student_id' => 9, 'content' => json_encode($secBDoc)],
]);
check('merged doc concatenates sections in order',
    count($merged['content']) === 2
    && $merged['content'][0]['type'] === 'paragraph'
    && $merged['content'][1]['type'] === 'heading');
check('first section tagged with its author',
    in_array(['type' => 'author', 'attrs' => ['authorId' => 17]], $merged['content'][0]['content'][0]['marks'] ?? [], true));
check('second section tagged with its author',
    in_array(['type' => 'author', 'attrs' => ['authorId' => 9]], $merged['content'][1]['content'][0]['marks'] ?? [], true));

// 6. Sections with null/empty content are skipped
$mergedSkip = merge_section_docs([
    ['student_id' => 17, 'content' => null],
    ['student_id' => 9, 'content' => json_encode($secBDoc)],
]);
check('null content section skipped', count($mergedSkip['content']) === 1);

// --- filter_pasted_texts: extract externally pasted blocks from event rows ---

// 8. Keeps external pastes with a long enough pasted_text
$filtered = filter_pasted_texts([
    '{"external_paste":true,"pasted_text":"Providing data on students writing process and time spent on Google Docs to verify student effort."}',
    ['external_paste' => true, 'pasted_text' => 'short'],
    ['external_paste' => false, 'pasted_text' => 'Internal copy within document, not externally pasted content.'],
    ['external_paste' => true, 'pasted_text' => ''],
]);
check('keeps only external pastes with >= 25 char text',
    count($filtered) === 1 && str_contains($filtered[0], 'Providing data'));

// 9. Accepts pre-decoded arrays
$filteredArr = filter_pasted_texts([
    ['external_paste' => true, 'pasted_text' => 'A long enough externally pasted block of text to qualify.'],
]);
check('accepts decoded arrays', count($filteredArr) === 1);

// 7. Accepts pre-decoded arrays too (playback recompute path)
$mergedArr = merge_section_docs([
    ['student_id' => 5, 'content' => $secADoc],
]);
check('accepts array content', count($mergedArr['content']) === 1
    && in_array(['type' => 'author', 'attrs' => ['authorId' => 5]], $mergedArr['content'][0]['content'][0]['marks'] ?? [], true));

if ($failures > 0) {
    echo "\n$failures test(s) FAILED\n";
    exit(1);
}
echo "\nAll tests passed\n";
exit(0);