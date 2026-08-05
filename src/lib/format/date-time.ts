const TURKEY_TIME_ZONE = "Europe/Istanbul";

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TURKEY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const chatDateFormatter = new Intl.DateTimeFormat("tr-TR", {
  timeZone: TURKEY_TIME_ZONE,
  day: "numeric",
  month: "long",
  year: "numeric",
});

const chatTimeFormatter = new Intl.DateTimeFormat("tr-TR", {
  timeZone: TURKEY_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

const chatDateTimeFormatter = new Intl.DateTimeFormat("tr-TR", {
  timeZone: TURKEY_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function turkeyDateKey(value: string | Date) {
  return dateKeyFormatter.format(new Date(value));
}

export function formatChatDay(value: string, now = new Date()) {
  const date = new Date(value);
  return turkeyDateKey(date) === turkeyDateKey(now)
    ? "Bugün"
    : chatDateFormatter.format(date);
}

export function formatChatTime(value: string) {
  return chatTimeFormatter.format(new Date(value));
}

export function formatChatDateTime(value: string) {
  return chatDateTimeFormatter.format(new Date(value));
}
