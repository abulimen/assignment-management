<?php
// ponytail: singleton-ish PDO. add connection pooling when > 50 concurrent reqs.

function db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $cfg = require __DIR__ . '/config.php';
        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=%s',
            $cfg['db']['host'],
            $cfg['db']['port'],
            $cfg['db']['name'],
            $cfg['db']['charset']
        );
        $pdo = new PDO($dsn, $cfg['db']['user'], $cfg['db']['password'], [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    }
    return $pdo;
}