'use client';

import type { AddressData } from './PlacesAutocomplete';

interface AddressSummaryProps {
  address: AddressData;
}

export default function AddressSummary({ address }: AddressSummaryProps) {
  if (!address.city) return null;

  return (
    <div className="space-y-1 border bg-gray-50 p-3 text-sm text-gray-600">
      {address.street && <div>{address.street}</div>}
      <div>
        {[address.city, address.state, address.postalCode].filter(Boolean).join(', ')}
      </div>
      <div className="font-mono text-xs text-gray-400">
        {address.country}
        {address.lat ? ` · ${address.lat.toFixed(5)}, ${address.lng.toFixed(5)}` : ''}
      </div>
    </div>
  );
}
