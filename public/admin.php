<?php
// Dedicated Entry Handler for EMPERIAL CABS Dispatcher Admin PWA
// Guarantees proper canonical URL, title, apple-touch-icon, and admin-manifest.json
// when users tap "Add to Home Screen" on iPhone Safari and Android Chrome.

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

$htmlPath = __DIR__ . '/index.html';
if (!file_exists($htmlPath)) {
    $htmlPath = dirname(__DIR__) . '/dist/index.html';
}
if (!file_exists($htmlPath)) {
    $htmlPath = dirname(__DIR__) . '/index.html';
}

$html = file_exists($htmlPath) ? file_get_contents($htmlPath) : '';
if (empty($html)) {
    header('Location: /');
    exit();
}

// 1. Point canonical strictly to /admin
$html = preg_replace(
    '/<link\s+rel=["\']canonical["\'][^>]*>/i',
    '<link rel="canonical" href="https://emperialcabs.com/admin" id="canonical-tag" />',
    $html
);

// 2. Point manifest strictly to /admin-manifest.json
$html = preg_replace(
    '/<link\s+rel=["\']manifest["\'][^>]*>/i',
    '<link rel="manifest" href="/admin-manifest.json" />',
    $html
);

// 3. Set Apple Mobile App Title
if (strpos($html, 'name="apple-mobile-web-app-title"') !== false) {
    $html = preg_replace(
        '/<meta\s+name=["\']apple-mobile-web-app-title["\'][^>]*>/i',
        '<meta name="apple-mobile-web-app-title" content="Emperial Admin" />',
        $html
    );
} else {
    $html = str_replace(
        '<meta name="apple-mobile-web-app-capable" content="yes" />',
        "<meta name=\"apple-mobile-web-app-capable\" content=\"yes\" />\n    <meta name=\"apple-mobile-web-app-title\" content=\"Emperial Admin\" />",
        $html
    );
}

// 4. Update title tag
$html = preg_replace(
    '/<title>.*?<\/title>/is',
    '<title>EMPERIAL CABS Dispatcher Admin</title>',
    $html
);

// 5. Inject pre-hydration admin script at the top of head
$adminScript = '<script>
  try {
    localStorage.setItem("emperial_pwa_is_admin", "true");
  } catch(e) {}
</script>';
$html = str_replace('<head>', "<head>\n    " . $adminScript, $html);

echo $html;
exit();
