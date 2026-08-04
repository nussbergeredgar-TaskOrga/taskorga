export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function addDays(date: Date | number, days: number): Date {
  const base = typeof date === "number" ? date : date.getTime();
  return new Date(base + days * MS_PER_DAY);
}
