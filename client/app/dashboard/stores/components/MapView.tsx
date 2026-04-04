"use client";

import Loader from "@/components/common/utility/loader";
import React, { useState, useCallback, useEffect } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  MarkerF,
  OverlayView,
  OverlayViewF,
} from "@react-google-maps/api";

interface Store {
  id: number;
  shopId: string;
  companyShopId: string;
  routeId: string;
  storeName: string;
  cityName: string;
  retailerName: string | null;
  latitude: number;
  longitude: number;
  status: string;
  [key: string]: any;
}

interface MapViewProps {
  data: Store[];
  isLoading: boolean;
}

const containerStyle = {
  width: "100%",
  height: "100%",
};

const defaultCenter = {
  lat: 28.6139,
  lng: 77.209,
};

const mapStyles = [
  {
    featureType: "poi",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "transit",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "landscape.man_made",
    elementType: "geometry",
    stylers: [{ color: "#f7f7f7" }],
  },
  {
    featureType: "landscape.natural",
    elementType: "geometry",
    stylers: [{ color: "#d0e3b4" }],
  },
  {
    featureType: "landscape.natural.terrain",
    elementType: "geometry",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#bde6ab" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "road",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.fill",
    stylers: [{ color: "#ffe15f" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#efd151" }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry.fill",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "road.local",
    elementType: "geometry.fill",
    stylers: [{ color: "black" }],
  },
  {
    featureType: "water",
    elementType: "geometry.fill",
    stylers: [{ color: "#aadaff" }],
  },
  {
    featureType: "all",
    elementType: "labels.text.fill",
    stylers: [{ color: "#333333" }],
  },
  {
    featureType: "all",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#ffffff" }, { weight: 5 }],
  },
];

const customIcon = {
  path: "M -16 -16 L 16 -16 L 16 16 L 4 16 L 0 22 L -4 16 L -16 16 Z",
  fillColor: "#a121c2",
  fillOpacity: 1,
  strokeWeight: 2,
  strokeColor: "white",
  scale: 1,
  labelOrigin: { x: 0, y: 0 },
  anchor: { x: 0, y: 22 },
};

const MapView = ({ data, isLoading }: MapViewProps) => {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);

  const onLoad = useCallback(function callback(map: google.maps.Map) {
    setMap(map);
  }, []);

  const onUnmount = useCallback(function callback() {
    setMap(null);
  }, []);

  useEffect(() => {
    if (map && data && data.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      let hasValidLocation = false;

      data.forEach((store) => {
        if (store.latitude && store.longitude) {
          bounds.extend({ lat: store.latitude, lng: store.longitude });
          hasValidLocation = true;
        }
      });

      if (hasValidLocation) {
        map.fitBounds(bounds);

        if (data.length === 1) {
          const listener = map.addListener("idle", () => {
            map.setZoom(14);
            google.maps.event.removeListener(listener);
          });
        }
      }
    }
  }, [map, data]);

  const handleMapClick = () => {
    setSelectedStoreId(null);
  };

  if (isLoading) {
    return (
      <div className="mt-2 flex h-[70vh] w-full items-center justify-center bg-gray-100">
        <Loader className="h-7! w-7!" />
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="mt-2 flex h-[70vh] w-full items-center justify-center bg-gray-100">
        <Loader className="h-7! w-7!" />
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
        onClick={handleMapClick}
        options={{
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
          styles: mapStyles,
          gestureHandling: "cooperative",
        }}
      >
        {data.map((store) => {
          if (!store.latitude || !store.longitude) return null;

          const isSelected = selectedStoreId === store.id;

          if (isSelected) {
            return (
              <OverlayViewF
                key={store.id}
                position={{ lat: store.latitude, lng: store.longitude }}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                getPixelPositionOffset={(width, height) => ({
                  x: -(width / 2),
                  y: -height - 10,
                })}
              >
                <div
                  className="relative z-50 flex cursor-pointer flex-col items-center drop-shadow-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <div className="flex w-64 flex-col border-x border-t border-white bg-black p-4 text-white shadow-xl">
                    <div className="flex gap-2">
                      <h3 className="mb-2 text-base leading-tight font-bold">{store.storeName}</h3>
                      <span
                        className={`inline-block h-max px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase ${
                          store.status === "active"
                            ? "bg-green-500 text-black"
                            : "bg-red-500 text-black"
                        }`}
                      >
                        {store.status}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs text-gray-300">
                      <p>
                        <span className="font-semibold text-gray-400">ID:</span>{" "}
                        {store.companyShopId}
                      </p>
                      <p>
                        <span className="font-semibold text-gray-400">City:</span> {store.cityName}
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      width: 0,
                      height: 0,
                      borderLeft: "10px solid transparent",
                      borderRight: "10px solid transparent",
                      borderTop: "10px solid black",
                    }}
                  />
                </div>
              </OverlayViewF>
            );
          }

          return (
            <MarkerF
              key={store.id}
              position={{ lat: store.latitude, lng: store.longitude }}
              title={store.storeName}
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
