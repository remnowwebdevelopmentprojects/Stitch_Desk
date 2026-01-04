/**
 * Format a number as Indian Rupees (₹)
 * @param amount - The amount to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string with ₹ symbol
 */
export const formatCurrency = (amount: number | string | null | undefined, decimals: number = 2): string => {
  const numAmount = Number(amount || 0)
  return `₹${numAmount.toFixed(decimals)}`
}

/**
 * Format a number as Indian Rupees without decimal places
 * @param amount - The amount to format
 * @returns Formatted string with ₹ symbol (no decimals)
 */
export const formatCurrencyWhole = (amount: number | string | null | undefined): string => {
  const numAmount = Number(amount || 0)
  return `₹${Math.round(numAmount)}`
}

