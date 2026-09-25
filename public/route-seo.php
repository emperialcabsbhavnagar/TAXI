<?php
// Dynamic Edge SEO & Meta Injection Engine for EMPERIAL CABS Route Landing Pages
// Ensures Googlebot, Bingbot, and crawlers receive fully-rendered titles, descriptions, and JSON-LD structured data instantly.

$requestUri = $_SERVER['REQUEST_URI'] ?? '';
$path = parse_url($requestUri, PHP_URL_PATH);

// Match /taxi/:slug
$routeSlug = '';
if (preg_match('#^/taxi/([a-zA-Z0-9\-_]+)#i', $path, $matches)) {
    $routeSlug = strtolower(trim($matches[1]));
}

if (empty($routeSlug) && !empty($_GET['slug'])) {
    $routeSlug = strtolower(trim($_GET['slug']));
}

function unslugifyCity($slug) {
    return ucwords(str_replace('-', ' ', $slug));
}

$from = 'Bhavnagar';
$to = 'Ahmedabad';

if (!empty($routeSlug)) {
    $parts = explode('-to-', $routeSlug);
    if (count($parts) === 2) {
        $from = unslugifyCity($parts[0]);
        $to = unslugifyCity($parts[1]);
    }
}

// Read index.html template
$htmlPath = __DIR__ . '/index.html';
if (!file_exists($htmlPath)) {
    $htmlPath = dirname(__DIR__) . '/dist/index.html';
}
if (!file_exists($htmlPath)) {
    $htmlPath = dirname(__DIR__) . '/index.html';
}

$html = file_exists($htmlPath) ? file_get_contents($htmlPath) : '';
if (empty($html)) {
    // Fallback pass-through
    http_response_code(200);
    exit();
}

// Connect to MySQL to obtain live price
$db_configs = [
    ['host' => 'localhost', 'user' => 'u217835086_TAXI', 'pass' => 'Mahadev@0963', 'name' => 'u217835086_TAXI', 'port' => '3306'],
    ['host' => 'srv2213.hstgr.io', 'user' => 'u217835086_TAXI', 'pass' => 'Mahadev@0963', 'name' => 'u217835086_TAXI', 'port' => '3306']
];

$pdo = null;
foreach ($db_configs as $cfg) {
    try {
        $dsn = "mysql:host={$cfg['host']};port={$cfg['port']};dbname={$cfg['name']};charset=utf8mb4";
        $pdo = new PDO($dsn, $cfg['user'], $cfg['pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_TIMEOUT => 2
        ]);
        if ($pdo) break;
    } catch (Exception $e) {}
}

$minPrice = 2500;
$duration = '2 Hr 45 MIN';

if ($pdo) {
    try {
        $stmt = $pdo->prepare("SELECT price, duration, car_prices FROM routes WHERE ((LOWER(pickup) = LOWER(:p1) AND LOWER(dropoff) = LOWER(:d1)) OR (LOWER(pickup) = LOWER(:d2) AND LOWER(dropoff) = LOWER(:p2))) LIMIT 1");
        $stmt->execute([':p1' => $from, ':d1' => $to, ':p2' => $from, ':d2' => $to]);
        $row = $stmt->fetch();
        if ($row) {
            $basePrice = floatval($row['price'] ?? 0);
            if (!empty($row['duration'])) {
                $duration = $row['duration'];
            }
            if ($basePrice > 0) {
                $minPrice = $basePrice;
            }
            if (!empty($row['car_prices'])) {
                $cp = is_string($row['car_prices']) ? json_decode($row['car_prices'], true) : $row['car_prices'];
                if (is_array($cp)) {
                    $prices = array_filter(array_map('floatval', array_values($cp)), function($v) { return $v > 0; });
                    if (!empty($prices)) {
                        $minPrice = min($prices);
                    }
                }
            }
        }
    } catch (Exception $e) {}
}

$pageTitle = "{$from} to {$to} Taxi @ ₹{$minPrice} | One Way Cab & Car Rental — EMPERIAL CABS";
$pageDesc = "Book verified AC cab from {$from} to {$to} starting at ₹{$minPrice}. Zero hidden charges, clean sanitized cars & 24/7 doorstep pickup across Gujarat.";
$canonicalUrl = "https://emperialcabs.com/taxi/{$routeSlug}";

// JSON-LD Structured Data with TaxiService, AggregateRating, FAQPage, BreadcrumbList
$schemaJson = json_encode([
    "@context" => "https://schema.org",
    "@graph" => [
        [
            "@type" => "TaxiService",
            "@id" => "{$canonicalUrl}#service",
            "name" => "EMPERIAL CABS - {$from} to {$to} Taxi Service",
            "url" => $canonicalUrl,
            "serviceType" => "Outstation Taxi & One-Way Cab",
            "provider" => [
                "@type" => "LocalBusiness",
                "name" => "EMPERIAL CABS",
                "telephone" => "+91-9876543210",
                "url" => "https://emperialcabs.com",
                "address" => [
                    "@type" => "PostalAddress",
                    "streetAddress" => "Waghawadi Road",
                    "addressLocality" => "Bhavnagar",
                    "addressRegion" => "Gujarat",
                    "postalCode" => "364001",
                    "addressCountry" => "IN"
                ]
            ],
            "areaServed" => [
                ["@type" => "City", "name" => $from],
                ["@type" => "City", "name" => $to],
                ["@type" => "State", "name" => "Gujarat"]
            ],
            "aggregateRating" => [
                "@type" => "AggregateRating",
                "ratingValue" => "4.9",
                "reviewCount" => "1280",
                "bestRating" => "5",
                "worstRating" => "1"
            ],
            "offers" => [
                "@type" => "Offer",
                "price" => (string)$minPrice,
                "priceCurrency" => "INR",
                "availability" => "https://schema.org/InStock"
            ]
        ],
        [
            "@type" => "BreadcrumbList",
            "itemListElement" => [
                ["@type" => "ListItem", "position" => 1, "name" => "Home", "item" => "https://emperialcabs.com/"],
                ["@type" => "ListItem", "position" => 2, "name" => "Gujarat Taxi Routes", "item" => "https://emperialcabs.com/routes"],
                ["@type" => "ListItem", "position" => 3, "name" => "{$from} to {$to} Taxi", "item" => $canonicalUrl]
            ]
        ],
        [
            "@type" => "FAQPage",
            "mainEntity" => [
                [
                    "@type" => "Question",
                    "name" => "What is the taxi fare from {$from} to {$to}?",
                    "acceptedAnswer" => [
                        "@type" => "Answer",
                        "text" => "One-way taxi fare from {$from} to {$to} with EMPERIAL CABS starts at ₹{$minPrice}. Clean AC cars with zero hidden costs."
                    ]
                ],
                [
                    "@type" => "Question",
                    "name" => "How much time does it take to travel from {$from} to {$to} by cab?",
                    "acceptedAnswer" => [
                        "@type" => "Answer",
                        "text" => "The road journey from {$from} to {$to} takes approximately {$duration} via the fastest direct highway."
                    ]
                ],
                [
                    "@type" => "Question",
                    "name" => "Can I get doorstep pickup in {$from} for early morning or airport flights?",
                    "acceptedAnswer" => [
                        "@type" => "Answer",
                        "text" => "Yes, EMPERIAL CABS operates 24/7. We provide guaranteed doorstep pickup at any hour in {$from} with direct drop-off at {$to} airport, railway station, or home."
                    ]
                ]
            ]
        ]
    ]
], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

// Replace title & meta tags in HTML
$html = preg_replace('/<title>.*?<\/title>/is', "<title>" . htmlspecialchars($pageTitle, ENT_QUOTES, 'UTF-8') . "</title>", $html, 1);
$html = preg_replace('/<meta\s+name=["\']title["\']\s+content=["\'].*?["\']\s*\/?>/is', '<meta name="title" content="' . htmlspecialchars($pageTitle, ENT_QUOTES, 'UTF-8') . '" />', $html, 1);
$html = preg_replace('/<meta\s+name=["\']description["\']\s+content=["\'].*?["\']\s*\/?>/is', '<meta name="description" content="' . htmlspecialchars($pageDesc, ENT_QUOTES, 'UTF-8') . '" />', $html, 1);
$html = preg_replace('/<link\s+rel=["\']canonical["\']\s+href=["\'].*?["\']\s*\/?>/is', '<link rel="canonical" href="' . htmlspecialchars($canonicalUrl, ENT_QUOTES, 'UTF-8') . '" />', $html, 1);
$html = preg_replace('/<meta\s+property=["\']og:title["\']\s+content=["\'].*?["\']\s*\/?>/is', '<meta property="og:title" content="' . htmlspecialchars($pageTitle, ENT_QUOTES, 'UTF-8') . '" />', $html, 1);
$html = preg_replace('/<meta\s+property=["\']og:description["\']\s+content=["\'].*?["\']\s*\/?>/is', '<meta property="og:description" content="' . htmlspecialchars($pageDesc, ENT_QUOTES, 'UTF-8') . '" />', $html, 1);
$html = preg_replace('/<meta\s+property=["\']og:url["\']\s+content=["\'].*?["\']\s*\/?>/is', '<meta property="og:url" content="' . htmlspecialchars($canonicalUrl, ENT_QUOTES, 'UTF-8') . '" />', $html, 1);

// Inject Route JSON-LD structured data right before </head>
$injectScript = "\n    <!-- Dynamic Server-Injected Route SEO Schema for Googlebot -->\n    <script type=\"application/ld+json\" id=\"route-seo-schema\">\n{$schemaJson}\n    </script>\n";
$html = str_replace('</head>', $injectScript . '</head>', $html);

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: public, max-age=3600');
echo $html;
exit();
