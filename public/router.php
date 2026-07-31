<?php
// PHP built-in dev server router. Run with: php -S localhost:8080 -t public public/router.php
$uri = $_SERVER['REQUEST_URI'];
$path = parse_url($uri, PHP_URL_PATH);

// Route /api/*.php to the actual file
if (preg_match('#^/api/(.+)\.php(/.*)?$#', $path, $m)) {
    $_SERVER['PATH_INFO'] = $m[2] ?? '';
    require __DIR__ . '/api/' . $m[1] . '.php';
    return true;
}

// Serve static files from public/
$file = __DIR__ . $path;
if (file_exists($file) && is_file($file)) {
    return false;
}

// SPA fallback
require __DIR__ . '/index.php';
return true;