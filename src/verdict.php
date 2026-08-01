<?php
// PHP bridge to Python FastAPI analyzer service.
// ponytail: simple HTTP POST to localhost:8002. add retry/circuit-breaker when needed.

function get_verdict(int $submissionId): array {
    require_once __DIR__ . '/db.php';
    $pdo = db();

    // Fetch events (include steps_json for classification)
    $stmt = $pdo->prepare('SELECT type, data, steps_json, occurred_at, sequence FROM events WHERE submission_id = ? ORDER BY sequence ASC');
    $stmt->execute([$submissionId]);
    $events = $stmt->fetchAll();

    foreach ($events as &$e) {
        $e['data'] = json_decode($e['data'], true);
        $e['occurred_at'] = (float) $e['occurred_at'];
        // Parse steps_json for the analyzer to classify
        if ($e['steps_json']) {
            $e['steps'] = json_decode($e['steps_json'], true);
        } else {
            $e['steps'] = null;
        }
        unset($e['steps_json']);
    }

    // Fetch stats
    $stmt = $pdo->prepare('SELECT * FROM submission_stats WHERE submission_id = ?');
    $stmt->execute([$submissionId]);
    $stats = $stmt->fetch() ?: [];

    // Call Python analyzer
    $analyzerUrl = 'http://localhost:8002/analyze';
    $payload = json_encode([
        'events' => $events,
        'stats' => $stats,
    ]);

    $ch = curl_init($analyzerUrl);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_CONNECTTIMEOUT => 3,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error || $httpCode !== 200) {
        return [
            'overall_score' => 0,
            'verdict' => 'Analyzer unavailable',
            'confidence' => 'none',
            'factors' => [],
            'risk_flags' => [],
            'error' => $error ?: "HTTP $httpCode",
        ];
    }

    return json_decode($response, true) ?: [];
}