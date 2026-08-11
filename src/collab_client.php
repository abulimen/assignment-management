<?php
// PHP bridge to the Node collaboration server's internal HTTP API.
// ponytail: shared-secret header over loopback, same curl style as src/verdict.php.
// The Node server owns the live Y.Doc; PHP never parses Yjs itself — it asks
// Node for doc state hashes (mark-Done) and sealing (submit).

function collab_request(string $method, string $path, ?array $body = null): array {
    $cfg = (require __DIR__ . '/config.php')['collab'];
    $ch = curl_init($cfg['url'] . $path);
    $headers = ['X-Internal-Secret: ' . $cfg['internal_secret']];
    $opts = [
        CURLOPT_CUSTOMREQUEST  => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 20,
        CURLOPT_CONNECTTIMEOUT => 3,
    ];
    if ($body !== null) {
        $headers[] = 'Content-Type: application/json';
        $opts[CURLOPT_POSTFIELDS] = json_encode($body);
    }
    $opts[CURLOPT_HTTPHEADER] = $headers;
    curl_setopt_array($ch, $opts);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error || $httpCode === 0) {
        return ['ok' => false, 'status' => 0, 'body' => null, 'error' => $error ?: 'connection failed'];
    }
    return [
        'ok'     => $httpCode >= 200 && $httpCode < 300,
        'status' => $httpCode,
        'body'   => json_decode($response, true),
        'error'  => null,
    ];
}
