import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import { showToast } from '../ui/Toast';
import useAuthStore from '../../store/authStore';
import s from './LocationPicker.module.css';

import {
  KNOWN_LOCALITIES,
  INDIA_MAP_CENTER,
  INDIA_DEFAULT_ZOOM,
  INDIA_DEFAULT_ADDRESS,
  MAP_TILE_LAYERS,
  LocationPreset,
  TileLayerKey,
  smartDetectGps,
  resolveAddressToCoords,
  reverseGeocodeCoords,
} from '../../config/mapConfig';

interface LocationPickerProps {
  initialLat?: number | null;
  initialLng?: number | null;
  onLocationSelect: (lat: number, lng: number, address?: string) => void;
  height?: string;
}

// Custom Draggable Pin Icon
const pinIcon = L.divIcon({
  className: 'custom-picker-pin',
  html: `
    <div class="${s.pickerPinWrapper}">
      <div class="${s.pickerPin}"></div>
      <div class="${s.pickerShadow}"></div>
    </div>
  `,
  iconSize: [36, 42],
  iconAnchor: [18, 42],
});

// Click handler helper
const MapEvents: React.FC<{
  onMapClick: (lat: number, lng: number) => void;
}> = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

// Smooth recenter and auto-size invalidator helper
const MapController: React.FC<{
  flyTarget: { center: [number, number]; zoom: number; key: number } | null;
}> = ({ flyTarget }) => {
  const map = useMap();

  useEffect(() => {
    // Invalidate size immediately, and at multiple intervals as layout settles
    map.invalidateSize();
    const timers = [50, 150, 400, 800].map((delay) =>
      setTimeout(() => map.invalidateSize(), delay)
    );

    const onResize = () => map.invalidateSize();
    window.addEventListener('resize', onResize);

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('resize', onResize);
    };
  }, [map]);

  useEffect(() => {
    if (flyTarget) {
      map.flyTo(flyTarget.center, flyTarget.zoom, { duration: 1.0 });
      setTimeout(() => map.invalidateSize(), 80);
    }
  }, [flyTarget, map]);

  return null;
};

export const LocationPicker: React.FC<LocationPickerProps> = ({
  initialLat,
  initialLng,
  onLocationSelect,
  height = '380px',
}) => {
  const { user } = useAuthStore();

  const hasValidInitial =
    initialLat != null &&
    initialLng != null &&
    !isNaN(Number(initialLat)) &&
    !isNaN(Number(initialLng));

  const [position, setPosition] = useState<[number, number]>(() => {
    return hasValidInitial ? [Number(initialLat), Number(initialLng)] : INDIA_MAP_CENTER;
  });

  const [mapZoom, setMapZoom] = useState<number>(() => {
    return hasValidInitial ? 15 : INDIA_DEFAULT_ZOOM;
  });

  const [addressPreview, setAddressPreview] = useState<string>(() => {
    return hasValidInitial ? '' : INDIA_DEFAULT_ADDRESS;
  });

  const [activeTileLayer, setActiveTileLayer] = useState<TileLayerKey>('osm');
  const [flyTarget, setFlyTarget] = useState<{
    center: [number, number];
    zoom: number;
    key: number;
  } | null>(null);

  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(
    hasValidInitial ? null : '🇮🇳 Whole India'
  );

  const markerRef = useRef<any>(null);
  const hasInitializedRef = useRef<boolean>(false);

  // Round coordinates to 6 decimal places (~0.1m precision)
  const roundCoord = (val: number) => parseFloat(val.toFixed(6));

  // Multi-provider reverse geocoding
  const reverseGeocode = useCallback(
    async (lat: number, lng: number) => {
      const cleanLat = roundCoord(lat);
      const cleanLng = roundCoord(lng);
      setIsGeocoding(true);
      const resolvedAddr = await reverseGeocodeCoords(cleanLat, cleanLng);
      setIsGeocoding(false);
      setAddressPreview(resolvedAddr);
      onLocationSelect(cleanLat, cleanLng, resolvedAddr);
    },
    [onLocationSelect]
  );

  // Position change handler (clicking on map)
  const handlePositionChange = useCallback(
    (lat: number, lng: number) => {
      const cleanLat = roundCoord(lat);
      const cleanLng = roundCoord(lng);
      setPosition([cleanLat, cleanLng]);
      setSelectedPreset(null);
      reverseGeocode(cleanLat, cleanLng);
    },
    [reverseGeocode]
  );

  // On mount: initialize coordinates
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    if (
      initialLat != null &&
      initialLng != null &&
      !isNaN(Number(initialLat)) &&
      !isNaN(Number(initialLng))
    ) {
      const cleanLat = roundCoord(Number(initialLat));
      const cleanLng = roundCoord(Number(initialLng));
      setPosition([cleanLat, cleanLng]);
      setMapZoom(15);
      setFlyTarget({ center: [cleanLat, cleanLng], zoom: 15, key: Date.now() });
      reverseGeocode(cleanLat, cleanLng);
    } else {
      // Default to Whole India map view
      setPosition(INDIA_MAP_CENTER);
      setMapZoom(INDIA_DEFAULT_ZOOM);
      setAddressPreview(INDIA_DEFAULT_ADDRESS);
    }
  }, [initialLat, initialLng, reverseGeocode]);

  // Sync when parent changes coordinates explicitly (e.g. typing lat/lng inputs)
  useEffect(() => {
    if (
      initialLat != null &&
      initialLng != null &&
      !isNaN(Number(initialLat)) &&
      !isNaN(Number(initialLng))
    ) {
      const pLat = roundCoord(Number(initialLat));
      const pLng = roundCoord(Number(initialLng));
      if (Math.abs(position[0] - pLat) > 0.00001 || Math.abs(position[1] - pLng) > 0.00001) {
        setPosition([pLat, pLng]);
        setFlyTarget({ center: [pLat, pLng], zoom: 15, key: Date.now() });
      }
    }
  }, [initialLat, initialLng]);

  // Handle marker drag
  const handleDragEnd = () => {
    const marker = markerRef.current;
    if (marker != null) {
      const latlng = marker.getLatLng();
      handlePositionChange(latlng.lat, latlng.lng);
    }
  };

  const userWardName = useMemo(() => {
    if (!user?.address) return 'Modipara';
    const addr = user.address.trim();
    if (addr.toLowerCase().includes('modip')) return 'Modipara';
    if (addr.toLowerCase().includes('sakhip')) return 'Sakhipara';
    if (addr.toLowerCase().includes('budharaj')) return 'Budharaja';
    if (addr.toLowerCase().includes('dhanupal')) return 'Dhanupali';
    if (addr.toLowerCase().includes('gunupur') || addr.toLowerCase().includes('giet')) return 'GIET Gunupur';
    if (addr.length > 20) return addr.slice(0, 18) + '...';
    return addr;
  }, [user?.address]);

  // Teleport pin directly to citizen's registered ward
  const handleLocateMyWard = async () => {
    setIsLocating(true);
    const resolved = await resolveAddressToCoords(user?.address || 'Modipara, Sambalpur');
    const targetZoom = resolved.zoom || 16;
    setPosition([resolved.lat, resolved.lng]);
    setMapZoom(targetZoom);
    setSelectedPreset(resolved.name);
    setAddressPreview(resolved.address);
    setFlyTarget({ center: [resolved.lat, resolved.lng], zoom: targetZoom, key: Date.now() });
    onLocationSelect(resolved.lat, resolved.lng, resolved.address);
    setIsLocating(false);
  };

  // Smart GPS detect (high accuracy with ISP gateway filter)
  const detectGps = async () => {
    setIsLocating(true);
    try {
      const res = await smartDetectGps(user?.address);
      const targetZoom = res.zoom || 16;
      setPosition([res.lat, res.lng]);
      setMapZoom(targetZoom);
      setSelectedPreset(null);
      setAddressPreview(res.address);
      setFlyTarget({ center: [res.lat, res.lng], zoom: targetZoom, key: Date.now() });
      onLocationSelect(res.lat, res.lng, res.address);
    } catch {
      await handleLocateMyWard();
    } finally {
      setIsLocating(false);
    }
  };

  // Reset to Whole India view
  const handleWholeIndia = () => {
    setSelectedPreset('🇮🇳 Whole India');
    setPosition(INDIA_MAP_CENTER);
    setMapZoom(INDIA_DEFAULT_ZOOM);
    setAddressPreview('Republic of India');
    setFlyTarget({ center: INDIA_MAP_CENTER, zoom: INDIA_DEFAULT_ZOOM, key: Date.now() });
    onLocationSelect(INDIA_MAP_CENTER[0], INDIA_MAP_CENTER[1], 'Republic of India');
  };

  // Place search by text across India
  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    // Check known presets first
    const matchedPreset = KNOWN_LOCALITIES.find(
      (loc) =>
        loc.name.toLowerCase().includes(query.toLowerCase()) ||
        loc.address.toLowerCase().includes(query.toLowerCase())
    );

    if (matchedPreset) {
      const targetZoom = matchedPreset.zoom || 15;
      setPosition([matchedPreset.lat, matchedPreset.lng]);
      setMapZoom(targetZoom);
      setSelectedPreset(matchedPreset.name);
      setAddressPreview(matchedPreset.address);
      setFlyTarget({ center: [matchedPreset.lat, matchedPreset.lng], zoom: targetZoom, key: Date.now() });
      onLocationSelect(matchedPreset.lat, matchedPreset.lng, matchedPreset.address);
      return;
    }

    setIsSearching(true);
    try {
      const searchUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query + ', India'
      )}&limit=1`;
      const res = await fetch(searchUrl, {
        headers: { 'Accept-Language': 'en' },
      });
      if (res.ok) {
        const results = await res.json();
        if (results && results.length > 0) {
          const lat = roundCoord(parseFloat(results[0].lat));
          const lng = roundCoord(parseFloat(results[0].lon));
          const addr = results[0].display_name;
          setPosition([lat, lng]);
          setMapZoom(16);
          setSelectedPreset(null);
          setAddressPreview(addr);
          setFlyTarget({ center: [lat, lng], zoom: 16, key: Date.now() });
          onLocationSelect(lat, lng, addr);
          return;
        }
      }

      // Secondary query without country suffix
      const res2 = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (res2.ok) {
        const results2 = await res2.json();
        if (results2 && results2.length > 0) {
          const lat = roundCoord(parseFloat(results2[0].lat));
          const lng = roundCoord(parseFloat(results2[0].lon));
          const addr = results2[0].display_name;
          setPosition([lat, lng]);
          setMapZoom(16);
          setSelectedPreset(null);
          setAddressPreview(addr);
          setFlyTarget({ center: [lat, lng], zoom: 16, key: Date.now() });
          onLocationSelect(lat, lng, addr);
          return;
        }
      }

      showToast(`Could not find "${query}". Please click directly on the India map to place the pin.`, 'warning');
    } catch {
      showToast('Geocoding search failed. Please click directly on the map.', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectPreset = (preset: LocationPreset) => {
    setSelectedPreset(preset.name);
    setPosition([preset.lat, preset.lng]);
    const targetZoom = preset.zoom || 14;
    setMapZoom(targetZoom);
    setAddressPreview(preset.address);
    setFlyTarget({ center: [preset.lat, preset.lng], zoom: targetZoom, key: Date.now() });
    onLocationSelect(preset.lat, preset.lng, preset.address);
  };

  const currentTileConfig = MAP_TILE_LAYERS[activeTileLayer];

  return (
    <div className={s.wrapper}>
      {/* Top Bar: Lat/Lng Display + Whole India Button + Live GPS Detect + Layer Toggle */}
      <div className={s.topBar}>
        <div className={s.topBarLeft}>
          <div className={s.coordsBox}>
            <Icon name="pin_drop" size={16} style={{ color: '#10b981' }} />
            <span className={s.coordsText}>
              Lat: {position[0].toFixed(6)}, Lng: {position[1].toFixed(6)}
            </span>
          </div>

          <button
            type="button"
            className={s.indiaBtn}
            onClick={handleWholeIndia}
            title="Show Whole India Map View"
          >
            <span>🇮🇳 Whole India</span>
          </button>

          <button
            type="button"
            className={s.myWardBtn}
            onClick={handleLocateMyWard}
            title={`Teleport to registered ward: ${user?.address || 'Modipara, Sambalpur'}`}
          >
            <Icon name="home_pin" size={14} />
            <span>📍 My Ward: {userWardName}</span>
          </button>
        </div>

        <div className={s.topBarRight}>
          <button
            type="button"
            className={s.layerToggleBtn}
            onClick={() =>
              setActiveTileLayer((prev) =>
                prev === 'osm' ? 'esri' : prev === 'esri' ? 'satellite' : 'osm'
              )
            }
            title="Switch Map Tile Provider"
          >
            <Icon name="layers" size={14} />
            <span>
              {activeTileLayer === 'osm'
                ? 'OSM Standard HD'
                : activeTileLayer === 'esri'
                ? 'Esri Street Map'
                : 'Satellite View'}
            </span>
          </button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={detectGps}
            isLoading={isLocating}
            leftIcon={<Icon name="my_location" size={14} />}
          >
            Auto-Detect GPS
          </Button>
        </div>
      </div>

      {/* Place Search Bar across India */}
      <div className={s.searchRow}>
        <div className={s.searchInputWrapper}>
          <Icon name="search" size={16} className={s.searchIcon} />
          <input
            type="text"
            className={s.searchInput}
            placeholder="Search any Indian city, landmark, or street (e.g. GIET Gunupur, Sakhipara, Connaught Place)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearchSubmit();
              }
            }}
          />
          {searchQuery && (
            <button
              type="button"
              className={s.searchClearBtn}
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              <Icon name="close" size={14} />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => handleSearchSubmit()}
          className={s.searchBtn}
          disabled={isSearching || !searchQuery.trim()}
        >
          {isSearching ? <span className={s.statusSpinner}></span> : <Icon name="explore" size={14} />}
          <span>Locate</span>
        </button>
      </div>

      {/* Locality & City Quick Presets */}
      <div className={s.presetsRow}>
        <span className={s.presetLabel}>
          <Icon name="near_me" size={12} />
          <span>Hubs:</span>
        </span>
        {KNOWN_LOCALITIES.map((loc) => {
          const isActive = selectedPreset === loc.name;
          return (
            <button
              key={loc.name}
              type="button"
              className={`${s.presetPill} ${isActive ? s.presetPillActive : ''}`}
              onClick={() => handleSelectPreset(loc)}
            >
              {loc.name}
            </button>
          );
        })}
      </div>

      {/* Interactive Leaflet Map Frame */}
      <div className={s.mapFrame} style={{ height }}>
        <MapContainer
          center={position}
          zoom={mapZoom}
          scrollWheelZoom={true}
          className={s.map}
        >
          <TileLayer
            key={activeTileLayer}
            attribution={currentTileConfig.attribution}
            url={currentTileConfig.url}
            maxZoom={currentTileConfig.maxZoom}
            subdomains={currentTileConfig.subdomains || 'abc'}
          />

          <MapController flyTarget={flyTarget} />

          <MapEvents onMapClick={handlePositionChange} />


          <Marker
            draggable={true}
            eventHandlers={{ dragend: handleDragEnd }}
            position={position}
            ref={markerRef}
            icon={pinIcon}
          />
        </MapContainer>

        <div className={s.tipOverlay}>
          <Icon name="touch_app" size={14} />
          <span>Click anywhere in India or drag pin to pinpoint exact site</span>
        </div>
      </div>

      {/* Geocoded Address Preview */}
      <div className={s.addressBox}>
        <Icon name="location_on" size={16} style={{ color: '#38bdf8', marginTop: '2px' }} />
        <span className={s.addressText}>
          {isGeocoding ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span className={s.statusSpinner}></span>
              <span>Resolving street address & jurisdiction...</span>
            </span>
          ) : (
            addressPreview || 'Click anywhere on map or search above to set precise address'
          )}
        </span>
      </div>
    </div>
  );
};

export default LocationPicker;
