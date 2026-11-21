import { convertCurrency } from '../engine/calculations';
import type { Currency } from '../engine/types';

/**
 * Formats a USD-denominated amount into the active display currency (SGD or USD).
 * Negative numbers are rendered in accounting brackets, e.g. (USD 1,250).
 */
export function formatMoney(
  amountUsd: number,
  currency: Currency,
  exchangeRate: number,
  decimals = 0
): string {
  const converted = convertCurrency(amountUsd, currency, exchangeRate);
  const absVal = Math.abs(converted);
  const formatted = new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(absVal);

  if (converted < -0.0001) {
    return `(${currency} ${formatted})`;
  }
  return `${currency} ${formatted}`;
}

/**
 * Formats a compact currency value for chart axes (e.g. SGD 12k or (SGD 5k)).
 */
export function formatCompactMoney(
  amountUsd: number,
  currency: Currency,
  exchangeRate: number
): string {
  const converted = convertCurrency(amountUsd, currency, exchangeRate);
  const absVal = Math.abs(converted);
  const formatted =
    absVal >= 1_000_000
      ? `${(absVal / 1_000_000).toFixed(1)}M`
      : absVal >= 1_000
        ? `${(absVal / 1_000).toFixed(0)}k`
        : `${absVal.toFixed(0)}`;

  if (converted < -0.0001) {
    return `(${currency} ${formatted})`;
  }
  return `${currency} ${formatted}`;
}

export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number, decimals = 1): string {
  const absVal = Math.abs(value);
  const formatted = absVal.toFixed(decimals);
  if (value < -0.0001) {
    return `(${formatted}%)`;
  }
  return `${formatted}%`;
}
