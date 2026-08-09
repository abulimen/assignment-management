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