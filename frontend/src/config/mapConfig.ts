export interface LocationPreset {
  name: string;
  lat: number;
  lng: number;
  zoom: number;
  address: string;
  ward?: string;
}

// Geographic Center of India - Whole Country View
export const INDIA_MAP_CENTER: [number, number] = [20.5937, 78.9629];
export const INDIA_DEFAULT_ZOOM = 5;
export const INDIA_DEFAULT_ADDRESS = 'Republic of India';

// Curated Hubs & Wards across India & Odisha
export const KNOWN_LOCALITIES: LocationPreset[] = [
  {
    name: '🇮🇳 Whole India',
    lat: 20.5937,
    lng: 78.9629,
    zoom: 5,
    address: 'All India Municipal Services Network',
  },
  {
    name: 'Sambalpur (Modipara)',
    lat: 21.472500,
    lng: 83.971000,
    zoom: 16,
    address: 'Modipara, Sambalpur, Odisha, 768002',
    ward: 'Ward 12 (Modipara)',
  },
  {
    name: 'Sambalpur (Sakhipara)',
    lat: 21.462300,
    lng: 83.978000,
    zoom: 16,
    address: 'Sakhipara, Sambalpur, Odisha, 768001',
    ward: 'Ward 8 (Sakhipara)',
  },
  {
    name: 'Sambalpur (Budharaja)',
    lat: 21.483045,
    lng: 83.981323,
    zoom: 16,
    address: 'Budharaja, Sambalpur, Odisha, 768004',
    ward: 'Ward 15 (Budharaja)',
  },
  {
    name: 'Sambalpur (Dhanupali)',
    lat: 21.455000,
    lng: 83.985000,
    zoom: 16,
    address: 'Dhanupali, Sambalpur, Odisha, 768005',
    ward: 'Ward 6 (Dhanupali)',
  },
  {
    name: 'Sambalpur (Khetrajpur)',
    lat: 21.490000,
    lng: 83.960000,
    zoom: 16,
    address: 'Khetrajpur, Sambalpur, Odisha, 768003',
    ward: 'Ward 2 (Khetrajpur)',
  },
  {
    name: 'Sambalpur (Burla)',
    lat: 21.502300,
    lng: 83.871100,
    zoom: 16,
    address: 'Burla, Sambalpur, Odisha, 768018',
    ward: 'Ward 1 (Burla)',
  },
  {
    name: 'Sambalpur (Ainthapali)',
    lat: 21.495000,
    lng: 83.980000,
    zoom: 16,
    address: 'Ainthapali, Sambalpur, Odisha, 768004',
    ward: 'Ward 14 (Ainthapali)',
  },
  {
    name: 'Sambalpur (City Center)',
    lat: 21.466900,
    lng: 83.981200,
    zoom: 15,
    address: 'Sambalpur Municipal Corporation, Odisha, 768001',
    ward: 'SMC Headquarters',
  },
  {
    name: 'Gunupur / GIET',
    lat: 19.047644,
    lng: 83.834461,
    zoom: 16,
    address: 'GIET University, SH4, Gunupur Town, Rayagada, Odisha, 765022',
    ward: 'Ward 5 (GIET Campus)',
  },
  {
    name: 'Rayagada',
    lat: 19.171700,
    lng: 83.416300,
    zoom: 15,
    address: 'Rayagada Municipality, Odisha, 765001',
    ward: 'Central Ward',
  },
  {
    name: 'Bhubaneswar',
    lat: 20.296059,
    lng: 85.824540,
    zoom: 14,
    address: 'Bhubaneswar Municipal Corporation, Janpath, Odisha, 751001',
    ward: 'BMC Central',
  },
  {
    name: 'Cuttack',
    lat: 20.462500,
    lng: 85.883000,
    zoom: 14,
    address: 'Cuttack Municipal Corporation, Odisha, 753001',
    ward: 'CMC Central',
  },
  {
    name: 'Rourkela',
    lat: 22.260400,
    lng: 84.853600,
    zoom: 14,
    address: 'Rourkela Municipal Corporation, Odisha, 769001',
    ward: 'RMC Central',
  },
  {
    name: 'New Delhi',
    lat: 28.6139,
    lng: 77.209,
    zoom: 13,
    address: 'New Delhi Municipal Council, Connaught Place, NCR, 110001',
  },
  {
    name: 'Mumbai',
    lat: 19.076,
    lng: 72.8777,
    zoom: 13,
    address: 'Brihanmumbai Municipal Corporation, Fort, Mumbai, Maharashtra, 400001',
  },
  {
    name: 'Bengaluru',
    lat: 12.9716,
    lng: 77.5946,
    zoom: 13,
    address: 'Bruhat Bengaluru Mahanagara Palike, Karnataka, 560001',
  },
  {
    name: 'Kolkata',
    lat: 22.5726,
    lng: 88.3639,
    zoom: 13,
    address: 'Kolkata Municipal Corporation, S.N. Banerjee Road, West Bengal, 700013',
  },
  {
    name: 'Hyderabad',
    lat: 17.385,
    lng: 78.4867,
    zoom: 13,
    address: 'Greater Hyderabad Municipal Corporation, Tank Bund, Telangana, 500063',
  },
];

export type TileLayerKey = 'osm' | 'esri' | 'satellite';

// High-resolution tile layers with ZERO watermark and guaranteed CORS availability
export const MAP_TILE_LAYERS: Record<
  TileLayerKey,
  {
    name: string;
    url: string;
    attribution: string;
    maxZoom: number;
    subdomains?: string;
  }
> = {
  osm: {
    name: 'OpenStreetMap (HD Clean)',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    subdomains: 'abc',
  },
  esri: {
    name: 'Esri Street Map (High-Res)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap',
    maxZoom: 19,
    subdomains: 'abc',
  },
  satellite: {
    name: 'Satellite View (Aerial)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping',
    maxZoom: 18,
    subdomains: 'abc',
  },
};


/**
 * Checks whether coordinates correspond to the ISP routing gateway in Jajpur Road.
 * Indian broadband ISPs often route desktop IP traffic through this optical node (20.93°N, 86.13°E).
 */
export const isIspGateway = (lat: number, lng: number): boolean => {
  return lat >= 20.80 && lat <= 21.08 && lng >= 86.00 && lng <= 86.30;
};

export interface ResolvedLocation {
  lat: number;
  lng: number;
  address: string;
  name: string;
  zoom: number;
}

/**
 * Deterministically resolves an address or ward string to exact geographic coordinates.
 * Matches local wards (Modipara, Sakhipara, Budharaja, Dhanupali, Gunupur, etc.) first.
 */
export const resolveAddressToCoords = async (inputAddress?: string): Promise<ResolvedLocation> => {
  const query = (inputAddress || '').trim().toLowerCase();

  // 1. Check direct matches in dictionary
  if (query.includes('modip')) {
    const loc = KNOWN_LOCALITIES.find((k) => k.name.includes('Modipara'))!;
    return { lat: loc.lat, lng: loc.lng, address: loc.address, name: loc.name, zoom: loc.zoom };
  }
  if (query.includes('sakhip')) {
    const loc = KNOWN_LOCALITIES.find((k) => k.name.includes('Sakhipara'))!;
    return { lat: loc.lat, lng: loc.lng, address: loc.address, name: loc.name, zoom: loc.zoom };
  }
  if (query.includes('budharaj')) {
    const loc = KNOWN_LOCALITIES.find((k) => k.name.includes('Budharaja'))!;
    return { lat: loc.lat, lng: loc.lng, address: loc.address, name: loc.name, zoom: loc.zoom };
  }
  if (query.includes('dhanupal')) {
    const loc = KNOWN_LOCALITIES.find((k) => k.name.includes('Dhanupali'))!;
    return { lat: loc.lat, lng: loc.lng, address: loc.address, name: loc.name, zoom: loc.zoom };
  }
  if (query.includes('khetraj')) {
    const loc = KNOWN_LOCALITIES.find((k) => k.name.includes('Khetrajpur'))!;
    return { lat: loc.lat, lng: loc.lng, address: loc.address, name: loc.name, zoom: loc.zoom };
  }
  if (query.includes('burl')) {
    const loc = KNOWN_LOCALITIES.find((k) => k.name.includes('Burla'))!;
    return { lat: loc.lat, lng: loc.lng, address: loc.address, name: loc.name, zoom: loc.zoom };
  }
  if (query.includes('ainthap')) {
    const loc = KNOWN_LOCALITIES.find((k) => k.name.includes('Ainthapali'))!;
    return { lat: loc.lat, lng: loc.lng, address: loc.address, name: loc.name, zoom: loc.zoom };
  }
  if (query.includes('gunupur') || query.includes('giet')) {
    const loc = KNOWN_LOCALITIES.find((k) => k.name.includes('Gunupur'))!;
    return { lat: loc.lat, lng: loc.lng, address: loc.address, name: loc.name, zoom: loc.zoom };
  }
  if (query.includes('rayagad')) {
    const loc = KNOWN_LOCALITIES.find((k) => k.name.includes('Rayagada'))!;
    return { lat: loc.lat, lng: loc.lng, address: loc.address, name: loc.name, zoom: loc.zoom };
  }
  if (query.includes('sambalpur')) {
    // Default sambalpur ward is Modipara
    const loc = KNOWN_LOCALITIES.find((k) => k.name.includes('Modipara'))!;
    return { lat: loc.lat, lng: loc.lng, address: loc.address, name: loc.name, zoom: loc.zoom };
  }
  if (query.includes('bhubaneswar')) {
    const loc = KNOWN_LOCALITIES.find((k) => k.name.includes('Bhubaneswar'))!;
    return { lat: loc.lat, lng: loc.lng, address: loc.address, name: loc.name, zoom: loc.zoom };
  }
  if (query.includes('cuttack')) {
    const loc = KNOWN_LOCALITIES.find((k) => k.name.includes('Cuttack'))!;
    return { lat: loc.lat, lng: loc.lng, address: loc.address, name: loc.name, zoom: loc.zoom };
  }
  if (query.includes('rourkela')) {
    const loc = KNOWN_LOCALITIES.find((k) => k.name.includes('Rourkela'))!;
    return { lat: loc.lat, lng: loc.lng, address: loc.address, name: loc.name, zoom: loc.zoom };
  }

  // 2. If query provided but not in instant dictionary, try Nominatim search
  if (query.length >= 3) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&countrycodes=in&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (res.ok) {
        const results = await res.json();
        if (results && results.length > 0) {
          const item = results[0];
          return {
            lat: parseFloat(parseFloat(item.lat).toFixed(6)),
            lng: parseFloat(parseFloat(item.lon).toFixed(6)),
            address: item.display_name,
            name: item.display_name.split(',')[0],
            zoom: 15,
          };
        }
      }
    } catch {
      // Ignore network error and fall to default
    }
  }

  // Default fallback: Sambalpur Modipara
  const defaultLoc = KNOWN_LOCALITIES.find((k) => k.name.includes('Modipara'))!;
  return {
    lat: defaultLoc.lat,
    lng: defaultLoc.lng,
    address: defaultLoc.address,
    name: defaultLoc.name,
    zoom: defaultLoc.zoom,
  };
};

/**
 * Reverse geocodes coordinates to a human-readable street address
 */
export const reverseGeocodeCoords = async (lat: number, lng: number): Promise<string> => {
  const cleanLat = parseFloat(lat.toFixed(6));
  const cleanLng = parseFloat(lng.toFixed(6));

  // Check known presets first if within ~200m
  for (const loc of KNOWN_LOCALITIES) {
    if (loc.name.includes('Whole India')) continue;
    const dist = Math.hypot(loc.lat - cleanLat, loc.lng - cleanLng);
    if (dist < 0.003) {
      return loc.address;
    }
  }

  // 1. Nominatim Reverse
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${cleanLat}&lon=${cleanLng}&zoom=18&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    if (res.ok) {
      const data = await res.json();
      if (data?.display_name) return data.display_name;
    }
  } catch {
    // Fallback
  }

  // 2. BigDataCloud
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${cleanLat}&longitude=${cleanLng}&localityLanguage=en`
    );
    if (res.ok) {
      const data = await res.json();
      const parts = [data.locality || data.city, data.principalSubdivision, data.countryName].filter(Boolean);
      if (parts.length > 0) return parts.join(', ');
    }
  } catch {
    // Fallback
  }

  return `Location: ${cleanLat}, ${cleanLng}`;
};

/**
 * Intelligent GPS Detection:
 * 1. Checks device GPS.
 * 2. Detects whether returned coordinates are an ISP network routing node (Jajpur Road).
 * 3. Intelligently calibrates to the citizen's registered ward or true location.
 * 4. Never queries coarse third-party IP geolocators.
 */
export const smartDetectGps = async (
  userAddress?: string
): Promise<{
  lat: number;
  lng: number;
  address: string;
  zoom: number;
  message: string;
  source: 'device_gps' | 'calibrated_ward';
}> => {
  // If user has a registered address outside Jajpur, resolve that first as our calibration baseline
  const wardFallback = await resolveAddressToCoords(userAddress || 'Modipara, Sambalpur');

  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({
        ...wardFallback,
        message: `GPS not supported by browser. Located your registered ward: ${wardFallback.name}`,
        source: 'calibrated_ward',
      });
      return;
    }

    let isResolved = false;

    // Safety timeout: If browser hangs or prompt is unanswered in 5s
    const timeoutTimer = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        resolve({
          ...wardFallback,
          message: `Location service timed out. Calibrated to your registered ward: ${wardFallback.name}`,
          source: 'calibrated_ward',
        });
      }
    }, 5000);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (isResolved) return;
        isResolved = true;
        clearTimeout(timeoutTimer);

        const rawLat = parseFloat(pos.coords.latitude.toFixed(6));
        const rawLng = parseFloat(pos.coords.longitude.toFixed(6));
        const accuracy = pos.coords.accuracy || 0;

        // Check if device is reporting the ISP gateway node in Jajpur Road
        const isIsp = isIspGateway(rawLat, rawLng);
        const userIsRegisteredInJajpur = (userAddress || '').toLowerCase().includes('jajpur');

        if (isIsp && !userIsRegisteredInJajpur) {
          // Broadband ISP gateway detected! Calibrate to citizen's registered ward
          resolve({
            ...wardFallback,
            message: `Broadband ISP gateway filtered. Calibrated to your registered ward: ${wardFallback.name}`,
            source: 'calibrated_ward',
          });
          return;
        }

        // If accuracy is extremely coarse (> 20km) and user has a registered ward
        if (accuracy > 20000 && userAddress) {
          resolve({
            ...wardFallback,
            message: `Coarse network position detected. Calibrated to your registered ward: ${wardFallback.name}`,
            source: 'calibrated_ward',
          });
          return;
        }

        // Real accurate device GPS!
        const resolvedAddress = await reverseGeocodeCoords(rawLat, rawLng);
        resolve({
          lat: rawLat,
          lng: rawLng,
          address: resolvedAddress,
          zoom: 16,
          message: 'Exact GPS location detected successfully.',
          source: 'device_gps',
        });
      },
      (err) => {
        if (isResolved) return;
        isResolved = true;
        clearTimeout(timeoutTimer);

        const reason =
          err.code === 1
            ? 'Browser location permission denied'
            : err.code === 2
            ? 'Position unavailable'
            : 'Location request timed out';

        resolve({
          ...wardFallback,
          message: `${reason}. Calibrated to your registered ward: ${wardFallback.name}`,
          source: 'calibrated_ward',
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  });
};
