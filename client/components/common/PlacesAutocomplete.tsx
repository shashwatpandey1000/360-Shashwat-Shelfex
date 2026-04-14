'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { cn } from '@/lib/utils';
import { GOOGLE_MAPS_CONFIG } from '@/lib/google-maps';
import { MapPin } from 'lucide-react';

export interface AddressData {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  formattedAddress: string;
  lat: number;
  lng: number;
}

interface Prediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

interface PlacesAutocompleteProps {
  label?: string;
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
  onSelect: (address: AddressData) => void;
  onChange?: (value: string) => void;
}

export default function PlacesAutocomplete({
  label,
  value,
  placeholder = 'Search for an address...',
  disabled = false,
  error,
  className,
  onSelect,
  onChange,
}: PlacesAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const dummyDivRef = useRef<HTMLDivElement>(null);

  const [inputValue, setInputValue] = useState(value || '');
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  const { isLoaded } = useJsApiLoader(GOOGLE_MAPS_CONFIG);

  // Sync external value
  useEffect(() => {
    if (value !== undefined) setInputValue(value);
  }, [value]);

  // Init services
  useEffect(() => {
    if (!isLoaded) return;
    autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
    if (dummyDivRef.current) {
      placesServiceRef.current = new google.maps.places.PlacesService(dummyDivRef.current);
    }
  }, [isLoaded]);

  // Fetch predictions on input change
  const fetchPredictions = useCallback(
    (input: string) => {
      if (!autocompleteServiceRef.current || input.length < 2) {
        setPredictions([]);
        setShowDropdown(false);
        return;
      }

      setLoading(true);
      autocompleteServiceRef.current.getPlacePredictions(
        { input, types: ['geocode', 'establishment'] },
        (results, status) => {
          setLoading(false);
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            setPredictions(
              results.map((r) => ({
                placeId: r.place_id,
                description: r.description,
                mainText: r.structured_formatting.main_text,
                secondaryText: r.structured_formatting.secondary_text || '',
              })),
            );
            setShowDropdown(true);
          } else {
            setPredictions([]);
            setShowDropdown(false);
          }
        },
      );
    },
    [],
  );

  // Debounce input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue.length >= 2) {
        fetchPredictions(inputValue);
      } else {
        setPredictions([]);
        setShowDropdown(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [inputValue, fetchPredictions]);

  // Select a prediction — get full place details
  const handleSelect = (prediction: Prediction) => {
    if (!placesServiceRef.current) return;

    placesServiceRef.current.getDetails(
      { placeId: prediction.placeId, fields: ['address_components', 'formatted_address', 'geometry'] },
      (place, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !place) return;

        let street = '';
        let city = '';
        let state = '';
        let postalCode = '';
        let country = '';

        for (const component of place.address_components || []) {
          const types = component.types;
          if (types.includes('street_number')) street = component.long_name + ' ' + street;
          if (types.includes('route')) street = street + component.long_name;
          if (types.includes('sublocality_level_1') || types.includes('locality')) {
            if (!city) city = component.long_name;
          }
          if (types.includes('administrative_area_level_1')) state = component.long_name;
          if (types.includes('postal_code')) postalCode = component.long_name;
          if (types.includes('country')) country = component.short_name;
        }

        const address: AddressData = {
          street: street.trim(),
          city,
          state,
          postalCode,
          country,
          formattedAddress: place.formatted_address || '',
          lat: place.geometry?.location?.lat() || 0,
          lng: place.geometry?.location?.lng() || 0,
        };

        setInputValue(place.formatted_address || prediction.description);
        setPredictions([]);
        setShowDropdown(false);
        onSelect(address);
      },
    );
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {/* Hidden div for PlacesService */}
      <div ref={dummyDivRef} style={{ display: 'none' }} />

      {label && (
        <label className="mb-2 block text-[14px] font-medium leading-5 text-[#131313]">
          {label}
        </label>
      )}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          onChange?.(e.target.value);
        }}
        onFocus={() => {
          if (predictions.length > 0) setShowDropdown(true);
        }}
        placeholder={placeholder}
        disabled={disabled || !isLoaded}
        className={cn(
          'flex w-full rounded-none border bg-white px-3 py-2 text-[14px] text-gray-900 placeholder:text-gray-400',
          'transition-all duration-200 hover:border-black focus:border-black focus:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error ? 'border-red-500' : '',
        )}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}

      {/* Custom dropdown — renders inside React tree, no DOM portal issues */}
      {showDropdown && predictions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full border bg-white shadow-lg">
          {predictions.map((p) => (
            <button
              key={p.placeId}
              type="button"
              className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left text-sm hover:bg-gray-100"
              onMouseDown={(e) => {
                // onMouseDown instead of onClick to fire before onBlur
                e.preventDefault();
                handleSelect(p);
              }}
            >
              <MapPin size={14} className="mt-0.5 shrink-0 text-gray-400" />
              <div className="min-w-0">
                <div className="truncate font-medium text-[#131313]">{p.mainText}</div>
                {p.secondaryText && (
                  <div className="truncate text-xs text-gray-500">{p.secondaryText}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}