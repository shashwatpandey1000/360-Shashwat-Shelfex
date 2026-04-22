'use client';

import { MapPin } from 'lucide-react';
import type { AddressData } from './PlacesAutocomplete';

interface AddressSummaryProps {
  address: AddressData;
}

export default function AddressSummary({ address }: AddressSummaryProps) {
  if (!address.city) return null;

  const primaryLine = [address.street, address.city, address.state, address.postalCode]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="mt-2 flex items-start gap-2 text-sm">
      <MapPin size={14} className="mt-0.5 shrink-0 text-brand-purple" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-brand">{primaryLine}</div>
        <div className="font-mono text-[11px] text-gray-400 dark:text-gray-500">
          {address.country}
          {address.lat ? ` · ${address.lat.toFixed(5)}, ${address.lng.toFixed(5)}` : ''}
        </div>
      </div>
    </div>
  );
}
