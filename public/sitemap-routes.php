<?php
// Dynamic Live Routes Sitemap for EMPERIAL CABS
// Reflects routes created by the admin in real-time
header('Content-Type: application/xml; charset=utf-8');
header('Cache-Control: public, max-age=1800');

$db_configs = [
    ['host' => 'localhost', 'user' => 'u217835086_TAXI', 'pass' => 'Mahadev@0963', 'name' => 'u217835086_TAXI', 'port' => '3306'],
    ['host' => 'srv2213.hstgr.io', 'user' => 'u217835086_TAXI', 'pass' => 'Mahadev@0963', 'name' => 'u217835086_TAXI', 'port' => '3306']
];

function slugifyText($text) {
    $text = preg_replace('~[^\pL\d]+~u', '-', $text);
    $text = iconv('utf-8', 'us-ascii//TRANSLIT', $text);
    $text = preg_replace('~[^-\w]+~', '', $text);
    $text = trim($text, '-');
    $text = preg_replace('~-+~', '-', $text);
    $text = strtolower($text);
    return empty($text) ? 'n-a' : $text;
}

$pdo = null;
foreach ($db_configs as $cfg) {
    try {
        $dsn = "mysql:host={$cfg['host']};port={$cfg['port']};dbname={$cfg['name']};charset=utf8mb4";
        $pdo = new PDO($dsn, $cfg['user'], $cfg['pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_TIMEOUT => 3
        ]);
        if ($pdo) break;
    } catch (Exception $e) {}
}

$today = date('Y-m-d');
$emittedSlugs = [];

if ($pdo) {
    try {
        $stmt = $pdo->query("SELECT pickup, dropoff, price, car_prices FROM routes ORDER BY id ASC");
        $routes = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

        foreach ($routes as $r) {
            $p = trim($r['pickup'] ?? '');
            $d = trim($r['dropoff'] ?? '');
            if (empty($p) || empty($d)) continue;

            $priceVal = floatval($r['price'] ?? 0);
            $hasPositivePrice = ($priceVal > 0);
            if (!$hasPositivePrice && !empty($r['car_prices'])) {
                $cp = is_array($r['car_prices']) ? $r['car_prices'] : json_decode($r['car_prices'], true);
                if (is_array($cp)) {
                    foreach ($cp as $v) {
                        if (floatval($v) > 0) {
                            $hasPositivePrice = true;
                            break;
                        }
                    }
                }
            }

            if ($hasPositivePrice) {
                $slugForward = slugifyText($p) . '-to-' . slugifyText($d);
                $slugReverse = slugifyText($d) . '-to-' . slugifyText($p);

                foreach ([$slugForward, $slugReverse] as $slug) {
                    if (empty($slug) || isset($emittedSlugs[$slug])) continue;
                    $emittedSlugs[$slug] = true;
                    echo "  <url>\n";
                    echo "    <loc>https://emperialcabs.com/taxi/{$slug}</loc>\n";
                    echo "    <lastmod>{$today}</lastmod>\n";
                    echo "    <changefreq>daily</changefreq>\n";
                    echo "    <priority>1.0</priority>\n";
                    echo "  </url>\n";
                }
            }
        }

        echo '</urlset>';
        exit();
    } catch (Exception $e) {}
}

// Fallback to static sitemap-routes.xml if DB connection is unavailable
$fallbackPath = __DIR__ . '/sitemap-routes.xml';
if (file_exists($fallbackPath)) {
    readfile($fallbackPath);
    exit();
}

// Minimal safe fallback
echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
echo "  <url>\n";
echo "    <loc>https://emperialcabs.com/taxi/bhavnagar-to-ahmedabad</loc>\n";
echo "    <lastmod>{$today}</lastmod>\n";
echo "    <changefreq>daily</changefreq>\n";
echo "    <priority>1.0</priority>\n";
echo "  </url>\n";
echo "  <url>\n";
echo "    <loc>https://emperialcabs.com/taxi/ahmedabad-to-bhavnagar</loc>\n";
echo "    <lastmod>{$today}</lastmod>\n";
echo "    <changefreq>daily</changefreq>\n";
echo "    <priority>1.0</priority>\n";
echo "  </url>\n";
echo '</urlset>';
