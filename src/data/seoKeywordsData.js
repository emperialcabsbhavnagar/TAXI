// EMPERIAL CABS - Gujarat Comprehensive Programmatic SEO Data Engine
// Captures 50,000+ localized search keywords across Bhavnagar and all Gujarat

export const GUJARAT_PRIMARY_CITIES = [
  { name: 'Bhavnagar', slug: 'bhavnagar', district: 'Bhavnagar', tier: 1, hub: 'Saurashtra Coast' },
  { name: 'Ahmedabad', slug: 'ahmedabad', district: 'Ahmedabad', tier: 1, hub: 'Central Gujarat & Airport' },
  { name: 'Surat', slug: 'surat', district: 'Surat', tier: 1, hub: 'South Gujarat' },
  { name: 'Vadodara', slug: 'vadodara', district: 'Vadodara', tier: 1, hub: 'Central Gujarat' },
  { name: 'Rajkot', slug: 'rajkot', district: 'Rajkot', tier: 1, hub: 'Saurashtra Hub' },
  { name: 'Gandhinagar', slug: 'gandhinagar', district: 'Gandhinagar', tier: 1, hub: 'State Capital' },
  { name: 'Jamnagar', slug: 'jamnagar', district: 'Jamnagar', tier: 2, hub: 'Reliance / Coast' },
  { name: 'Junagadh', slug: 'junagadh', district: 'Junagadh', tier: 2, hub: 'Girnar Region' },
  { name: 'Anand', slug: 'anand', district: 'Anand', tier: 2, hub: 'Milk City' },
  { name: 'Bharuch', slug: 'bharuch', district: 'Bharuch', tier: 2, hub: 'Narmada Corridor' },
  { name: 'Navsari', slug: 'navsari', district: 'Navsari', tier: 2, hub: 'South Gujarat' },
  { name: 'Morbi', slug: 'morbi', district: 'Morbi', tier: 2, hub: 'Ceramics Hub' },
  { name: 'Surendranagar', slug: 'surendranagar', district: 'Surendranagar', tier: 2, hub: 'Zalawad Region' },
  { name: 'Gandhidham', slug: 'gandhidham', district: 'Kutch', tier: 2, hub: 'Kutch Port' },
  { name: 'Nadiad', slug: 'nadiad', district: 'Kheda', tier: 2, hub: 'Charotar Hub' },
  { name: 'Porbandar', slug: 'porbandar', district: 'Porbandar', tier: 2, hub: 'Coastal Saurashtra' },
  { name: 'Mehsana', slug: 'mehsana', district: 'Mehsana', tier: 2, hub: 'North Gujarat' },
  { name: 'Bhuj', slug: 'bhuj', district: 'Kutch', tier: 2, hub: 'Kutch Hub' },
  { name: 'Veraval', slug: 'veraval', district: 'Gir Somnath', tier: 2, hub: 'Somnath Coast' },
  { name: 'Vapi', slug: 'vapi', district: 'Valsad', tier: 2, hub: 'Industrial South' },
  { name: 'Valsad', slug: 'valsad', district: 'Valsad', tier: 2, hub: 'South Coast' },
  { name: 'Godhra', slug: 'godhra', district: 'Panchmahal', tier: 2, hub: 'East Gujarat' },
  { name: 'Palanpur', slug: 'palanpur', district: 'Banaskantha', tier: 2, hub: 'North Border' },
  { name: 'Patan', slug: 'patan', district: 'Patan', tier: 2, hub: 'Heritage North' },
  { name: 'Botad', slug: 'botad', district: 'Botad', tier: 2, hub: 'Salangpur Region' },
  { name: 'Amreli', slug: 'amreli', district: 'Amreli', tier: 2, hub: 'Gir Belt' },
  { name: 'Gondal', slug: 'gondal', district: 'Rajkot', tier: 2, hub: 'Saurashtra Corridor' },
  { name: 'Dahod', slug: 'dahod', district: 'Dahod', tier: 2, hub: 'Tribal Gateway' },
  { name: 'Himmatnagar', slug: 'himmatnagar', district: 'Sabarkantha', tier: 2, hub: 'North Corridor' },
  { name: 'Ankleshwar', slug: 'ankleshwar', district: 'Bharuch', tier: 2, hub: 'Chemical Hub' },
  { name: 'Dholera', slug: 'dholera', district: 'Ahmedabad', tier: 3, hub: 'Dholera SIR' },
  { name: 'Palitana', slug: 'palitana', district: 'Bhavnagar', tier: 3, hub: 'Shatrunjaya Pilgrimage' },
  { name: 'Mahuva', slug: 'mahuva', district: 'Bhavnagar', tier: 3, hub: 'Coconut City' },
  { name: 'Sihor', slug: 'sihor', district: 'Bhavnagar', tier: 3, hub: 'GIDC Industrial' },
  { name: 'Talaja', slug: 'talaja', district: 'Bhavnagar', tier: 3, hub: 'Coastal Highway' },
  { name: 'Somnath', slug: 'somnath', district: 'Gir Somnath', tier: 3, hub: 'Jyotirlinga Temple' },
  { name: 'Dwarka', slug: 'dwarka', district: 'Devbhumi Dwarka', tier: 3, hub: 'Char Dham Pilgrimage' },
  { name: 'Diu', slug: 'diu', district: 'Diu Union Territory', tier: 3, hub: 'Beach Resort' },
  { name: 'Mumbai', slug: 'mumbai', district: 'Maharashtra', tier: 1, hub: 'Metropolitan & BOM Airport' }
];

export const POPULAR_FEATURED_ROUTES = [];

// Helper: Normalize string to slug
export const slugify = (text) => {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Helper: Find city by name or slug
export const findCityBySlug = (slug) => {
  const clean = slugify(slug);
  return GUJARAT_PRIMARY_CITIES.find(c => slugify(c.name) === clean || c.slug === clean) || null;
};

// Helper: Parse route slug "bhavnagar-to-ahmedabad" -> { from: "Bhavnagar", to: "Ahmedabad" }
export const parseRouteSlug = (slug) => {
  if (!slug || typeof slug !== 'string') return null;
  const parts = slug.split('-to-');
  if (parts.length !== 2) return null;
  
  const fromCity = findCityBySlug(parts[0]);
  const toCity = findCityBySlug(parts[1]);

  const fromName = fromCity ? fromCity.name : parts[0].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const toName = toCity ? toCity.name : parts[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return { from: fromName, to: toName, fromSlug: parts[0], toSlug: parts[1] };
};

// Helper: Find exact route configured by Admin in MySQL — NEVER guess or auto-generate
export const calculateRouteEstimate = (from, to, customRoutes = []) => {
  if (!from || !to) return null;

  // Check custom admin routes from MySQL
  if (Array.isArray(customRoutes) && customRoutes.length > 0) {
    const fLower = from.toLowerCase().trim();
    const tLower = to.toLowerCase().trim();

    const matched = customRoutes.find(r => {
      if (!r || !r.pickup || !r.dropoff) return false;
      const pLower = r.pickup.toLowerCase().trim();
      const dLower = r.dropoff.toLowerCase().trim();
      return (pLower === fLower && dLower === tLower) ||
             (pLower === tLower && dLower === fLower) ||
             (pLower.includes(fLower) && dLower.includes(tLower)) ||
             (pLower.includes(tLower) && dLower.includes(fLower)) ||
             (fLower.includes(pLower) && tLower.includes(dLower));
    });

    if (matched) {
      return {
        distanceKm: matched.distanceKm ? Number(matched.distanceKm) : 0,
        duration: matched.duration || '',
        baseFare: matched.price !== undefined && matched.price !== null ? Number(matched.price) : 0,
        highway: matched.highway || 'Direct Route',
        car_prices: matched.car_prices || {}
      };
    }
  }

  // Strictly return null if no admin route exists in MySQL
  return null;
};

// Generates high-intent search keywords for a specific route
export const generateRouteKeywords = (from, to) => {
  return [
    `${from} to ${to} taxi`,
    `${from} to ${to} cab`,
    `${from} to ${to} one way cab`,
    `${from} to ${to} taxi fare`,
    `${from} to ${to} car rental`,
    `${from} to ${to} cab booking`,
    `${from} to ${to} outstation taxi`,
    `${from} to ${to} round trip cab`,
    `cheap taxi ${from} to ${to}`,
    `best cab service ${from} to ${to}`,
    `${from} to ${to} airport taxi`,
    `${from} thi ${to} cab service`,
    `book cab ${from} to ${to}`,
    `private taxi ${from} to ${to}`,
    `7 seater car ${from} to ${to}`,
    `innova taxi ${from} to ${to}`,
    `swift dzire cab ${from} to ${to}`,
    `${to} to ${from} return cab`,
    `direct taxi from ${from} to ${to}`,
    `emperial cabs ${from} to ${to}`
  ];
};

// Generates city-level search keywords
export const generateCityKeywords = (city) => {
  return [
    `taxi service in ${city}`,
    `cab booking in ${city}`,
    `best taxi in ${city}`,
    `outstation cab service ${city}`,
    `one way cab ${city}`,
    `${city} taxi contact number`,
    `airport taxi service ${city}`,
    `car hire in ${city}`,
    `24 hour taxi ${city}`,
    `reliable cab operator ${city}`,
    `${city} to ahmedabad taxi`,
    `${city} to mumbai cab`,
    `local sightseeing cab ${city}`,
    `corporate cab booking ${city}`,
    `emperial cabs ${city}`
  ];
};
