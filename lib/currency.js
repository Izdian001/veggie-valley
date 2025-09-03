// Centralized currency formatting for Bangladeshi Taka
// Usage: formatBDT(amount) -> e.g., "৳1,234.00"

export const formatBDT = (amount) => {
  const num = Number(amount ?? 0)
  try {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      maximumFractionDigits: 2,
    }).format(isNaN(num) ? 0 : num)
  } catch (_) {
    // Fallback if Intl or locale not available
    const safe = isNaN(num) ? 0 : num
    return `৳${safe.toFixed(2)}`
  }
}
