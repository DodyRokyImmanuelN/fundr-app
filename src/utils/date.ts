export function getTodayISODate() {
  return new Date().toISOString().slice(0, 10);
}

export function getNowISOString() {
  return new Date().toISOString();
}

export function getRemainingDays(endDate: string) {
  const today = new Date(getTodayISODate());
  const end = new Date(endDate);

  const diffTime = end.getTime() - today.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(diffDays + 1, 1);
}