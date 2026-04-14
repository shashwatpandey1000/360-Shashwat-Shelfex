// Shared Google Maps loader config
export const GOOGLE_MAPS_CONFIG = {
  id: 'google-maps-loader',
  googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  libraries: ['places'] as ('places')[],
};
