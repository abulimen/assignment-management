<?php
// ponytail: single CORS origin. add dynamic origin matching when multi-domain needed.

function set_cors_headers(): void {
    $cfg = require __DIR__ . '/config.php';
    header('Access-Control-Allow-Origin: ' . $cfg['app']['cors_origin']);
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

function json_response(array $data, int $status = 200): void {
    set_cors_headers();
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function error_response(string $message, int $status = 400): void {
    json_response(['error' => $message], $status);
}