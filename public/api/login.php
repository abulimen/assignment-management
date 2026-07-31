<?php
require_once __DIR__ . '/../../src/db.php';
require_once __DIR__ . '/../../src/jwt.php';
require_once __DIR__ . '/../../src/response.php';
require_once __DIR__ . '/../../src/validate.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    error_response('Method not allowed', 405);
}

$data = json_decode(file_get_contents('php://input'), true) ?? [];
require_fields($data, ['email', 'password']);
validate_email($data['email']);

$pdo = db();
$stmt = $pdo->prepare('SELECT id, email, password, name, role FROM users WHERE email = ?');
$stmt->execute([$data['email']]);
$user = $stmt->fetch();

if (!$user || !password_verify($data['password'], $user['password'])) {
    error_response('Invalid email or password', 401);
}

$token = jwt_encode(['sub' => (int) $user['id'], 'role' => $user['role']]);

json_response([
    'token' => $token,
    'user'  => ['id' => (int) $user['id'], 'email' => $user['email'], 'name' => $user['name'], 'role' => $user['role']],
]);