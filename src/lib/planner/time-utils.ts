export function formatTime(date: Date): string {
  return date.toLocaleTimeString('de-CH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('de-CH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDateDDMMYYYY(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
}

export function formatTimeHHMM(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function differenceInMinutes(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60));
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function timeStringToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function getTimeString(date: Date): string {
  return formatTimeHHMM(date);
}

export function durationString(minutes: number): string {
  if (minutes < 60) return `${minutes} Min.`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h} Std.`;
  return `${h} Std. ${m} Min.`;
}
