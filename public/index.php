<?php
// SPA bootstrap — serves the React app shell.
// The .htaccess routes all non-API, non-file requests here.
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Assignment Management</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/assets/index.css" />
    <script type="module" src="/assets/index.js"></script>
</head>
<body class="bg-gray-50 text-gray-900 antialiased">
    <div id="root"></div>
</body>
</html>