export function calculateSafeDailyLimit(
  remainingFlexibleMoney: number,
  remainingDays: number
) {
  if (remainingDays <= 0) return remainingFlexibleMoney;
  return Math.floor(remainingFlexibleMoney / remainingDays);
}

export function calculatePercentage(used: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((used / total) * 100);
}