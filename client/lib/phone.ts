import { AsYouType, parsePhoneNumberFromString } from 'libphonenumber-js';

export function formatPhoneInput(value: string): string {
  const raw = value.trimStart();
  const withPrefix = raw && !raw.startsWith('+') ? `+${raw}` : raw;
  return new AsYouType().input(withPrefix);
}

export function validatePhone(value: string): string | null {
  const phone = value.trim();
  if (!phone) return null;

  if (!phone.startsWith('+')) {
    return 'Include country code, e.g. +91 98765 43210.';
  }

  const parsed = parsePhoneNumberFromString(phone);
  if (!parsed || !parsed.isValid()) {
    return 'Enter a valid international phone number.';
  }

  return null;
}
