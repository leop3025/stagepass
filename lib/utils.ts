import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  const asNumber = Number(value) || 0;
  const absoluteValue = Math.abs(asNumber);
  const normalizedValue =
    absoluteValue >= 10000 && absoluteValue % 100 === 0 ? asNumber / 100 : asNumber;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(normalizedValue);
}

export const formatINR = formatCurrency;

export function bookingReference() {
  const n = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `SP-${n}`;
}

export const HOLD_MINUTES = 10;
export const WAITLIST_OFFER_MINUTES = 15;
export const MAX_SEATS = 8;
