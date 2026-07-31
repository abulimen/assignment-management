<?php
// ponytail: manual JWT impl. HS256 only. add firebase/php-jwt when algos > 1.

function jwt_encode(array $payload): string {
    $cfg = require __DIR__ . '/config.php';
    $header = base64url_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload['iat'] = $payload['iat'] ?? time();
    $payload['exp'] = $payload['exp'] ?? time() + $cfg['jwt']['expiry'];
    $body = base64url_encode(json_encode($payload));
    $sig = base64url_encode(hash_hmac('sha256', "$header.$body", $cfg['jwt']['secret'], true));
    return "$header.$body.$sig";
}

function jwt_decode(string $token): ?array {
    $cfg = require __DIR__ . '/config.php';
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;

    [$header, $body, $sig] = $parts;
    $expected = base64url_encode(hash_hmac('sha256', "$header.$body", $cfg['jwt']['secret'], true));
    if (!hash_equals($expected, $sig)) return null;

    $payload = json_decode(base64url_decode($body), true);
    if (!$payload || !isset($payload['exp'])) return null;
    if ($payload['exp'] < time()) return null;

    return $payload;
}

function base64url_encode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode(string $data): string {
    return base64_decode(strtr($data, '-_', '+/'));
}