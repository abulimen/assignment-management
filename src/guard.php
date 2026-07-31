<?php
// Require at top of every protected endpoint.
require_once __DIR__ . '/jwt.php';
require_once __DIR__ . '/response.php';

function guard(): array {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!preg_match('/^Bearer\s+(.+)$/i', $header, $m)) {
        error_response('Missing or malformed authorization header', 401);
    }
    $payload = jwt_decode($m[1]);
    if (!$payload) {
        error_response('Invalid or expired token', 401);
    }
    return $payload; // {sub: user_id, role: 'lecturer'|'student', iat, exp}
}

function guard_role(string $role): array {
    $payload = guard();
    if ($payload['role'] !== $role) {
        error_response('Forbidden', 403);
    }
    return $payload;
}