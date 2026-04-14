'use client';

import Loader from '@/components/common/utility/loader';
import React, { useState, useCallback, useEffect } from 'react';
import {
  GoogleMap,
  useJsApiLoader,
  MarkerF,
  OverlayView,
  OverlayViewF,
} from '@react-google-maps/api';
import { GOOGLE_MAPS_CONFIG } from '@/lib/google-maps';

interface StoreRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  address: { street?: string; city?: string; state?: string; country?: string } | null;
  location: { latitude?: number; longitude?: number } | null;
  contactPhone: string | null;
}

interface MapViewProps {
  data: StoreRow[];
  isLoading: boolean;
}

const containerStyle = { width: '100%', height: '100%' };
const defaultCenter = { lat: 28.6139, lng: 77.209 };

const mapStyles = [
  { featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#f7f7f7' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#d0e3b4' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#bde6ab' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: '#ffe15f' }] },
  { featureType: 'road.arterial', elementType: 'geometry.fill', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.local', elementType: 'geometry.fill', stylers: [{ color: 'black' }] },
  { featureType: 'water', elementType: 'geometry.fill', stylers: [{ color: '#aadaff' }] },
];

const customIcon = {
  path: 'M -16 -16 L 16 -16 L 16 16 L 4 16 L 0 22 L -4 16 L -16 16 Z',
  fillColor: '#a121c2',
  fillOpacity: 1,
  strokeWeight: 2,
  strokeColor: 'white',
  scale: 1,
  labelOrigin: { x: 0, y: 0 },
  anchor: { x: 0, y: 22 },
};

const MapView = ({ data, isLoading }: MapViewProps) => {
  const { isLoaded } = useJsApiLoader(GOOGLE_MAPS_CONFIG);

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  const onLoad = useCallback((map: google.maps.Map) => setMap(map), []);
  const onUnmount = useCallback(() => setMap(null), []);

  const getLatLng = (store: StoreRow) => {
    const loc = store.location as any;
    if (!loc) return null;
    const lat = Number(loc.latitude);
    const lng = Number(loc.longitude);
    if (!lat || !lng) return null;
    return { lat, lng };
  };

  useEffect(() => {
    if (!map || !data || data.length === 0) return;

    const bounds = new window.google.maps.LatLngBounds();
    let hasValid = false;

    data.forEach((store) => {
      const pos = getLatLng(store);
      if (pos) {
        bounds.extend(pos);
        hasValid = true;
      }
    });

    if (hasValid) {
      map.fitBounds(bounds);
      if (data.length === 1) {
        const listener = map.addListener('idle', () => {
          map.setZoom(14);
          google.maps.event.removeListener(listener);
        });
      }
    }
  }, [map, data]);

  if (isLoading || !isLoaded) {
    return (
      <div className="mt-2 flex h-[70vh] w-full items-center justify-center bg-gray-100">
        <Loader />
      </div>
    );
  }

  const storesWithLocation = data.filter((s) => getLatLng(s) !== null);

  if (storesWithLocation.length === 0) {
    return (
      <div className="mt-2 flex h-[70vh] w-full items-center justify-center bg-gray-100">
        <p className="text-sm text-gray-500">No stores with location data to display on map.</p>
      </div>
    );
  }

  return (
    <div className="mt-2 h-[70vh] w-full bg-gray-100">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={defaultCenter}
        zoom={14}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={() => setSelectedStoreId(null)}
        options={{
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
          styles: mapStyles,
          gestureHandling: 'cooperative',
        }}
      >
        {storesWithLocation.map((store) => {
          const pos = getLatLng(store)!;
          const isSelected = selectedStoreId === store.id;
          const addr = store.address as any;

          if (isSelected) {
            return (
              <OverlayViewF
                key={store.id}
                position={pos}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                getPixelPositionOffset={(width, height) => ({
                  x: -(width / 2),
                  y: -height - 10,
                })}
              >
                <div
                  className="relative z-50 flex cursor-pointer flex-col items-center drop-shadow-lg"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex w-64 flex-col border-x border-t border-white bg-black p-4 text-white shadow-xl">
                    <div className="flex gap-2">
                      <h3 className="mb-2 text-base font-bold leading-tight">{store.name}</h3>
                      <span
                        className={`inline-block h-max px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          store.status === 'active'
                            ? 'bg-green-500 text-black'
                            : store.status === 'pending_tour'
                              ? 'bg-yellow-400 text-black'
                              : 'bg-red-500 text-black'
                        }`}
                      >
                        {store.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs text-gray-300">
                      {addr?.city && (
                        <p>
                          <span className="font-semibold text-gray-400">City:</span> {addr.city}
                        </p>
                      )}
                      <p>
                        <span className="font-semibold text-gray-400">Slug:</span> {store.slug}
                      </p>
                    </div>
                  </div>
                  <div
                    style={{
                      width: 0,
                      height: 0,
                      borderLeft: '10px solid transparent',
                      borderRight: '10px solid transparent',
                      borderTop: '10px solid black',
                    }}
                  />
                </div>
              </OverlayViewF>
            );
          }

          return (
            <MarkerF
              key={store.id}
              position={pos}
              title={store.name}
              icon={customIcon as google.maps.Symbol}
              zIndex={1}
              onClick={() => setSelectedStoreId(store.id)}
            />
          );
        })}
      </GoogleMap>
    </div>
  );
};

export default MapView;