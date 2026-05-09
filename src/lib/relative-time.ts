// Pure relative-time formatter — "5 min ago", "2 hr ago", "3 d ago".
// No external lib. Locale-aware via the labels parameter so every script
// renders correctly without bundling a fat library like date-fns.

export interface RelativeLabels {
  justNow: string;
  minutesAgo: string;
  hoursAgo: string;
  daysAgo: string;
}

export function formatRelative(when: Date | string, labels: RelativeLabels, now: Date = new Date()): string {
  const d = typeof when === "string" ? new Date(when) : when;
  const seconds = Math.max(0, Math.floor((now.getTime() - d.getTime()) / 1000));
  if (seconds < 45) return labels.justNow;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} ${labels.minutesAgo}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${labels.hoursAgo}`;
  const days = Math.floor(hours / 24);
  return `${days} ${labels.daysAgo}`;
}
