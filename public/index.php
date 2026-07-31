<?php
// SPA bootstrap — serves the React app shell.
// The .htaccess routes all non-API, non-file requests here.
// Read the Vite-built index.html for correct asset references.
$built = __DIR__ . '/assets/index.html';
if (file_exists($built)) {
    readfile($built);
    return;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Assignment Management</title>
</head>
<body class="bg-gray-50 text-gray-900 antialiased">
    <div id="root"></div>
</body>
</html>