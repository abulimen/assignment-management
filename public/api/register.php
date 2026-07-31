<?php
require_once __DIR__ . '/../../src/db.php';
require_once __DIR__ . '/../../src/jwt.php';
require_once __DIR__ . '/../../src/response.php';
require_once __DIR__ . '/../../src/validate.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    error_response('Method not allowed', 405);
}

$data = json_decode(file_get_contents('php://input'), true) ?? [];
require_fields($data, ['email', 'password', 'name', 'role']);
validate_email($data['email']);
validate_role($data['role']);

if (strlen($data['password']) < 8) {
    error_response('Password must be at least 8 characters', 422);
}

$pdo = db();

// Check duplicate email
$stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
$stmt->execute([$data['email']]);
if ($stmt->fetch()) {
    error_response('Email already registered', 409);
}

$hash = password_hash($data['password'], PASSWORD_BCRYPT);
$stmt = $pdo->prepare('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)');
$stmt->execute([$data['email'], $hash, $data['name'], $data['role']]);
$userId = (int) $pdo->lastInsertId();

$token = jwt_encode(['sub' => $userId, 'role' => $data['role']]);

json_response([
    'token' => $token,
    'user'  => ['id' => $userId, 'email' => $data['email'], 'name' => $data['name'], 'role' => $data['role']],
], 201);