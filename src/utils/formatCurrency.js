// Philippine Peso (PHP) formatting helpers
export const CURRENCY_SYMBOL = '₱';
export const CURRENCY_CODE = 'PHP';

/**
 * Formats a numeric amount into Philippine Peso (₱) string
 * @param {number|string} amount
 * @param {boolean} includeSymbol
 * @returns {string} e.g. "₱1,000" or "1,000"
 */
export const formatPHP = (amount, includeSymbol = true) => {
  const num = Number(amount) || 0;
  const formatted = num.toLocaleString('en-PH', {
    maximumFractionDigits: 2,
  });
  return includeSymbol ? `${CURRENCY_SYMBOL}${formatted}` : formatted;
};

export default formatPHP;
