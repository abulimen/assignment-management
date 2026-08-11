<?php
return [
    'db' => [
        'host'     => getenv('DB_HOST') ?: '127.0.0.1',
        'port'     => getenv('DB_PORT') ?: '3306',
        'name'     => getenv('DB_NAME') ?: 'assignment_mgmt',
        'user'     => getenv('DB_USER') ?: 'root',
        'password' => getenv('DB_PASS') ?: '',
        'charset'  => 'utf8mb4',
    ],
    'jwt' => [
        'secret'     => getenv('JWT_SECRET') ?: 'CHANGE_ME_IN_PRODUCTION',
        'algorithm'  => 'HS256',
        'expiry'     => 604800, // 7 days
    ],
    'app' => [
        'cors_origin' => getenv('CORS_ORIGIN') ?: 'http://localhost:3000',
    ],
    'collab' => [
        // Node collaboration server's INTERNAL HTTP API (loopback, shared secret).
        'url'             => getenv('COLLAB_INTERNAL_URL') ?: 'http://127.0.0.1:8004',
        'internal_secret' => getenv('INTERNAL_API_SECRET') ?: 'local-dev-internal-secret',
    ],
];