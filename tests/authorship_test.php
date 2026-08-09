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

if ($failures > 0) {
    echo "\n$failures test(s) FAILED\n";
    exit(1);
}
echo "\nAll tests passed\n";
exit(0);