export const STORE_PIN_COLOR = '#5b00ff';

export const storeMapStyles = [
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

/**
 * SVG path for the store pin marker (house/tag shape with pointed bottom).
 * Consumers build the final google.maps.Symbol with fillColor = STORE_PIN_COLOR.
 */
export const STORE_PIN_PATH = 'M -16 -16 L 16 -16 L 16 16 L 4 16 L 0 22 L -4 16 L -16 16 Z';
