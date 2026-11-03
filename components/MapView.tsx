'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import type { WasteRecord } from '@/lib/types';

export const CENTER: [number, number] = [19.1907, 99.9315];
export const DEFAULT_ZOOM = 13;

// ⭐ 3 แบบแผนที่
export const TILE_LAYERS = {
  satellite: {
    name: 'ดาวเทียม',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 19
  },
  hybrid: {
    name: 'ดาวเทียม+ถนน',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS',
    maxZoom: 19,
    overlay: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'
  },
  streets: {
    name: 'ถนน',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }
};

type LayerKey = keyof typeof TILE_LAYERS;

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) {
      map.setView(CENTER, DEFAULT_ZOOM);
      return;
    }
    if (points.length === 1) map.setView(points[0], 15);
    else {
      import('leaflet').then(L => {
        map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 16 });
      });
    }
  }, [points, map]);
  return null;
}

interface Props {
  records: WasteRecord[];
  sites?: { id: string; name: string }[];
  height?: string;
  layer?: LayerKey;
  onLayerChange?: (layer: LayerKey) => void;
  showLayerSwitcher?: boolean;
}

export default function MapView({
  records,
  sites = [],
  height = '400px',
  layer: externalLayer,
  onLayerChange,
  showLayerSwitcher = true
}: Props) {
  const [L, setL] = useState<any>(null);
  const [icon, setIcon] = useState<any>(null);
  const [internalLayer, setInternalLayer] = useState<LayerKey>('satellite');

  const layer = externalLayer || internalLayer;
  const setLayer = (key: LayerKey) => {
    setInternalLayer(key);
    onLayerChange?.(key);
  };

  useEffect(() => {
    import('leaflet').then(leaflet => {
      const leafletIcon = leaflet.icon({
        iconUrl:
          'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl:
          'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl:
          'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });
      setL(leaflet);
      setIcon(leafletIcon);
    });
  }, []);

  if (!L || !icon) {
    return (
      <div
        style={{ height }}
        className="rounded-3xl bg-slate-100 animate-pulse flex items-center justify-center"
      >
        <span className="text-slate-400 text-sm">กำลังโหลดแผนที่...</span>
      </div>
    );
  }

  const points: [number, number][] = records
    .filter(r => r.gps_lat != null && r.gps_lng != null)
    .map(r => [r.gps_lat!, r.gps_lng!]);

  const getSiteName = (siteId: string | null) => {
    if (!siteId) return 'ไม่ระบุสถานที่';
    return sites.find(s => s.id === siteId)?.name || 'ไม่ระบุ';
  };

  const tiles = TILE_LAYERS[layer];

  return (
    <div className="relative" style={{ height }}>
      {/* Layer switcher */}
      {showLayerSwitcher && (
        <div className="absolute top-3 right-3 z-[1000] flex gap-1 bg-white/95 backdrop-blur rounded-xl shadow-lg p-1 border border-emerald-100">
          {(Object.keys(TILE_LAYERS) as LayerKey[]).map(key => (
            <button
              key={key}
              type="button"
              onClick={() => setLayer(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                layer === key
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              {TILE_LAYERS[key].name}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-3xl overflow-hidden shadow-lg h-full">
        <MapContainer
          center={CENTER}
          zoom={DEFAULT_ZOOM}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution={tiles.attribution}
            url={tiles.url}
            maxZoom={tiles.maxZoom}
          />

          {/* Overlay สำหรับ hybrid */}
          {layer === 'hybrid' && 'overlay' in tiles && (
            <TileLayer
              url={(tiles as any).overlay}
              attribution=""
              maxZoom={19}
            />
          )}

          {records.map(r => {
            if (r.gps_lat == null || r.gps_lng == null) return null;
            return (
              <Marker
                key={r.id}
                position={[r.gps_lat, r.gps_lng]}
                icon={icon}
              >
                <Popup>
                  <div className="text-sm">
                    <div className="font-bold mb-1">
                      📍 {getSiteName(r.site_id)}
                    </div>
                    <div className="text-xs text-slate-600">
                      📅 {r.record_date}
                    </div>
                    <div className="text-xs text-slate-600">
                      ⚖️ {r.weight_kg.toFixed(1)} กก. ·{' '}
                      {r.volume_m3.toFixed(3)} ม³
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          <FitBounds points={points} />
        </MapContainer>
      </div>
    </div>
  );
}