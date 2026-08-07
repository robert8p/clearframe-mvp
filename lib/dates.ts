const DEFAULT_TIME_ZONE = process.env.APP_TIME_ZONE?.trim() || "Europe/London";

export function localDateKey(date = new Date(), timeZone = DEFAULT_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Could not resolve local application date");
  }

  return `${year}-${month}-${day}`;
}

export function previousLocalDateKey(
  date = new Date(),
  timeZone = DEFAULT_TIME_ZONE,
) {
  return localDateKey(new Date(date.getTime() - 24 * 60 * 60 * 1000), timeZone);
}
