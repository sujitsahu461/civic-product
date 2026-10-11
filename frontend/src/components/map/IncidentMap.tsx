import React, { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Complaint } from '../../types/complaint';
import Badge from '../../components/ui/Badge';
import Icon from '../../components/ui/Icon';
import { showToast } from '../../components/ui/Toast';
import useAuthStore from '../../store/authStore';
import {
  smartDetectGps,
  MAP_TILE_LAYERS,
  INDIA_MAP_CENTER,
  INDIA_DEFAULT_ZOOM,
  TileLayerKey,
} from '../../config/mapConfig';
import { formatDate, truncateText } from '../../utils/formatters';
import s from './IncidentMap.module.css';

// Fix default leaflet marker asset issue in bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Auto-resize invalidator helper for seamless and smooth container rendering
const AutoInvalidateSize: React.FC = () => {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 50);
    const t2 = setTimeout(() => map.invalidateSize(), 150);
    const t3 = setTimeout(() => map.invalidateSize(), 400);
    const t4 = setTimeout(() => map.invalidateSize(), 800);

    const onResize = () => map.invalidateSize();
    window.addEventListener('resize', onResize);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      window.removeEventListener('resize', onResize);
    };
  }, [map]);
  return null;
};


interface IncidentMapProps {
  complaints: Complaint[];
  selectedComplaintId?: string | null;
  onSelectComplaint?: (complaint: Complaint) => void;
  center?: [number, number];
  zoom?: number;
  height?: string;
  interactive?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  ROAD: '#3b82f6',
  WATER: '#06b6d4',
  ELECTRICITY: '#f59e0b',
  GARBAGE: '#10b981',
  SANITATION: '#10b981',
  DRAINAGE: '#6366f1',
  PARKS: '#22c55e',
  TRAFFIC: '#f43f5e',
  STREET_LIGHT: '#eab308',
  NOISE_POLLUTION: '#ec4899',
  OTHER: '#a855f7',
};

// Create dynamic SVG DivIcon for each complaint marker
const createCustomMarkerIcon = (category: string, priority: string, status: string, isSelected: boolean) => {
  const color = CATEGORY_COLORS[category] || '#6366f1';
  const isUrgent = priority === 'URGENT';
  const isResolved = status === 'RESOLVED';

  const pulseClass = isUrgent ? s.urgentPulse : '';
  const selectedClass = isSelected ? s.selectedMarker : '';
  const resolvedClass = isResolved ? s.resolvedMarker : '';

  const html = `
    <div class="${s.markerWrapper} ${pulseClass} ${selectedClass} ${resolvedClass}" style="--marker-color: ${color}">
      <div class="${s.markerPin}">
        <span class="${s.markerDot}"></span>
      </div>
      <div class="${s.markerRing}"></div>
    </div>
  `;

  return L.divIcon({
    className: 'custom-incident-marker',
    html,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

// Recenter and zoom flight component
const MapRecenter: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.0 });
  }, [center, zoom, map]);
  return null;
};

// Auto-fit bounds to all markers on initial load or cluster change
const FitBoundsToMarkers: React.FC<{
  complaints: Complaint[];
  selectedComplaintId?: string | null;
}> = ({ complaints, selectedComplaintId }) => {
  const map = useMap();
  const hasFittedRef = useRef<boolean>(false);

  useEffect(() => {
    if (selectedComplaintId) return; // Don't disrupt selected incident inspection
    const valid = complaints.filter(
      (c) =>
        c.latitude !== null &&
        c.longitude !== null &&
        !isNaN(Number(c.latitude)) &&
        !isNaN(Number(c.longitude))
    );

    if (valid.length > 0 && !hasFittedRef.current) {
      const latLngs = valid.map((c) => [Number(c.latitude), Number(c.longitude)] as [number, number]);
      if (latLngs.length === 1) {
        map.flyTo(latLngs[0], 14, { duration: 1.0 });
      } else {
        const bounds = L.latLngBounds(latLngs);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
      hasFittedRef.current = true;
    }
  }, [complaints, selectedComplaintId, map]);

  return null;
};

// Fly directly to selected complaint
const FlyToSelected: React.FC<{ selectedComplaint?: Complaint | null }> = ({ selectedComplaint }) => {
  const map = useMap();
  useEffect(() => {
    if (
      selectedComplaint &&
      selectedComplaint.latitude !== null &&
      selectedComplaint.longitude !== null &&
      !isNaN(Number(selectedComplaint.latitude)) &&
      !isNaN(Number(selectedComplaint.longitude))
    ) {
      map.flyTo(
        [Number(selectedComplaint.latitude), Number(selectedComplaint.longitude)],
        16,
        { duration: 1.0 }
      );
    }
  }, [selectedComplaint, map]);
  return null;
};

export const IncidentMap: React.FC<IncidentMapProps> = ({
  complaints,
  selectedComplaintId,
  onSelectComplaint,
  center,
  zoom,
  height = '500px',
  interactive = true,
}) => {
  // Filter complaints that have valid coordinates
  const geocodedComplaints = useMemo(
    () =>
      complaints.filter(
        (c) =>
          c.latitude !== null &&
          c.longitude !== null &&
          !isNaN(Number(c.latitude)) &&
          !isNaN(Number(c.longitude))
      ),
    [complaints]
  );

  // Calculate intelligent centroid of complaints or default to India map center
  const defaultCenter = useMemo<[number, number]>(() => {
    if (center) return center;
    if (geocodedComplaints.length > 0) {
      const sumLat = geocodedComplaints.reduce((acc, c) => acc + Number(c.latitude), 0);
      const sumLng = geocodedComplaints.reduce((acc, c) => acc + Number(c.longitude), 0);
      return [sumLat / geocodedComplaints.length, sumLng / geocodedComplaints.length];
    }
    // Default to whole India geographic center
    return INDIA_MAP_CENTER;
  }, [center, geocodedComplaints]);

  const defaultZoom = useMemo<number>(() => {
    if (zoom) return zoom;
    if (geocodedComplaints.length > 0) return 13;
    return INDIA_DEFAULT_ZOOM;
  }, [zoom, geocodedComplaints]);

  const { user } = useAuthStore();
  const [mapCenter, setMapCenter] = useState<[number, number]>(defaultCenter);
  const [mapZoom, setMapZoom] = useState<number>(defaultZoom);
  const [activeCluster, setActiveCluster] = useState<string>(
    geocodedComplaints.length > 0 ? 'incidents' : 'india'
  );
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [activeTileLayer, setActiveTileLayer] = useState<TileLayerKey>('osm');

  const currentTileConfig = MAP_TILE_LAYERS[activeTileLayer];

  // Find currently selected complaint
  const selectedComplaint = useMemo(
    () =>
      complaints.find(
        (c) => c.public_id === selectedComplaintId || c.tracking_code === selectedComplaintId
      ) || null,
    [complaints, selectedComplaintId]
  );

  // Sync map center when default center changes
  useEffect(() => {
    if (!selectedComplaintId) {
      setMapCenter(defaultCenter);
      setMapZoom(defaultZoom);
    }
  }, [defaultCenter, defaultZoom, selectedComplaintId]);

  const locateUser = async () => {
    try {
      const res = await smartDetectGps(user?.address);
      const loc: [number, number] = [res.lat, res.lng];
      setUserLocation(loc);
      setMapCenter(loc);
      setMapZoom(res.zoom || 15);
      setActiveCluster('user_gps');
      showToast(res.message, 'success');
    } catch {
      showToast('Could not access current location.', 'warning');
    }
  };

  const jumpToCluster = (clusterKey: string, lat: number, lng: number, targetZoom: number) => {
    setActiveCluster(clusterKey);
    setMapCenter([lat, lng]);
    setMapZoom(targetZoom);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return 'success';
      case 'IN_PROGRESS':
      case 'ASSIGNED':
        return 'authority';
      case 'PENDING':
        return 'warning';
      case 'REJECTED':
      case 'CLOSED':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  return (
    <div className={s.mapContainer} style={{ height }}>
      {/* Map Header Overlay Controls */}
      <div className={s.controlsOverlay}>
        <div className={s.clusterNav}>
          <button
            type="button"
            className={`${s.clusterBtn} ${activeCluster === 'india' ? s.clusterBtnActive : ''}`}
            onClick={() => jumpToCluster('india', INDIA_MAP_CENTER[0], INDIA_MAP_CENTER[1], INDIA_DEFAULT_ZOOM)}
            title="Whole India Country View"
          >
            🇮🇳 India
          </button>
          <button
            type="button"
            className={`${s.clusterBtn} ${activeCluster === 'sambalpur' ? s.clusterBtnActive : ''}`}
            onClick={() => jumpToCluster('sambalpur', 21.4669, 83.9812, 14)}
            title="Sambalpur Municipal Corporation"
          >
            Sambalpur
          </button>
          <button
            type="button"
            className={`${s.clusterBtn} ${activeCluster === 'bhubaneswar' ? s.clusterBtnActive : ''}`}
            onClick={() => jumpToCluster('bhubaneswar', 20.296059, 85.82454, 13)}
            title="Bhubaneswar Municipal Corporation"
          >
            Bhubaneswar
          </button>
          <button
            type="button"
            className={`${s.clusterBtn} ${activeCluster === 'delhi' ? s.clusterBtnActive : ''}`}
            onClick={() => jumpToCluster('delhi', 28.6139, 77.209, 12)}
            title="New Delhi Municipal Council"
          >
            New Delhi
          </button>
          <button
            type="button"
            className={`${s.clusterBtn} ${activeCluster === 'mumbai' ? s.clusterBtnActive : ''}`}
            onClick={() => jumpToCluster('mumbai', 19.076, 72.8777, 12)}
            title="Brihanmumbai Municipal Corporation"
          >
            Mumbai
          </button>
          <button
            type="button"
            className={`${s.clusterBtn} ${activeCluster === 'gunupur' ? s.clusterBtnActive : ''}`}
            onClick={() => jumpToCluster('gunupur', 19.047644, 83.834461, 15)}
            title="GIET University / Gunupur Ward"
          >
            Gunupur
          </button>
        </div>

        <button
          type="button"
          className={s.layerBtn}
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

        <button
          type="button"
          className={s.geoBtn}
          onClick={locateUser}
          title="Center on My Live Device GPS Location"
        >
          <Icon name="my_location" size={16} />
          <span>My GPS</span>
        </button>

        <div className={s.legendPill}>
          <span className={s.legendCount}>
            <Icon name="pin_drop" size={14} style={{ color: '#10b981' }} />
            {geocodedComplaints.length} Geocoded
          </span>
        </div>
      </div>

      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        scrollWheelZoom={interactive}
        dragging={interactive}
        className={s.leafletContainer}
      >
        <TileLayer
          key={activeTileLayer}
          attribution={currentTileConfig.attribution}
          url={currentTileConfig.url}
          maxZoom={currentTileConfig.maxZoom}
          subdomains={currentTileConfig.subdomains || 'abc'}
        />

        <AutoInvalidateSize />
        <MapRecenter center={mapCenter} zoom={mapZoom} />
        <FitBoundsToMarkers complaints={geocodedComplaints} selectedComplaintId={selectedComplaintId} />
        <FlyToSelected selectedComplaint={selectedComplaint} />


        {/* User GPS Marker */}
        {userLocation && (
          <Marker
            position={userLocation}
            icon={L.divIcon({
              className: 'custom-user-marker',
              html: `<div class="${s.userGpsPin}"></div>`,
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            })}
          >
            <Popup>
              <div className={s.userPopup}>
                <strong>Your Current GPS Location</strong>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Complaint Incident Markers */}
        {geocodedComplaints.map((c) => {
          const lat = Number(c.latitude);
          const lng = Number(c.longitude);
          const isSelected = selectedComplaintId === c.public_id || selectedComplaintId === c.tracking_code;

          return (
            <Marker
              key={c.public_id || c.tracking_code}
              position={[lat, lng]}
              icon={createCustomMarkerIcon(c.category, c.priority, c.status, isSelected)}
              eventHandlers={{
                click: () => {
                  if (onSelectComplaint) onSelectComplaint(c);
                },
              }}
            >
              <Popup className={s.customPopup}>
                <div className={s.popupCard}>
                  <div className={s.popupHeader}>
                    <span className={s.trackingCode}>{c.tracking_code}</span>
                    <Badge variant={getStatusVariant(c.status)}>{c.status}</Badge>
                  </div>

                  <h4 className={s.popupTitle}>{c.title}</h4>
                  <p className={s.popupDesc}>{truncateText(c.description, 80)}</p>

                  <div className={s.popupMeta}>
                    <span className={s.metaItem}>
                      <Icon name="location_on" size={13} />
                      {truncateText(c.location_address, 35)}
                    </span>
                    <span className={s.metaItem}>
                      <Icon name="pin_drop" size={13} />
                      {lat.toFixed(6)}, {lng.toFixed(6)}
                    </span>
                    <span className={s.metaItem}>
                      <Icon name="schedule" size={13} />
                      {formatDate(c.created_at)}
                    </span>
                  </div>

                  <div className={s.popupFooter}>
                    <span
                      className={s.priorityTag}
                      style={{
                        color:
                          c.priority === 'URGENT'
                            ? '#ef4444'
                            : c.priority === 'HIGH'
                            ? '#fb923c'
                            : '#38bdf8',
                      }}
                    >
                      ● {c.priority} Priority
                    </span>

                    <a
                      href={`/citizen/tracking?code=${c.tracking_code}`}
                      className={s.popupTrackBtn}
                    >
                      <span>Track Details</span>
                      <Icon name="arrow_forward" size={12} />
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default IncidentMap;
