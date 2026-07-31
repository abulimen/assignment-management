<?php
function require_fields(array $data, array $fields): void {
    foreach ($fields as $field) {
        if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
            error_response("Missing required field: $field", 422);
        }
    }
}

function validate_email(string $email): void {
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        error_response('Invalid email address', 422);
    }
}

function validate_role(string $role): void {
    if (!in_array($role, ['lecturer', 'student'], true)) {
        error_response('Role must be lecturer or student', 422);
    }
}